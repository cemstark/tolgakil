'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles } from '@/db/schema'
import { getArticleById, isSlugTaken } from '@/db/queries/articles'
import { getMediaById } from '@/db/queries/media'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS, articleTag } from '@/lib/cache-tags'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'
import { articleContentLengthError, articleSchema, toFormState, type FormState } from '@/lib/validation'
import { SAVE_MESSAGES } from './save-messages'

// Gizli alandan gelen kimlik de kullanıcı verisi: boş ise yeni kayıt, doludur ama pozitif
// tam sayı değilse istek bozuk demektir. Number('3e2') sessizce 300 üretirdi.
function parseId(value: FormDataEntryValue | null): number | null | 'invalid' {
  if (typeof value !== 'string' || value.trim() === '') return null
  return /^[1-9]\d*$/.test(value.trim()) ? Number(value) : 'invalid'
}

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Makale kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

export async function saveArticle(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil: server function bulunduğu rotaya POST olarak
  // gider ve matcher değişirse koruma sessizce kalkar (global kısıt).
  await requireAccess('articles')

  const id = parseId(formData.get('id'))
  if (id === 'invalid') return INVALID_ID

  // Kapak görseli articleSchema'ya EKLENMEDİ: şema alanın FormData'da bulunmasını şart
  // koşardı ve kapak seçicisi olmayan bir çağrı (ör. eski bir sekme) anlaşılmaz bir
  // "beklenen dize" hatası alırdı. Kimlik alanıyla aynı yerel ayrıştırıcıdan geçiyor.
  const coverMediaId = parseId(formData.get('coverMediaId'))
  if (coverMediaId === 'invalid') {
    return { ok: false, errors: { coverMediaId: ['Geçersiz kapak görseli seçildi.'] } }
  }

  const parsed = articleSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    status: formData.get('status'),
    categoryId: formData.get('categoryId'),
    authorId: formData.get('authorId'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur ve kullanıcı düğmeye basıp
  // hiçbir şey olmadığını görür (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // İstemci tarafı temizliği güvenlik önlemi sayılmaz; beyaz liste burada uygulanıyor.
  const content = sanitizeArticleHtml(parsed.data.content)
  const plainContent = htmlToPlainText(content)
  // Boş <p></p> hâlâ HTML olarak doludur; "içerik girildi" sayılmaması için düz metne bakılıyor.
  if (plainContent === '') {
    return { ok: false, errors: { content: ['İçerik temizlendikten sonra boş kaldı; metin ekleyin.'] } }
  }

  // Sütun sınırı TEXT = 65.535 bayt. Denetim TEMİZLENMİŞ dize üzerinde: veritabanına
  // yazılacak olan o. Alan hatası olarak dönüyor, fırlatmıyor — fırlatsaydı kullanıcı
  // hata sayfası görür ve yazdığı metni geri alamazdı.
  const contentLengthError = articleContentLengthError(content)
  if (contentLengthError !== null) {
    return { ok: false, errors: { content: [contentLengthError] } }
  }

  // spec §11: çakışma sessizce üzerine yazılmaz, kullanıcıya açıkça bildirilir.
  if (await isSlugTaken(parsed.data.slug, id ?? undefined)) {
    return { ok: false, errors: { slug: ['Bu adres başka bir makalede kullanılıyor.'] } }
  }

  if (parsed.data.status === 'published') {
    const scanned = [parsed.data.title, parsed.data.excerpt, plainContent].join(' ')
    const matches = findBannedPhrases(scanned)
    const acknowledged = formData.get('adBanAcknowledged') === 'evet'
    if (matches.length > 0 && !acknowledged) {
      // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
      // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse yayın tamamlanır.
      return { ok: false, errors: {}, warnings: matches.map(formatBannedMatch) }
    }
  }

  // Kapak görselinin HÂLÂ var olduğu doğrulanıyor. Senaryo gerçek: editör A makaleyi açık
  // tutarken B o görseli kitaplıktan siliyor; A kaydettiğinde MariaDB
  // ER_NO_REFERENCED_ROW_2 fırlatır, hata sınırı formu değiştirir ve A'nın yazdığı metin
  // gider. categoryId/authorId'de bu açık yok — onların kısıtı RESTRICT, satır silinemiyor;
  // coverMediaId ise SET NULL, yani hedefi gerçekten kaybolabiliyor.
  //
  // Denetim ile yazma arasında hâlâ çok dar bir pencere var (aynı anda silinirse); orada
  // hata yutulmuyor, yalnız sıklığı pratikte sıfıra iniyor.
  if (coverMediaId !== null && (await getMediaById(coverMediaId)) === null) {
    return { ok: false, errors: { coverMediaId: ['Seçilen kapak görseli artık kitaplıkta yok; yeniden seçin.'] } }
  }

  const existing = id === null ? null : await getArticleById(id)
  if (id !== null && existing === null) {
    return { ok: false, errors: {}, message: 'Makale bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  // İlk yayımda atanır; taslağa geri alınırsa SİLİNMEZ, böylece yeniden yayımlamada özgün
  // tarih korunur ve makale listede geçmişini kaybetmez.
  const publishedAt =
    parsed.data.status === 'published' ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null)

  const values = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: parsed.data.excerpt,
    content,
    status: parsed.data.status,
    categoryId: parsed.data.categoryId,
    authorId: parsed.data.authorId,
    // Form kapak alanını her gönderimde taşıyor (seçim yoksa boş dize), bu yüzden
    // güncellemede de açıkça yazılıyor: "Kapak yok" seçmek gerçekten kapağı kaldırmalı.
    coverMediaId,
    publishedAt,
  }

  let savedId: number
  if (existing === null) {
    const [result] = await db.insert(articles).values(values)
    savedId = result.insertId
  } else {
    await db.update(articles).set(values).where(eq(articles.id, existing.id))
    savedId = existing.id
  }

  // İki argümanlı biçim zorunlu: tek argümanlı çağrı Next 16.3'te kaldırıldı. Bu çağrılar
  // Plan 3 okuma tarafını 'use cache' + cacheTag ile bağlayana kadar ETKİSİZ — bilinçli.
  revalidateTag(TAGS.articles, 'max')
  revalidateTag(articleTag(parsed.data.slug), 'max')
  // Adres değiştiyse eski etiket de düşmeli, yoksa eski adres bayat içerikle asılı kalır.
  if (existing !== null && existing.slug !== parsed.data.slug) {
    revalidateTag(articleTag(existing.slug), 'max')
  }
  // Yalnız LİSTE yolu tazeleniyor. /panel/makaleler/[id] için ek bir çağrı gerekmiyor:
  // ölçüldü, server action yanıtı bulunulan rotanın sunucu bileşenlerini zaten yeniden
  // çiziyor — "Önizleme" ve "İlk yayım" satırı kaydetmeden sonra reload olmadan
  // tazeleniyor ve iki e2e testi bunu reload() kullanmadan sabitliyor.
  revalidatePath('/panel/makaleler')

  // Yeni kayıtta düzenleme sayfasına geçiliyor; yönlendirme useActionState durumunu
  // sıfırladığı için bildirim adres üzerinden taşınıyor (bkz. save-messages.ts).
  if (existing === null) redirect(`/panel/makaleler/${savedId}?kaydedildi=${parsed.data.status}`)

  return { ok: true, errors: {}, message: SAVE_MESSAGES[parsed.data.status] }
}

export async function deleteArticle(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccess('articles')

  const id = parseId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getArticleById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Makale bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  await db.delete(articles).where(eq(articles.id, id))

  revalidateTag(TAGS.articles, 'max')
  revalidateTag(articleTag(existing.slug), 'max')
  revalidatePath('/panel/makaleler')

  // Başarı bildirimi kip pencerede basılamaz: silinen satır yeniden çizimle kalkıyor ve
  // pencereyi de beraberinde götürüyor, yani mesaj hiç görünmez, odak <body>'ye düşerdi.
  // Bildirim listenin kendisine taşınıyor (bkz. DeleteNotice).
  redirect('/panel/makaleler?silindi=1')
}
