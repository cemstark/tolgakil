import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { Hero } from '@/components/Hero'
import { PracticeAreas } from '@/components/PracticeAreas'
import { ArticleStrip } from '@/components/ArticleStrip'
import { TeamStrip } from '@/components/TeamStrip'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { listLatestArticles } from '@/db/queries/public/articles'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import { TAGS } from '@/lib/cache-tags'
import { buroYapilandirilmisVerisi, jsonLdMetni } from '@/lib/structured-data'
import { HOME_TITLE } from '@/app/layout'

// Ana sayfanın kendi metadata'sı YOKTU; kök layout'un varsayılanına düşüyordu, yani
// başlık yalnız büro adıydı. Arama sonucunda tıklanmayı belirleyen tek satır o başlık ve
// konum bilgisi taşımıyordu. `absolute` şart: kök layout'un `%s | Akil Hukuk Bürosu`
// şablonu buraya uygulansaydı büro adı iki kez yazılırdı.
//
// BAŞLIK DEĞİŞTİ (28.08.2026) — burada `${SITE.name} | ${SITE.city} Avukat` yazıyordu,
// yani "Akil Hukuk Bürosu | Samsun Avukat". Spec §2.1 bu kalıbı ÖRNEK VEREREK yasaklıyor:
// "Şehir + hukuk dalı kombinasyonlarının yoğun kullanımı (ör. 'Samsun Avukat' kalıbı) iş
// sağlama sayılabileceği için kullanılmayacaktır." Konum başlıktan çıkarılmadı, yalnız
// yasak kalıptan çıkarılıp yönetmeliğin açıkça yayımlanabilir saydığı ADRES biçimine
// (ilçe / il) çevrildi. Sabit kök layout'tan geliyor ki sekme başlığı ile paylaşım
// kartının og:title'ı ayrışmasın.
export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  alternates: { canonical: '/' },
}

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
 * cacheLife('max'): profilin YERLEŞİK değerleri değil, next.config.ts'te EZİLMİŞ olanları
 * geçerli (bayat 5 dk, tazeleme 5 dk, ömür 1 saat). Tazelemenin birincil yolu hâlâ süre
 * değil OLAY: panelin server action'ları ilgili etiket için updateTag(...) çağırıyor. O
 * çağrının neden revalidateTag olmadığı ve nasıl ölçüldüğü lib/cache-tags.ts başında yazılı.
 * Süredeki 30 gün -> 5 dk indirimi sunucu için değil ÖNDEKİ CDN için: gerekçesi ve üretimde
 * nasıl ölçüldüğü next.config.ts'teki cacheLife bloğunda yazılı.
 */
export default async function HomePage() {
  'use cache'
  cacheTag(TAGS.practiceAreas, TAGS.articles, TAGS.lawyers, TAGS.settings)
  cacheLife('max')

  // Üç sorgu paralel; sıralı await'te toplam gecikme üçünün toplamı olurdu. Hata
  // yakalanmıyor: veritabanı erişilemezse sayfa (site)/error.tsx sınırına düşsün.
  const [areas, articles, lawyers, identity] = await Promise.all([
    listPublicPracticeAreas(),
    listLatestArticles(HOME_ARTICLE_COUNT),
    listPublicLawyers(),
    getPublicSiteIdentity(),
  ])

  return (
    <>
      {/* Yapılandırılmış veri yalnız ANA SAYFADA: aynı büro tanımını her sayfada tekrarlamak
          arama motoruna yeni bilgi vermez, yalnız her belgeyi büyütür. `@id` alanı sayesinde
          ileride başka sayfalardan bu tanıma referans verilebilir.
          dangerouslySetInnerHTML burada doğru araç: JSON-LD betik gövdesi olarak yazılmalı,
          React'in metin kaçışı geçerli JSON'ı bozardı. Gövde kullanıcı girdisi taşıyor
          (çalışma alanı adları ve özetleri), bu yüzden jsonLdMetni() </script> dizisini
          kaçırıyor — gerekçesi o fonksiyonun başında. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdMetni(buroYapilandirilmisVerisi(identity, areas)) }}
      />
      <Hero />
      <PracticeAreas areas={areas} />
      <ArticleStrip articles={articles} />
      <TeamStrip lawyers={lawyers} />
    </>
  )
}
