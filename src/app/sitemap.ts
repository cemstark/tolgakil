import type { MetadataRoute } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { TAGS } from '@/lib/cache-tags'
import { mutlakAdres } from '@/lib/site-url'

/**
 * Site haritası.
 *
 * Sabit bir liste DEĞİL: çalışma alanları, avukatlar ve makaleler panelden eklenip
 * kaldırılabiliyor. Elle yazılmış bir harita ilk yeni makalede eskir ve arama motoruna
 * artık var olmayan adresler bildirir.
 *
 * ÖNBELLEK SINIRI sayfa rotalarıyla aynı kalıpta ve zorunlu: proje Cache Components ile
 * çalışıyor, sınırsız bir okuma derlemeyi "uncached or runtime data during prerendering"
 * hatasıyla düşürüyor (gerekçesi ve ölçümü (site)/page.tsx başında). Etiketler alt ağaçta
 * okunan HER kaynağı sayıyor — panel bir makaleyi yayımdan kaldırdığında harita da
 * tazelensin.
 *
 * `lastModified` yalnız makalelerde gerçek bir tarih taşıyor; diğer tablolarda güncelleme
 * zamanı sütunu yok. Uydurma bir tarih yazmak (ör. `new Date()`) arama motoruna her
 * taramada "her şey değişti" demek olurdu ve tarama bütçesini boşa harcardı — o yüzden
 * alan hiç yazılmıyor.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache'
  cacheTag(TAGS.practiceAreas, TAGS.lawyers)
  cacheLife('max')

  const [areas, lawyers] = await Promise.all([
    listPublicPracticeAreas(),
    listPublicLawyers(),
  ])

  // Öncelikler göreli: ana sayfa ve çalışma alanları arama sonucunda hedeflenen sayfalar,
  // yasal metinler ise yalnız dizinde bulunsun yeter.
  const sabitler: MetadataRoute.Sitemap = [
    { url: mutlakAdres('/'), changeFrequency: 'monthly', priority: 1 },
    { url: mutlakAdres('/calisma-alanlari'), changeFrequency: 'monthly', priority: 0.9 },
    { url: mutlakAdres('/hakkimizda'), changeFrequency: 'yearly', priority: 0.7 },
    { url: mutlakAdres('/kadro'), changeFrequency: 'yearly', priority: 0.7 },
    { url: mutlakAdres('/iletisim'), changeFrequency: 'yearly', priority: 0.8 },
  ]

  // BURADA OLMAYANLAR ve gerekçeleri:
  //   /makaleler/[slug] — ROTA HENÜZ YOK: src/app/(site)/makaleler altında yalnız page.tsx
  //     var ve o da yer tutucu. Makale adreslerini bildirmek, büro ilk yazısını yayımladığı
  //     anda Googlebot'a 404 verdirirdi. Ayrıntı rotası açılınca listArticleFeedEntries()
  //     ile buraya eklenecek (TAGS.articles etiketi de o zaman geri gelmeli).
  //   /makaleler — yer tutucu sayfa; içeriği yokken dizine önerilmesi anlamsız.
  //   /kvkk, /cerez-politikasi — metinleri hâlâ yer tutucu; gerçek metin girilince eklenir.

  return [
    ...sabitler,
    ...areas.map((area) => ({
      url: mutlakAdres(`/calisma-alanlari/${area.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    ...lawyers.map((lawyer) => ({
      url: mutlakAdres(`/kadro/${lawyer.slug}`),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ]
}
