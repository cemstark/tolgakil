const YEREL_ADRES = 'http://localhost:3000'

/**
 * Sitenin mutlak kök adresi.
 *
 * Dört yer okuyor: kök layout'un `metadataBase`'i, `sitemap.ts`, `robots.ts` ve JSON-LD
 * üreticisi. Ortak modülde durmasının sebebi kopyalanan bir adresin sessizce ayrışması:
 * sitemap yeni alan adını, canonical eskisini gösterirse arama motoru iki farklı site görür.
 *
 * Sıralama: kendi değişkeni → AUTH_URL (dağıtımda tanımlı olan tek mutlak adres) → yerel.
 * Gerçek alan adı belli olunca NEXT_PUBLIC_SITE_URL tanımlamak yeterli, kod değişmez.
 *
 * `||` kullanılıyor, `??` DEĞİL: .env dosyasında `NEXT_PUBLIC_SITE_URL=` (değersiz) yazmak
 * boş DİZE üretir, `??` bunu geçerli sayıp geçirir ve `new URL('')` fırlatır. try/catch de
 * aynı sebeple var — şeması unutulmuş bir adres ("example.com") aynı sonucu verir.
 * Hata MODÜL DEĞERLENDİRME anında oluşacağı için hiçbir error boundary yakalayamaz; sunucu
 * Next'in __next_error__ kabuğunu döndürür ve Türkçe metinle telefon numarası kaybolur.
 * Yanlış yapılandırma, sitenin tamamını değil yalnızca mutlak adresleri bozmalı.
 */
function coz(): string {
  const aday = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || YEREL_ADRES
  try {
    // Sondaki eğik çizgi ve alt yol atılıyor: `${SITE_URL}/iletisim` gibi birleştirmeler
    // çift eğik çizgi üretmesin (bazı tarayıcı botları bunu ayrı adres sayar).
    const cozulen = new URL(aday).origin
    // Üretimde yerel adrese düşmek SESSİZ kalmamalı: o durumda sitemap'teki tüm adresler,
    // her sayfanın canonical'ı ve JSON-LD kimliği localhost gösterir; arama motoru
    // erişemediği bir kanonik adres yüzünden siteyi dizinden düşürebilir ve hiçbir yerde iz
    // kalmaz. En azından derleme/çalışma günlüğünde görünsün.
    if (cozulen === YEREL_ADRES && process.env.NODE_ENV === 'production') {
      console.error(
        '[site-url] Üretimde site adresi yerel adrese düştü. NEXT_PUBLIC_SITE_URL veya ' +
          'AUTH_URL şemasıyla tanımlanmalı (https://...). Sitemap, canonical ve JSON-LD ' +
          'adresleri yanlış üretilecek.',
      )
    }
    return cozulen
  } catch {
    console.error(`[site-url] Geçersiz site adresi: ${JSON.stringify(aday)}. Yerel adrese düşülüyor.`)
    return YEREL_ADRES
  }
}

export const SITE_URL = coz()

/** Göreli bir yolu site köküne bağlar. Yol daima `/` ile başlamalı. */
export function mutlakAdres(path: string): string {
  return `${SITE_URL}${path}`
}
