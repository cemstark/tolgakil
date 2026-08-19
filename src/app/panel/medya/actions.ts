'use server'

import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { media } from '@/db/schema'
import { deleteMediaRow, getMediaById, getMediaByPath } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS } from '@/lib/cache-tags'
import { MediaError, resolveUploadPath, storeImage, uploadDir, type StoredImage } from '@/lib/media-storage'
import { mediaSchema, toFormState, type FormState } from '@/lib/validation'

// Gizli alandan gelen kimlik de kullanıcı verisi (bkz. makaleler/actions.ts): boşsa yok,
// doluysa pozitif tam sayı olmak zorunda. Number('3e2') sessizce 300 üretirdi.
function parseId(value: FormDataEntryValue | null): number | null | 'invalid' {
  if (typeof value !== 'string' || value.trim() === '') return null
  return /^[1-9]\d*$/.test(value.trim()) ? Number(value) : 'invalid'
}

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Görsel kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

export async function uploadMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil: server function bulunduğu rotaya POST
  // olarak gider ve matcher değişirse koruma sessizce kalkar (global kısıt).
  const user = await requireAccess('media')

  // Alt metin SUNUCUDA zorunlu. İstemcideki `required` yalnız kolaylık; formu elle POST
  // eden bir istemci alt metinsiz görsel bırakabilseydi spec §8'in erişilebilirlik
  // sözleşmesi ilk gün delinirdi.
  const parsed = mediaSchema.safeParse({ altText: formData.get('altText') })
  const durum: FormState = parsed.success ? { ok: false, errors: {} } : toFormState(parsed.error)

  // İki alan birlikte denetleniyor: sırayla dönülseydi kullanıcı önce dosya hatasını
  // düzeltip gönderir, sonra alt metin hatasını görürdü — iki tur, aynı form.
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ...durum, errors: { ...durum.errors, file: ['Yüklenecek bir dosya seçin.'] } }
  }

  // Alt metin hatası dosya işlenmeden ÖNCE dönüyor: geçersiz gönderimde diske hiçbir şey
  // yazılmasın, aksi hâlde her başarısız denemede sahipsiz bir dosya birikirdi.
  if (!parsed.success) return durum

  let stored: StoredImage
  try {
    stored = await storeImage(file, uploadDir())
  } catch (cause) {
    // Yalnız kullanıcıya gösterilebilir doğrulama hatası alan hatasına çevriliyor. Disk
    // dolması gibi beklenmedik hatalar yeniden fırlatılıyor: hata sınırına düşsün, sessizce
    // "geçersiz görsel" diye görünmesin.
    //
    // MediaError LOGLANMIYOR: bu sıradan bir kullanıcı hatası (yanlış biçim, çok büyük
    // dosya) ve kanalı ekran. Sunucu günlüğüne yazılsaydı gerçek arızalar bu gürültünün
    // içinde kaybolurdu.
    if (cause instanceof MediaError) {
      return { ok: false, errors: { file: [cause.message] } }
    }
    throw cause
  }

  // Dosya adı içerik özeti: aynı görsel ikinci kez yüklenirse aynı yola düşer ve media.path
  // UNIQUE olduğu için insert kısıt hatası verirdi. Diskteki dosya birebir aynı içerik
  // olduğundan artık bırakmıyor; kullanıcıya durum söyleniyor.
  const mevcut = await getMediaByPath(stored.relative)
  if (mevcut !== null) {
    return { ok: false, errors: { file: ['Bu görsel zaten kitaplıkta; aşağıdaki listeden seçebilirsiniz.'] } }
  }

  const [inserted] = await db.insert(media).values({
    // Kullanıcının dosya adı saklanmıyor bile; ad içerikten türetilen depolama adıdır.
    filename: path.posix.basename(stored.relative),
    path: stored.relative,
    altText: parsed.data.altText,
    width: stored.width,
    height: stored.height,
    sizeBytes: stored.sizeBytes,
    uploadedBy: user.id,
  })

  revalidatePath('/panel/medya')

  // Yönlendirme bilinçli: bildirim adres üzerinden taşınıyor (bkz. notices.ts) ve yeni
  // kimlik her yüklemede değiştiği için form yeniden kuruluyor, seçili dosya orada kalmıyor.
  redirect(`/panel/medya?yuklendi=${inserted.insertId}`)
}

export async function deleteMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccess('media')

  const id = parseId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getMediaById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Görsel bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  await deleteMediaRow(id)

  // Kayıt gitti, dosya kaldıysa kullanıcı bunu bilmeli. Hata yutulmuyor: "dosya yok"
  // durumu sunucuya loglanıyor ve bildirime ayrı bir metinle taşınıyor; başka her hata
  // (izin, disk) yeniden fırlatılıyor.
  let dosyaBulunamadi = false
  try {
    await unlink(resolveUploadPath(existing.path))
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
      console.error('Medya kaydı silindi ancak dosya diskte bulunamadı:', existing.path)
      dosyaBulunamadi = true
    } else {
      throw cause
    }
  }

  // Kapak görseli olarak kullanılan satırlar FK ile NULL'a düştü; makale okumaları da
  // bayat kalmasın. İki argümanlı biçim zorunlu (Next 16.3) ve Plan 3 okuma tarafını
  // 'use cache' ile bağlayana kadar ETKİSİZ — bilinçli.
  revalidateTag(TAGS.articles, 'max')
  revalidatePath('/panel/medya')

  // Bildirim kip pencerede basılamaz: silinen kart yeniden çizimle kalkıyor ve pencereyi
  // de götürüyor, yani mesaj hiç görünmez ve odak <body>'ye düşerdi. Bildirim adres
  // üzerinden sayfanın tek canlı bölgesine taşınıyor (bkz. notices.ts).
  // Silinen kaydın kimliği: ardışık silmelerde adres her seferinde değişsin ki bildirim
  // yeniden kurulup odaklansın ve duyurulsun (bkz. notices.ts).
  redirect(`/panel/medya?silindi=${id}${dosyaBulunamadi ? '&dosya=yok' : ''}`)
}
