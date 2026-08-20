'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { getPageBySlug, updatePageContent } from '@/db/queries/pages'
import { isPageSlug } from '@/db/schema'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS, pageTag } from '@/lib/cache-tags'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'
import { pageSchema, textColumnLengthError, toFormState, type FormState } from '@/lib/validation'

const INVALID_SLUG: FormState = {
  ok: false,
  errors: {},
  message: 'Sayfa adresi okunamadı; listeye dönüp yeniden açın.',
}

// deletePage/createPage YOK ve olmayacak: tablo sabit satırlı (sözleşme §3.6). Silinen bir
// satır /kvkk adresini 404'e düşürürdü ve o adres KVKK metninin yasal yayın yeridir.
export async function savePage(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('pages')

  const rawSlug = formData.get('slug')
  if (typeof rawSlug !== 'string' || !isPageSlug(rawSlug)) return INVALID_SLUG

  const parsed = pageSchema.safeParse({ title: formData.get('title') })
  if (!parsed.success) return toFormState(parsed.error)

  // İstemci tarafı temizliği güvenlik önlemi sayılmaz; beyaz liste makaleyle aynı.
  const rawContent = formData.get('content')
  const content = typeof rawContent === 'string' ? sanitizeArticleHtml(rawContent) : ''
  // Boş <p></p> hâlâ HTML olarak dolu; "içerik girildi" sayılmaması için düz metne bakılıyor.
  const plainContent = htmlToPlainText(content)
  if (plainContent === '') {
    return { ok: false, errors: { content: ['İçerik temizlendikten sonra boş kaldı; metin ekleyin.'] } }
  }

  // Sütun TEXT = 65.535 bayt; denetim TEMİZLENMİŞ dize üzerinde (bkz. makaleler/actions.ts).
  const lengthError = textColumnLengthError(content, 'İçerik')
  if (lengthError !== null) return { ok: false, errors: { content: [lengthError] } }

  // Bu üç metin halka açık düzyazı ve doğrudan yayında: tarama makale ile aynı sözleşmede.
  const matches = findBannedPhrases([parsed.data.title, plainContent].join(' '))
  if (matches.length > 0 && formData.get('adBanAcknowledged') !== 'evet') {
    // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
    // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse kayıt tamamlanır.
    return { ok: false, errors: {}, warnings: matches.map(formatBannedMatch) }
  }

  const existing = await getPageBySlug(rawSlug)
  if (existing === null) {
    // Satır tohumdan gelir; yoksa sessizce INSERT etmiyoruz — eksik tohum bir kurulum
    // hatasıdır ve görünmesi gerekir.
    return { ok: false, errors: {}, message: 'Sayfa kaydı bulunamadı; tohum verisi (npm run db:seed) eksik.' }
  }

  await updatePageContent(rawSlug, { title: parsed.data.title, content })

  // updateTag, revalidateTag DEĞİL: gerekçesi ve ölçümü lib/cache-tags.ts başında.
  updateTag(TAGS.pages)
  updateTag(pageTag(rawSlug))
  revalidatePath('/panel/sayfalar')

  // Yönlendirme YOK: yeni kayıt oluşmuyor, kalınacak adres zaten burası. Bildirim
  // EntityForm'un ok-durumu üzerinden basılıyor (bkz. lib/panel-notice.ts gerekçesi).
  return { ok: true, errors: {}, message: 'Sayfa metni kaydedildi.' }
}
