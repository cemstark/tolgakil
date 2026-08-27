/**
 * Çalışma alanı sayfalarının ve anasayfanın stok görselleri.
 *
 * **Neden veritabanında değil:** `practice_areas` tablosunda görsel sütunu yok ve bu iş için
 * eklenmedi. Sütun eklemek migration + panel formu + tohum güncellemesi demekti; bu dokuz
 * görsel ise yılda bir değişecek sabit varlıklar. Statik eşleme aynı sonucu sıfır şema
 * riskiyle veriyor. Panelden yönetilmesi istendiği gün doğru hamle `cover_media_id` sütunu
 * eklemek ve bu modülü yalnızca YEDEK değer olarak bırakmaktır.
 *
 * **Neden ayrı modül:** hiçbir şey import etmiyor (`seed-content.ts` ile aynı gerekçe), böylece
 * hem sunucu bileşenlerinden hem de `'use cache'` sınırının içinden okunabiliyor — veriye
 * dokunmadığı için önbellek sözleşmesini bozmuyor.
 *
 * Anahtarlar `practice_areas.slug` sütunuyla birebir; doğrulaması
 * `practice-area-images.test.ts` içinde. Dosyaların kaynağı ve lisansı:
 * `docs/gorseller/kaynak-lisans.md`.
 */

export type StokGorsel = {
  src: string
  width: number
  height: number
}

/**
 * Çalışma alanı görselleri. Hepsi 16/10 üretiliyor: kart bu oranı doğrudan kullanıyor,
 * ayrıntı sayfasının geniş bandı ise AYNI dosyayı `object-fit: cover` ile kırpıyor
 * (masaüstünde 3/1, dar ekranda 16/10 — gerekçesi o sayfanın CSS'inde).
 * Tek dosya iki yerde — ikinci bir varyant üretmek indirilen bayt sayısını iki katına
 * çıkarırdı ve kırpma farkı bu görsellerde gözle ayırt edilmiyor.
 */
export const PRACTICE_AREA_IMAGES: Readonly<Record<string, StokGorsel>> = {
  'gayrimenkul-hukuku': { src: '/gorsel/gayrimenkul.webp', width: 1600, height: 1000 },
  'icra-ve-iflas-hukuku': { src: '/gorsel/icra-iflas.webp', width: 1600, height: 1000 },
  'is-hukuku': { src: '/gorsel/is.webp', width: 1600, height: 1000 },
  'tazminat-hukuku': { src: '/gorsel/tazminat.webp', width: 1600, height: 1000 },
  'sigorta-hukuku': { src: '/gorsel/sigorta.webp', width: 1600, height: 1000 },
  'kira-hukuku': { src: '/gorsel/kira.webp', width: 1600, height: 1000 },
  'miras-hukuku': { src: '/gorsel/miras.webp', width: 1600, height: 1000 },
}

/**
 * Anasayfa hero görseli. 4/5 DİKEY: hero düzeni ≥768px'te metnin yanında dikey bir sütun
 * açıyor. Mobilde aynı dosya 16/10 çerçeveye `cover` ile oturuyor.
 */
export const HERO_IMAGE: StokGorsel = { src: '/gorsel/hero-themis.webp', width: 1280, height: 1600 }

/**
 * Hakkımızda sayfasının geniş bandı. Dosya 16/7 üretiliyor; ekranda masaüstünde 3/1,
 * dar ekranda 16/10 çerçeveye `cover` ile oturuyor (StaticPage.module.css).
 */
export const ABOUT_IMAGE: StokGorsel = { src: '/gorsel/buro-kitaplik.webp', width: 1600, height: 700 }

/**
 * Slug'ı olmayan (panelden sonradan eklenmiş) bir alan için `undefined` döner; çağıran o
 * durumda görsel bloğunu HİÇ çizmemeli. Kırık görsel yerine görselsiz kart daha iyidir.
 */
export function practiceAreaImage(slug: string): StokGorsel | undefined {
  return PRACTICE_AREA_IMAGES[slug]
}
