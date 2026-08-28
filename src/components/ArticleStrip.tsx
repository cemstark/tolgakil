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
        {/* İKİ SÜTUNLU DÜZEN (devir tasarımı 5b): solda bölümün kimliği, sağda içerik.
            Eskiden başlık ile "Tümünü gör" tek satırda yan yanaydı ve liste altlarında
            tam genişlik akıyordu; geniş ekranda satırlar 1200px boyunca uzayıp tarih
            sütunu başlıktan kopuyordu. Sol sütun sabit kalınca liste kendi okunur
            genişliğine oturuyor.

            `reveal`: globals.css'teki kaydırmaya bağlı giriş — gerekçesi ve geri düşüş
            davranışı PracticeAreas.tsx'te yazılı. */}
        <div className={`${styles.aside} reveal`}>
          <p className={styles.eyebrow}>Makaleler</p>
          <h2 className={styles.title}>Çalışma alanlarına ilişkin bilgilendirme yazıları</h2>
          <Link href="/makaleler" className="textLink">
            Tümünü gör
          </Link>
        </div>
        <div className={styles.main}>
          {articles.length === 0 ? (
            <p className={styles.empty}>Henüz yayımlanmış makale yok.</p>
          ) : (
            <ul className={`${styles.list} stagger`}>
              {articles.map((article) => {
                // Gün ISO gövdesinden kesiliyor; formatDate de UTC'ye sabitli, böylece
                // görünen tarih ile dateTime özniteliği asla ayrışmıyor.
                const gun = isoDate(article.publishedAt)
                return (
                  <li key={article.slug} className={styles.item}>
                    <Link href={`/makaleler/${article.slug}`} className={styles.itemLink}>
                      <span className={styles.meta}>
                        {/* Kategori zorunlu değil (ON DELETE RESTRICT olsa da sütun
                            nullable); yoksa boş bir etiket kutusu çizmek yerine hiç
                            çizilmiyor. */}
                        {article.categoryName !== null ? (
                          <span className={styles.category}>{article.categoryName}</span>
                        ) : null}
                        <time dateTime={gun} className={styles.date}>
                          {formatDate(gun)}
                        </time>
                      </span>
                      <h3 className={styles.itemTitle}>{article.title}</h3>
                      {/* Özet listeye YENİ eklendi: başlık tek başına yazının neyi
                          anlattığını çoğu zaman söylemiyordu ve okur her satırı açıp
                          geri dönmek zorunda kalıyordu. Alan zaten veride var
                          (PublicArticleCard.excerpt), yeni sorgu gerekmedi. */}
                      <span className={styles.excerpt}>{article.excerpt}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
