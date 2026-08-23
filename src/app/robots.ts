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
 *             ve dizine girmesinin hiçbir faydası yok.
 *   /medya  — yüklenen dosyaları sunan rota. Görsellerin kendisi sayfalar üzerinden zaten
 *             taranıyor; ham rotanın ayrıca dizine girmesi, bağlamsız dosya adreslerinin
 *             arama sonucunda görünmesi demek.
 *   /api    — kimlik doğrulama uçları; içerik değil.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/panel', '/panel/', '/medya/', '/api/'],
    },
    sitemap: mutlakAdres('/sitemap.xml'),
    // Alan adının kanonik biçimi: aynı içerik www'li ve www'siz iki adresten sunulursa
    // arama motoru bunu içerik kopyası sayabilir.
    host: mutlakAdres(''),
  }
}
