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
    // Sondaki eğik çizgi atılıyor: `${SITE_URL}/iletisim` gibi birleştirmeler çift eğik
    // çizgi üretmesin (bazı tarayıcılar ve tarayıcı botları bunu ayrı adres sayar).
    return new URL(aday).origin
  } catch {
    return YEREL_ADRES
  }
}

export const SITE_URL = coz()

/** Göreli bir yolu site köküne bağlar. Yol daima `/` ile başlamalı. */
export function mutlakAdres(path: string): string {
  return `${SITE_URL}${path}`
}
