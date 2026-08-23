import type { PublicSiteIdentity } from '@/db/queries/public/site-identity'
import { SITE } from '@/content/site'
import { mutlakAdres, SITE_URL } from '@/lib/site-url'

/**
 * schema.org yapılandırılmış verisi (JSON-LD).
 *
 * Yerel aramanın en çok işe yarayan parçası: "Samsun avukat" gibi konum içeren bir sorguda
 * arama motorunun adresi, çalışma saatlerini ve hizmet alanlarını okuduğu yer burası.
 * Sayfadaki görünür metinden çıkarım yapmasını beklemek yerine makine okunur biçimde
 * veriliyor.
 *
 * `Attorney` tipi seçildi (`LocalBusiness` → `LegalService` → `Attorney`): en dar ve en
 * doğru tip, üst tiplerin bütün alanlarını da kabul ediyor.
 *
 * ÇALIŞMA SAATLERİ BURADA AYRI TANIMLI ve bu bilinçli: `settings.workingHours` insan için
 * yazılmış serbest bir metin ("Hafta içi 08.00-18.00, Cumartesi 08.00-14.00, Pazar kapalı").
 * Ondan makine okunur bir yapı türetmek, serbest metni ayrıştırmak demek olurdu; büro
 * metni "yaz döneminde 09.00'da açılır" diye değiştirdiğinde ayrıştırıcı sessizce yanlış
 * veri üretirdi. İki gösterim ayrı tutuluyor; saatler değişirse İKİSİ de güncellenmeli.
 */
const CALISMA_SAATLERI = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '08:00',
    closes: '18:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Saturday'],
    opens: '08:00',
    closes: '14:00',
  },
  // Pazar KAPALI olarak açıkça bildiriliyor. Günü hiç yazmamak "bilinmiyor" demek;
  // arama sonucunda "açık olabilir" görünmesi, kapalı bir büroya gelen ziyaretçi demek.
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Sunday'],
    opens: '00:00',
    closes: '00:00',
  },
] as const

type Hizmet = { slug: string; name: string; summary: string }

/**
 * Ana sayfaya gömülen büro tanımı.
 *
 * İletişim bilgileri VERİTABANINDAN geliyor (panelden değiştirilebilir olmalı); adresin
 * yapılandırılmış parçaları — ilçe, il, ülke — `SITE` sabitinden, çünkü `settings.address`
 * tek bir serbest metin sütunu ve ondan ilçe/il ayrıştırmak yine kırılgan bir tahmin olurdu.
 */
export function buroYapilandirilmisVerisi(
  identity: PublicSiteIdentity,
  hizmetler: readonly Hizmet[],
): Record<string, unknown> {
  const telefonlar = [identity.phone, identity.phoneSecondary].filter((v): v is string => v !== null)

  return {
    '@context': 'https://schema.org',
    '@type': 'Attorney',
    '@id': `${SITE_URL}/#buro`,
    name: identity.officeName,
    url: SITE_URL,
    email: identity.email,
    telephone: telefonlar,
    address: {
      '@type': 'PostalAddress',
      streetAddress: identity.address,
      addressLocality: SITE.district,
      addressRegion: SITE.city,
      addressCountry: 'TR',
    },
    // Hizmet verilen coğrafi alan: sorgunun konumla eşleşmesini sağlayan alan.
    areaServed: { '@type': 'AdministrativeArea', name: SITE.city },
    openingHoursSpecification: CALISMA_SAATLERI,
    availableLanguage: { '@type': 'Language', name: 'Turkish', alternateName: 'tr' },
    // Yedi çalışma alanı hizmet kataloğu olarak: her biri kendi sayfasına bağlı, böylece
    // arama motoru hizmet ile sayfa arasındaki ilişkiyi kuruyor.
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Çalışma Alanları',
      itemListElement: hizmetler.map((hizmet) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: hizmet.name,
          description: hizmet.summary,
          url: mutlakAdres(`/calisma-alanlari/${hizmet.slug}`),
          serviceType: hizmet.name,
          areaServed: { '@type': 'AdministrativeArea', name: SITE.city },
        },
      })),
    },
  }
}

/**
 * JSON-LD'yi `<script>` içine gömerken kullanılacak güvenli dize.
 *
 * BÜTÜN `<` karakterleri kaçırılıyor, yalnız `</script` değil. Sadece kapanış etiketini
 * kaçırmak yetmiyordu: `<!--<script` dizisi HTML ayrıştırıcısını "double escaped" durumuna
 * sokuyor ve o durumda ilk `</script>` elemanı SONLANDIRMIYOR, sayfanın kalanı JSON-LD
 * gövdesine yutuluyor. Denetimde yakalandı. `\u003c` geçerli bir JSON kaçışı olduğu için
 * veri bozulmuyor; ayrıştırıcılar aynı değeri okuyor.
 */
export function jsonLdMetni(veri: Record<string, unknown>): string {
  return JSON.stringify(veri).replace(/</g, '\\u003c')
}
