import { sanitizeArticleHtml } from '@/lib/sanitize'

// Saklanan HTML yazma anında zaten temizleniyor (panel, spec §6). Okuma anında BİR KEZ
// DAHA temizleniyor. Gerekçe maliyet/risk dengesi:
//   - Maliyet: çağıran her sayfa 'use cache' altında çiziliyor, yani temizleyici her
//     ziyarette değil, her tazelemede bir kez koşuyor.
//   - Risk: satırlar tek yoldan gelmiyor. drizzle studio, migration, tohum ve ileride
//     eklenecek her yazma yolu panelin temizleyicisini atlayabilir; atlanan tek bir yol
//     doğrudan XSS demektir.
// Güven veri KAYNAĞINA değil, BASMA anına bağlanıyor: dangerouslySetInnerHTML'e giden
// tek kapı bu fonksiyondur, doğrudan nesne yazılmaz.
export function renderableHtml(stored: string): { __html: string } {
  return { __html: sanitizeArticleHtml(stored) }
}
