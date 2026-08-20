'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { getUserById, isEmailTaken, listActiveAdminIds } from '@/db/queries/users'
import { requireAccess } from '@/lib/auth-guards'
import { parseFormId } from '@/lib/form-id'
import { hashPassword } from '@/lib/password'
import { wouldRemoveLastAdmin } from '@/lib/user-guard'
import { toFormState, userCreateSchema, userUpdateSchema, type FormState } from '@/lib/validation'

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Kullanıcı kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

const LAST_ADMIN: FormState = {
  ok: false,
  errors: {},
  message: 'Son etkin yönetici rolü düşürülemez veya pasifleştirilemez.',
}

export async function saveUser(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  const current = await requireAccess('users')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid') return INVALID_ID

  return id === null ? createUser(formData) : updateUser(id, current.id, formData)
}

async function createUser(formData: FormData): Promise<FormState> {
  const parsed = userCreateSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
    role: formData.get('role'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // users.email UNIQUE; kısıt hatası kullanıcıya 500 olarak dönmesin diye önceden bakılıyor.
  // Denetimle yazma arasında dar bir yarış kalıyor ve orada hata YUTULMUYOR — kısıt hatası
  // hata sınırına düşer, sessizce ikinci bir hesap oluşmaz.
  if (await isEmailTaken(parsed.data.email)) {
    return { ok: false, errors: { email: ['Bu e-posta zaten kayıtlı.'] } }
  }

  const [result] = await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    // Paylaşılan argon2 seçenekleri (lib/password.ts); parametreler elle yazılmıyor.
    passwordHash: await hashPassword(parsed.data.password),
    isActive: true,
  })

  revalidatePath('/panel/kullanicilar')

  // Yönlendirme bilinçli ve diğer beş oluşturma akışıyla aynı: aksi hâlde form dolu
  // kalıyordu ve ikinci kez "Kaydet"e basan yönetici, kaydın gerçekten yapıldığını
  // düşünürken "Bu e-posta zaten kayıtlı." hatası alıyordu. Bildirim adres üzerinden
  // taşınıyor (bkz. lib/panel-notice.ts).
  redirect(`/panel/kullanicilar/${result.insertId}?kaydedildi=${result.insertId}`)
}

async function updateUser(id: number, currentUserId: number, formData: FormData): Promise<FormState> {
  const parsed = userUpdateSchema.safeParse({
    role: formData.get('role'),
    isActive: formData.get('isActive'),
    password: formData.get('password'),
  })
  if (!parsed.success) return toFormState(parsed.error)

  const existing = await getUserById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Kullanıcı bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  // Son etkin admin kilitlenirse panele kimse giremez ve düzeltmenin tek yolu veritabanına
  // elle müdahale olur. Karar saf bir fonksiyonda ve testli (lib/user-guard.ts).
  // listActiveAdminIds önbelleksiz okuyor: karar bu isteğin GERÇEK durumuna dayanmalı.
  if (
    wouldRemoveLastAdmin({
      activeAdminIds: await listActiveAdminIds(),
      targetId: id,
      nextRole: parsed.data.role,
      nextIsActive: parsed.data.isActive,
    })
  ) {
    return LAST_ADMIN
  }

  // Parola alanı boşsa mevcut özet korunuyor: alanı her açılışta doldurmak zorunda kalmak
  // yöneticiyi parolayı sıfırlamaya iterdi.
  const passwordHash = parsed.data.password === '' ? undefined : await hashPassword(parsed.data.password)

  await db
    .update(users)
    .set({ role: parsed.data.role, isActive: parsed.data.isActive, passwordHash })
    .where(eq(users.id, id))

  revalidatePath('/panel/kullanicilar')

  // Kendi erişimini değiştiren yöneticide YÖNLENDİRME zorunlu.
  //
  // getPanelUser cache() ile sarılı ve İSTEK BAŞINA tekilleştiriyor. Server action yanıtı
  // sunucu bileşenlerini AYNI istekte yeniden çiziyor, yani buradan sonra çizilecek layout
  // ve sayfa güncellemeden ÖNCEKİ rolü okurdu: kendini editor yapan yönetici hâlâ admin
  // gezinmesini görürdü. Yönlendirme yeni bir istek başlatıyor ve önbellek orada taze
  // dolduruluyor.
  //
  // Hedef /panel, kullanıcı listesi değil: buraya gelen kişi requireAccess'ten geçtiği için
  // etkin bir admin'di, dolayısıyla rol veya etkinlik DEĞİŞTİYSE artık admin değil ya da
  // pasif. Listeye dönmek 404, pasifleştiyse /panel de giriş sayfasına düşürüyor — ikisi de
  // doğru sonuç. Yalnız parolasını değiştiren yönetici yönlendirilmiyor; onun erişimi
  // değişmedi ve "kaydedildi" bildirimini görmesi gerekiyor.
  const erisimDegisti = existing.role !== parsed.data.role || existing.isActive !== parsed.data.isActive
  if (id === currentUserId && erisimDegisti) redirect('/panel')

  return { ok: true, errors: {}, message: 'Kullanıcı kaydedildi.' }
}
