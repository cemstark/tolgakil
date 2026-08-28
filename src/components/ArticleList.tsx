import Image from 'next/image'
import Link from 'next/link'
import type { PublicArticleCard } from '@/db/queries/public/articles'
import { formatDate, isoDate } from '@/lib/date'
import { mediaUrl } from '@/lib/media-url'
import styles from './ArticleList.module.css'

type ArticleListProps = { articles: PublicArticleCard[] }

// Arşiv listesi. Ana sayfadaki <ArticleStrip />'ten AYRI: orada en yeni üç yazı dar bir
// sütunda özetleniyor, burada sayfalanmış tam liste var ve ilk yazı kapak görseliyle öne
// çıkıyor (devir tasarımı 6a).
//
// Başlık etiketi <h3>: liste her zaman sayfanın <h1>'i ve bölüm <h2>'lerinin altında
// çiziliyor, bu yüzden seviye sabit tutulabiliyor.
export function ArticleList({ articles }: ArticleListProps) {
  const [one, ...kalan] = articles

  return (
    <div className={styles.wrap}>
      {one !== undefined ? <FeaturedItem article={one} /> : null}
      {kalan.length > 0 ? (
        <ul className={styles.list}>
          {kalan.map((article) => (
            <li key={article.slug} className={styles.item}>
              <RowItem article={article} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

// Öne çıkan yazı: kapak görseli varsa üstte geniş bir bant olarak çiziliyor. Görseli
// olmayan yazı aynı kutuyu görselsiz alıyor — kırık bir çerçeve göstermektense bloğu
// hiç çizmemek doğrusu (site genelindeki kalıp).
function FeaturedItem({ article }: { article: PublicArticleCard }) {
  const gun = isoDate(article.publishedAt)
  const kapak = article.coverPath

  return (
    <Link href={`/makaleler/${article.slug}`} className={styles.featured}>
      {kapak !== null ? (
        <span className={`${styles.featuredMedia} mediaFrame`}>
          {/* alt metni veriden: panelde zorunlu alan. Boş dize dekoratif demek değil —
              kapak yazının kendi görseli ve alt metni panelde girilmiş olmalı. */}
          <Image
            src={mediaUrl(kapak)}
            alt={article.coverAlt ?? ''}
            fill
            sizes="(min-width: 900px) 58vw, 100vw"
          />
        </span>
      ) : null}
      <span className={styles.meta}>
        {article.categoryName !== null ? (
          <span className={styles.category}>{article.categoryName}</span>
        ) : null}
        <time dateTime={gun} className={styles.date}>
          {formatDate(gun)}
        </time>
      </span>
      <h3 className={styles.featuredTitle}>{article.title}</h3>
      <span className={styles.excerpt}>{article.excerpt}</span>
    </Link>
  )
}

function RowItem({ article }: { article: PublicArticleCard }) {
  const gun = isoDate(article.publishedAt)

  return (
    <Link href={`/makaleler/${article.slug}`} className={styles.row}>
      <span className={styles.meta}>
        {article.categoryName !== null ? (
          <span className={styles.category}>{article.categoryName}</span>
        ) : null}
        <time dateTime={gun} className={styles.date}>
          {formatDate(gun)}
        </time>
      </span>
      <h3 className={styles.rowTitle}>{article.title}</h3>
      <span className={styles.excerpt}>{article.excerpt}</span>
    </Link>
  )
}
