import Link from 'next/link'
import type { ArticleSummary } from '@/content/sample-content'
import { formatDate } from '@/lib/date'
import styles from './ArticleStrip.module.css'

type ArticleStripProps = { articles: ArticleSummary[] }

export function ArticleStrip({ articles }: ArticleStripProps) {
  return (
    // Dıştaki <div>, diğer bölümlerle aynı dikey ritmi (padding: var(--section) var(--pad))
    // sağlayan saydam bir kapsayıcı; üstüne ayrıca kenar boşluğu eklemez (denetim turu 1:
    // eskiden .section'da hem margin hem padding vardı, üç kat var(--section) boşluğa yol
    // açıyordu). Krem yüzey sözleşmesi — zemin, metin ve odak halkası data-surface="paper"
    // ile birlikte gelir — asıl tematik <section>'da, `id` de burada.
    <div className={styles.section}>
      <section id="articles" data-surface="paper" className={styles.inner}>
        <div className={styles.header}>
          <h2>Makaleler</h2>
          <Link href="/makaleler" className="textLink">
            Tümünü gör
          </Link>
        </div>
        <ul className={styles.list}>
          {articles.map((article) => (
            <li key={article.slug} className={styles.item}>
              <Link href={`/makaleler/${article.slug}`} className={styles.itemLink}>
                <span className={styles.category}>{article.category}</span>
                <h3 className={styles.itemTitle}>{article.title}</h3>
                <time dateTime={article.date} className={styles.date}>
                  {formatDate(article.date)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
