import type { MetadataRoute } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { listArticleFeedEntries } from '@/db/queries/public/articles'
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
  cacheTag(TAGS.practiceAreas, TAGS.articles, TAGS.lawyers)
  cacheLife('max')

  const [areas, lawyers, articles] = await Promise.all([
    listPublicPracticeAreas(),
    listPublicLawyers(),
    listArticleFeedEntries(),
  ])

  // Öncelikler göreli: ana sayfa ve çalışma alanları arama sonucunda hedeflenen sayfalar,
  // yasal metinler ise yalnız dizinde bulunsun yeter.
  const sabitler: MetadataRoute.Sitemap = [
    { url: mutlakAdres('/'), changeFrequency: 'monthly', priority: 1 },
    { url: mutlakAdres('/calisma-alanlari'), changeFrequency: 'monthly', priority: 0.9 },
    { url: mutlakAdres('/hakkimizda'), changeFrequency: 'yearly', priority: 0.7 },
    { url: mutlakAdres('/kadro'), changeFrequency: 'yearly', priority: 0.7 },
    { url: mutlakAdres('/iletisim'), changeFrequency: 'yearly', priority: 0.8 },
    { url: mutlakAdres('/makaleler'), changeFrequency: 'weekly', priority: 0.6 },
    { url: mutlakAdres('/kvkk'), changeFrequency: 'yearly', priority: 0.2 },
    { url: mutlakAdres('/cerez-politikasi'), changeFrequency: 'yearly', priority: 0.2 },
  ]

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
    ...articles.map((article) => ({
      url: mutlakAdres(`/makaleler/${article.slug}`),
      lastModified: article.publishedAt,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ]
}
