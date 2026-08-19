import sanitizeHtml from 'sanitize-html'

// Panelden gelen HTML güvenilmez veridir (spec §6). Beyaz liste bilinçli olarak dar:
// görsel, tablo ve gömülü içerik editörden değil, medya kitaplığından gelir.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Dış bağlantı yeni sekmede açılırsa açan pencereye erişim bırakmasın.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, OPTIONS)
}

// Etiketler kaldırılırken metinler yan yana yapışıyor: "<h2>Başlık</h2><p>Gövde</p>" düz
// çeviriyle "BaşlıkGövde" oluyor (ölçüldü). Var olmayan bu kelime hem meta açıklamayı hem
// reklam yasağı taramasının bildirdiği karakter konumunu bozar. Ayırıcı yalnız BLOK
// sınırlarına konuyor; her metin düğümüne konsaydı "<strong>Ka</strong>lın" ikiye bölünürdü.
const BLOCK_BOUNDARY = /<\/(?:p|h[1-6]|li|ul|ol|blockquote|pre|div)>|<br\s*\/?>|<hr\s*\/?>/gi

// Arama, meta açıklama ve reklam yasağı taraması için düz metin; hiçbir etikete izin vermez.
// Çıktı HTML kaçışlı kalır ("A & B" → "A &amp; B"): sanitize-html metni yeniden gömülebilir
// biçimde üretir. Tüketen taraf ham metin istiyorsa çözmek zorundadır.
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html.replace(BLOCK_BOUNDARY, ' $&'), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}
