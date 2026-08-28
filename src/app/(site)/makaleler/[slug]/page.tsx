import type { Metadata } from 'next'
import Link from 'next/link'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { PageHeading } from '@/components/PageHeading'
import { PageHero } from '@/components/PageHero'
import {
  getPublishedArticleBySlug,
  listArticleFeedEntries,
} from '@/db/queries/public/articles'
import { formatDate, isoDate } from '@/lib/date'
import { mediaUrl } from '@/lib/media-url'
import { renderableHtml } from '@/lib/render-html'
import { TAGS, articleTag } from '@/lib/cache-tags'
import { SITE } from '@/content/site'
import styles from './page.module.css'

type ArticlePageProps = { params: Promise<{ slug: string }> }

// YER TUTUCU SLUG — calisma-alanlari/[slug] ve kadro/[slug] ile birebir aynı gerekçe:
// cacheComponents açıkken generateStaticParams boş dizi DÖNEMEZ, "empty
// generateStaticParams" derleme hatası fırlatır. Tohumda yayımlanmış makale yok, yani
// bu dal gerçekten çalışıyor. Slug hiçbir gerçek yazıyla eşleşmez; sayfa gövdesindeki
// getPublishedArticleBySlug onu bulamayınca notFound()'a düşüyor.
const YER_TUTUCU_SLUG = '__henuz-makale-yok__'

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  // Besleme sorgusu KULLANILIYOR: sayfalı liste yalnız ilk sayfayı verirdi ve ikinci
  // sayfadaki yazılar ön üretilmezdi. Bu sorgu yayımlanmış her yazıyı döndürüyor.
  const items = await listArticleFeedEntries()
  if (items.length === 0) return [{ slug: YER_TUTUCU_SLUG }]
  return items.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  // Aynı önbellek sınırı — sayfa gövdesindeki gerekçeyle birebir.
  'use cache'
  const { slug } = await params
  cacheTag(TAGS.articles, articleTag(slug))
  cacheLife('max')

  const article = await getPublishedArticleBySlug(slug)
  if (article === null) return { title: 'Sayfa bulunamadı' }

  // Panelden girilen SEO alanları varsa onlar kazanıyor; yoksa yazının kendi başlığı ve
  // özeti kullanılıyor. Editörün yazdığı meta metnini görmezden gelmek, o alanları
  // panelde tutmayı anlamsız kılardı.
  const title = article.metaTitle ?? article.title
  const description = article.metaDescription ?? article.excerpt
  const url = `/makaleler/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    // openGraph ve twitter'ın ikisi de AYRI AYRI yazılmak zorunda: Next bu nesneleri kök
    // layout'la derin birleştirmiyor, tümüyle değiştiriyor. Yalnız biri yazıldığında
    // diğerinin başlığı kökteki büro adında kalıyor (alan detayında ölçüldü).
    openGraph: {
      siteName: SITE.name,
      locale: 'tr_TR',
      title,
      description,
      url,
      type: 'article',
      publishedTime: isoDate(article.publishedAt),
      modifiedTime: isoDate(article.updatedAt),
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  // ÖNBELLEK SINIRI + notFound() KURALI (calisma-alanlari/[slug] ile bağlayıcı): sorgu
  // 'use cache' olmadan derleme düşer. notFound() bu sınırın İÇİNDE ama herhangi bir
  // <Suspense> sınırının DIŞINDA çağrılıyor; Suspense içine taşınmış hâli üretim
  // derlemesinde 200 döndürüyordu.
  'use cache'
  const { slug } = await params
  // İki etiket: liste değişimleri (TAGS.articles) ve tek yazının kendi güncellemesi
  // (articleTag) ayrı ayrı bu sayfayı tazeleyebilsin.
  cacheTag(TAGS.articles, articleTag(slug))
  cacheLife('max')

  const article = await getPublishedArticleBySlug(slug)
  if (article === null) notFound()

  const gun = isoDate(article.publishedAt)
  const kapak = article.coverPath
  const eyebrow = article.categoryName ?? 'Makale'

  return (
    <article>
      {/* Kapağı olan yazı sinematik bandı, olmayan sade başlığı alır. Kapak panelde
          zorunlu değil; kırık bir çerçeve göstermektense bandı hiç çizmemek doğrusu.
          Her iki dalda da sayfanın tek <h1>'i çiziliyor. */}
      {kapak !== null ? (
        <PageHero src={mediaUrl(kapak)} eyebrow={eyebrow} title={article.title} boy="kisa" />
      ) : (
        <div className="pageShell">
          <PageHeading eyebrow={eyebrow} title={article.title} />
        </div>
      )}

      <div data-surface="paper" className={styles.body}>
        <div className={styles.bodyInner}>
          <div className={styles.split}>
            <div className={styles.main}>
              {/* Künye: tarih makine tarafından da okunabilir olsun diye <time>. Yazar adı
                  varsa özgeçmişine bağlanıyor — yoksa düz metin kalıyor (sütun nullable). */}
              <p className={styles.meta}>
                <time dateTime={gun}>{formatDate(gun)}</time>
                {article.authorName !== null ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    {article.authorSlug !== null ? (
                      <Link href={`/kadro/${article.authorSlug}`} className="textLink">
                        {article.authorName}
                      </Link>
                    ) : (
                      <span>{article.authorName}</span>
                    )}
                  </>
                ) : null}
              </p>

              <p className={styles.lead}>{article.excerpt}</p>

              {/* Gövde HTML'i panelden geliyor ve renderableHtml içinde temizleniyor;
                  gerekçesi lib/render-html.ts başında. */}
              <div
                className={`prose ${styles.prose}`}
                dangerouslySetInnerHTML={renderableHtml(article.content)}
              />

              {/* Hukuki uyarı. Bir hukuk bürosunun yayınında bu ibare süs değil: okuyan
                  kişi metnin genel bilgilendirme olduğunu ve kendi olayına doğrudan
                  uygulanamayacağını bilmeli. TBB reklam yasağı açısından da güvenli
                  taraf — iddia değil, sınır beyanı. */}
              <aside className={styles.disclaimer}>
                Bu yazı genel bilgilendirme amacıyla hazırlanmıştır ve hukuki tavsiye
                niteliği taşımaz. Her uyuşmazlık kendi koşulları içinde değerlendirilir.
              </aside>
            </div>

            <aside className={styles.side}>
              {article.categoryName !== null && article.categorySlug !== null ? (
                <nav className={styles.sideBlock} aria-label="Kategori">
                  <h2 className={styles.sideTitle}>Kategori</h2>
                  <Link
                    href={`/makaleler?kategori=${article.categorySlug}`}
                    className={styles.sidePill}
                  >
                    {article.categoryName}
                  </Link>
                </nav>
              ) : null}

              <div className={styles.sideBlock}>
                <h2 className={styles.sideTitle}>Tüm yazılar</h2>
                <Link href="/makaleler" className={styles.sidePill}>
                  Makale arşivi
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </article>
  )
}
