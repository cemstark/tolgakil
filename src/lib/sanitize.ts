import sanitizeHtml from 'sanitize-html'

// Panelden gelen HTML güvenilmez veridir (spec §6). Beyaz liste bilinçli olarak dar:
// görsel, tablo ve gömülü içerik editörden değil, medya kitaplığından gelir.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Ölçüldü: varsayılan açık ve `//evil.test/x` allowedSchemes denetimini hiç görmeden
  // geçiyor — tarayıcı onu sayfanın protokolüyle tamamlıyor. XSS değil, ama "yalnız
  // http/https/mailto/tel" güvencesini deliyor ve yazar farkında olmadan dış siteye
  // bağlantı verebiliyor.
  allowProtocolRelative: false,
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

// sanitize-html metni yeniden gömülebilir HTML olarak üretir, yani kaçışları geri koyar.
// Çözülmeleri şart: bu çıktı reklam yasağı taramasına giriyor ve taramanın bildirdiği
// karakter konumu kullanıcıya gösteriliyor. Çözülmeseydi metindeki her "&" bildirilen
// konumu dört karakter kaydırır, yazar editörde yanlış yere giderdi.
//
// &amp; EN SONDA çözülüyor: önce çözülseydi kullanıcının düz metin olarak yazdığı
// "&lt;" ("&amp;lt;" biçiminde kaçmış hâli) iki adımda "<" olur, yani var olmayan bir
// etiket başlangıcı üretilirdi.
const ENTITIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&amp;/g, '&'],
]

// Arama, meta açıklama ve reklam yasağı taraması için düz metin; hiçbir etikete izin vermez.
// Çıktı düz metindir, HTML DEĞİLDİR: bir sayfaya basılacaksa React'in kendi kaçışından
// geçmek zorundadır (dangerouslySetInnerHTML ile kullanılmaz).
export function htmlToPlainText(html: string): string {
  const stripped = sanitizeHtml(html.replace(BLOCK_BOUNDARY, ' $&'), {
    allowedTags: [],
    allowedAttributes: {},
  })
  const decoded = ENTITIES.reduce((text, [pattern, char]) => text.replace(pattern, char), stripped)
  return decoded.replace(/\s+/g, ' ').trim()
}
