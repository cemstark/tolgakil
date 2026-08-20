import { cacheLife, cacheTag } from 'next/cache'
import { Hero } from '@/components/Hero'
import { PracticeAreas } from '@/components/PracticeAreas'
import { ArticleStrip } from '@/components/ArticleStrip'
import { TeamStrip } from '@/components/TeamStrip'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { listLatestArticles } from '@/db/queries/public/articles'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { TAGS } from '@/lib/cache-tags'

// Şeritteki makale sayısı: ızgara masaüstünde üç sütun, tek satır dolsun.
const HOME_ARTICLE_COUNT = 3

/**
 * ÖNBELLEK SINIRI — Plan 3'ün halka açık sayfaları için kalıp.
 *
 * Sınır SAYFA katmanında, sorgu katmanında değil: `src/db/queries/public/*` modülleri
 * Vitest altında koşuyor ve `cacheTag()` istek bağlamı olmadan fırlatıyor. Sorgular saf
 * kalıyor, önbellek kararı onları çağıran rotanın.
 *
 * Sınır olmadan ÖLÇÜLDÜ: `next build` "Route '/': Next.js encountered uncached or runtime
 * data during prerendering" ile düştü. Çözüm <Suspense> DEĞİL (spec §11: telefon ve içerik
 * JavaScript'siz HTML'de bulunmalı) ve `instant = false` de değil — o, sayfayı her istekte
 * veritabanına gitmeye zorlardı.
 *
 * cacheTag: sayfanın ALT AĞACINDA okunan HER etiket burada sayılıyor — `settings` dâhil,
 * çünkü <Hero /> büro adını getPublicSiteIdentity()'den alıyor. İç önbelleğin etiketine
 * güvenilmiyor: dıştaki giriş o etiketle geçersizleşmezse ayar değişince başlık tazelenir
 * ama hero'daki ad bayat kalırdı.
 *
 * cacheLife('max') (bayat 5 dk, tazeleme 30 gün, ömür 1 yıl): süre değil OLAY tazeliyor —
 * panelin server action'ları ilgili etiket için updateTag(...) çağırıyor. O çağrının neden
 * revalidateTag olmadığı ve nasıl ölçüldüğü lib/cache-tags.ts başında yazılı.
 */
export default async function HomePage() {
  'use cache'
  cacheTag(TAGS.practiceAreas, TAGS.articles, TAGS.lawyers, TAGS.settings)
  cacheLife('max')

  // Üç sorgu paralel; sıralı await'te toplam gecikme üçünün toplamı olurdu. Hata
  // yakalanmıyor: veritabanı erişilemezse sayfa (site)/error.tsx sınırına düşsün.
  const [areas, articles, lawyers] = await Promise.all([
    listPublicPracticeAreas(),
    listLatestArticles(HOME_ARTICLE_COUNT),
    listPublicLawyers(),
  ])

  return (
    <>
      <Hero />
      <PracticeAreas areas={areas} />
      <ArticleStrip articles={articles} />
      <TeamStrip lawyers={lawyers} />
    </>
  )
}
