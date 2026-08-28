'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { practiceAreas } from '@/db/schema'
import {
  deletePracticeArea as deletePracticeAreaRow, getPracticeAreaById, isSlugTaken,
} from '@/db/queries/practice-areas'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS } from '@/lib/cache-tags'
import { parseFormId } from '@/lib/form-id'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'
import { practiceAreaSchema, textColumnLengthError, toFormState, type FormState } from '@/lib/validation'

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Çalışma alanı kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

export async function savePracticeArea(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('practiceAreas')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid') return INVALID_ID

  const parsed = practiceAreaSchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    summary: formData.get('summary'),
    sortOrder: formData.get('sortOrder'),
    isPublished: formData.get('isPublished'),
  })
  if (!parsed.success) return toFormState(parsed.error)

  // İstemci tarafı temizliği güvenlik önlemi sayılmaz; beyaz liste makale ile aynı.
  const rawContent = formData.get('content')
  const content = typeof rawContent === 'string' ? sanitizeArticleHtml(rawContent) : ''
  // Boş <p></p> hâlâ HTML olarak dolu; sütuna boş kabuk yazmamak için düz metne bakılıyor.
  // Düz metin ayrıca reklam yasağı taramasına giriyor, bu yüzden bir kez üretiliyor.
  const plainContent = htmlToPlainText(content)
  const storedContent = plainContent === '' ? null : content

  if (storedContent !== null) {
    // Sütun TEXT = 65.535 bayt; denetim TEMİZLENMİŞ dize üzerinde (bkz. makaleler/actions.ts).
    const contentLengthError = textColumnLengthError(storedContent, 'İçerik')
    if (contentLengthError !== null) return { ok: false, errors: { content: [contentLengthError] } }
  }

  // spec §11: çakışma sessizce üzerine yazılmaz.
  if (await isSlugTaken(parsed.data.slug, id ?? undefined)) {
    return { ok: false, errors: { slug: ['Bu adres başka bir çalışma alanında kullanılıyor.'] } }
  }

  if (parsed.data.isPublished) {
    // Tarama makale ve özgeçmişte vardı, burada YOKTU (Görev 8'e devreden borç). Oysa
    // "boşanma davalarında en yüksek başarı oranı" cümlesinin gireceği en olası kutu tam
    // olarak çalışma alanı tanıtımı: özet listede kart altına, içerik alan sayfasına basılıyor.
    const scanned = [parsed.data.name, parsed.data.summary, plainContent].join(' ')
    const matches = findBannedPhrases(scanned)
    const acknowledged = formData.get('adBanAcknowledged') === 'evet'
    if (matches.length > 0 && !acknowledged) {
      // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
      // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse kayıt tamamlanır.
      return { ok: false, errors: {}, warnings: matches.map(formatBannedMatch) }
    }
  }

  const existing = id === null ? null : await getPracticeAreaById(id)
  if (id !== null && existing === null) {
    return { ok: false, errors: {}, message: 'Kayıt bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  const values = {
    slug: parsed.data.slug,
    name: parsed.data.name,
    summary: parsed.data.summary,
    sortOrder: parsed.data.sortOrder,
    isPublished: parsed.data.isPublished,
    content: storedContent,
  }

  let savedId: number
  if (existing === null) {
    const [result] = await db.insert(practiceAreas).values(values)
    savedId = result.insertId
  } else {
    await db.update(practiceAreas).set(values).where(eq(practiceAreas.id, existing.id))
    savedId = existing.id
  }

  // updateTag, revalidateTag DEĞİL: gerekçesi ve ölçümü lib/cache-tags.ts başında.
  // Okuma tarafı Görev 4'te bağlandı, yani bu çağrı artık gerçekten bir şey yapıyor.
  updateTag(TAGS.practiceAreas)
  revalidatePath('/panel/calisma-alanlari')

  // Bildirim adres üzerinden taşınıyor: yönlendirme useActionState durumunu sıfırlıyor.
  if (existing === null) redirect(`/panel/calisma-alanlari/${savedId}?kaydedildi=${savedId}`)

  return { ok: true, errors: {}, message: 'Çalışma alanı kaydedildi.' }
}

export async function deletePracticeArea(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccess('practiceAreas')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getPracticeAreaById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Kayıt bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  // practice_areas'a işaret eden yabancı anahtar yok (schema.ts); kısıt yakalaması gereksiz.
  await deletePracticeAreaRow(id)

  updateTag(TAGS.practiceAreas)
  revalidatePath('/panel/calisma-alanlari')

  // Silinen kaydın kimliği adreste taşınıyor ki ardışık silmelerde bildirim yeniden
  // kurulup duyurulsun (bkz. lib/panel-notice.ts).
  redirect(`/panel/calisma-alanlari?silindi=${id}`)
}

/**
 * Bir çalışma alanını listede bir sıra yukarı veya aşağı taşır.
 *
 * **Neden yeni bir eylem gerekti:** `sortOrder` panelde elle girilen bir sayıydı; sırayı
 * değiştirmek için iki kaydı açıp iki sayıyı elle düzenlemek gerekiyordu. Devir tasarımı
 * (4a) sıralamayı doğrudan liste üzerinde istiyor ve bu, sütunu toplu güncelleyen bir
 * sunucu eylemi olmadan yapılamıyor.
 *
 * **Neden sürükle-bırak DEĞİL, iki düğme:** sürükleme tek başına klavyeyle ve ekran
 * okuyucuyla yapılamaz; WCAG 2.5.7 (Dragging Movements) sürükleme ile yapılan her işlem
 * için tek işaretçili bir alternatif istiyor. "Yukarı/Aşağı" düğmeleri fare, dokunmatik
 * VE klavyede aynı şekilde çalışıyor, yani alternatif değil doğrudan çözüm.
 *
 * **Neden tüm liste yeniden numaralanıyor:** `sortOrder` eşit olabiliyor (liste eşitlikte
 * ada göre diziliyor). Yalnız iki satırın değerini takas etmek, eşit değerli üçüncü bir
 * kaydın araya girmesiyle sessizce yanlış sonuç verirdi. Sıra 0..n olarak baştan yazılınca
 * sonuç her durumda listede görünenle birebir aynı oluyor.
 */
export async function movePracticeArea(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('practiceAreas')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const direction = formData.get('direction')
  if (direction !== 'up' && direction !== 'down') {
    return { ok: false, errors: {}, message: 'Taşıma yönü okunamadı; sayfayı yenileyip tekrar deneyin.' }
  }

  // Ekranda görünen sırayla BİREBİR aynı sorgu: sortOrder, eşitlikte ad.
  const rows = await db
    .select({ id: practiceAreas.id })
    .from(practiceAreas)
    .orderBy(asc(practiceAreas.sortOrder), asc(practiceAreas.name))

  const index = rows.findIndex((r) => r.id === id)
  if (index === -1) {
    return { ok: false, errors: {}, message: 'Çalışma alanı bulunamadı; sayfayı yenileyin.' }
  }

  const hedef = direction === 'up' ? index - 1 : index + 1
  // Uçtaki kaydı dışarı taşımak sessizce hiçbir şey yapmasın: düğme zaten çizilmiyor,
  // buraya ancak eşzamanlı bir değişiklikten sonra gelinir.
  if (hedef < 0 || hedef >= rows.length) {
    return { ok: true, errors: {}, message: 'Kayıt zaten listenin ucunda.' }
  }

  const sirali = [...rows]
  const [tasinan] = sirali.splice(index, 1)
  sirali.splice(hedef, 0, tasinan)

  // Tek tek UPDATE: kayıt sayısı yedi-on bandında ve toplu bir CASE ifadesi bu ölçekte
  // okunabilirlikten başka bir şey kazandırmıyor.
  for (const [yeniSira, row] of sirali.entries()) {
    await db.update(practiceAreas).set({ sortOrder: yeniSira }).where(eq(practiceAreas.id, row.id))
  }

  // updateTag, revalidateTag DEĞİL: gerekçesi ve ölçümü lib/cache-tags.ts başında.
  updateTag(TAGS.practiceAreas)
  revalidatePath('/panel/calisma-alanlari')
  return { ok: true, errors: {}, message: 'Sıra güncellendi.' }
}
