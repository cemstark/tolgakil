import type { MetadataRoute } from 'next'
import { mutlakAdres } from '@/lib/site-url'

/**
 * Tarayıcı botu kuralları.
 *
 * Site DİZİNE GİRMELİ: meslek etiği reklamı sınırlar, aramada bulunmayı değil. Bu yüzden
 * genel izin açık.
 *
 * Kapalı olanlar:
 *   /panel  — yönetim arayüzü. Zaten kimlik doğrulaması istiyor ve sayfaları
 *             `robots: { index: false }` taşıyor, ama giriş ekranının kendisi herkese açık
 *             ve dizine girmesinin faydası yok. Tek girdi yeterli: robots.txt ÖNEK
 *             eşleşmesi yapar, '/panel' zaten '/panel/...' adreslerini de kapsar.
 *   /api    — kimlik doğrulama uçları; içerik değil.
 *
 * /medya/ BİLEREK AÇIK. İlk sürümde kapalıydı ve bu bir hataydı: yüklenen HER görsel
 * (makale kapakları, avukat portresi) bu rotadan sunuluyor (lib/media-url.ts) ve tarayıcı
 * bir görseli sayfadan değil KENDİ adresinden çeker. Engel, sitedeki bütün görsellerin
 * taranmasını kapatıyor ve Google Görseller'de hiçbirinin çıkmamasına yol açıyordu.
 *
 * `host` direktifi YAZILMIYOR: Google onu tümüyle yok sayıyor, Yandex 2018'de kullanımdan
 * kaldırdı. Kanonik adres zaten her sayfanın `alternates.canonical` alanıyla bildiriliyor.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/panel', '/api/'],
    },
    sitemap: mutlakAdres('/sitemap.xml'),
  }
}
