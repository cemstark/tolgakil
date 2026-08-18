import Link from 'next/link'
import type { ArticleSummary } from '@/content/sample-content'
import styles from './ArticleStrip.module.css'

type ArticleStripProps = { articles: ArticleSummary[] }

// tr-TR sunucuda biçimlendirilir; ISO tarih istemciye ham taşınmaz.
function formatDate(date: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function ArticleStrip({ articles }: ArticleStripProps) {
  return (
    // Krem yüzey sözleşmesi: zemin, metin ve odak halkası data-surface="paper" ile birlikte gelir.
    <section id="articles" data-surface="paper" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2>Makaleler</h2>
          {/* font-size 24px: WCAG büyük-metin eşiği. .textLink'in --gold-ink rengi
              17px gövde metninde --paper üzerinde 4.5:1'i geçmiyor (axe: 4.25:1);
              token değeri sabit kaldığı için karşılığı büyük-metin muafiyetiyle (3:1) alıyoruz. */}
          <Link href="/makaleler" className={`textLink ${styles.viewAll}`}>
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
      </div>
    </section>
  )
}
