import Link from 'next/link'
import type { PublicArticleCard } from '@/db/queries/public/articles'
import { formatDate, isoDate } from '@/lib/date'
import styles from './ArticleStrip.module.css'

type ArticleStripProps = { articles: PublicArticleCard[] }

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
        {articles.length === 0 ? (
          <p className={styles.empty}>Henüz yayımlanmış makale yok.</p>
        ) : (
          <ul className={styles.list}>
            {articles.map((article) => {
              // Gün ISO gövdesinden kesiliyor; formatDate de UTC'ye sabitli, böylece
              // görünen tarih ile dateTime özniteliği asla ayrışmıyor.
              const gun = isoDate(article.publishedAt)
              return (
                <li key={article.slug} className={styles.item}>
                  <Link href={`/makaleler/${article.slug}`} className={styles.itemLink}>
                    {/* Kategori zorunlu değil (ON DELETE RESTRICT olsa da sütun nullable);
                        yoksa boş bir etiket kutusu çizmek yerine hiç çizilmiyor. */}
                    {article.categoryName !== null ? (
                      <span className={styles.category}>{article.categoryName}</span>
                    ) : null}
                    <h3 className={styles.itemTitle}>{article.title}</h3>
                    <time dateTime={gun} className={styles.date}>
                      {formatDate(gun)}
                    </time>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
