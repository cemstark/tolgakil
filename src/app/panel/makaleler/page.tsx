import type { Metadata } from 'next'
import Link from 'next/link'
import { listArticles } from '@/db/queries/articles'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelHeading } from '@/components/PanelHeading'
import { DeleteNotice } from './DeleteNotice'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Makaleler',
  robots: { index: false, follow: false },
}

type ArticleListPageProps = { searchParams: Promise<{ silindi?: string }> }

export default async function ArticleListPage({ searchParams }: ArticleListPageProps) {
  await requireAccess('articles')
  const [articles, query] = await Promise.all([listArticles(), searchParams])

  return (
    <>
      {/* Adres çubuğundan gelen değer kullanıcı tarafından yazılabilir; yalnız tam
          eşleşmede bildirim çiziliyor, gelen metin ekrana basılmıyor. */}
      {query.silindi === '1' ? <DeleteNotice /> : null}

      <PanelHeading
        title="Makaleler"
        description="Taslaklar ve yayımlanmış yazılar."
        action={
          <Link href="/panel/makaleler/yeni" className={styles.newLink}>
            Yeni makale
          </Link>
        }
      />

      {articles.length === 0 ? (
        <p className={`card ${styles.empty}`}>Henüz makale yok. “Yeni makale” ile ilk yazıyı ekleyin.</p>
      ) : (
        // Geniş tabloyu dar ekranda yatay kaydırılabilir tutan sarmalayıcı; tabindex ile
        // klavye kullanıcısı da kaydırabiliyor (WCAG 2.1.1).
        <div className={styles.tableWrap} tabIndex={0} role="group" aria-label="Makale listesi">
          <table className={styles.table}>
            <caption className={styles.caption}>Güncellenme tarihine göre sıralı makaleler</caption>
            <thead>
              <tr>
                <th scope="col">Başlık</th>
                <th scope="col">Kategori</th>
                <th scope="col">Durum</th>
                <th scope="col">Güncellenme</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <th scope="row" className={styles.titleCell}>
                    <Link href={`/panel/makaleler/${article.id}`} className={styles.titleLink}>
                      {article.title}
                    </Link>
                  </th>
                  <td>{article.categoryName ?? '—'}</td>
                  <td>
                    {/* Durum yalnız renkle değil metinle de ayrışıyor (WCAG 1.4.1). */}
                    <span className={article.status === 'published' ? styles.published : styles.draft}>
                      {article.status === 'published' ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  {/* Veritabanı oturumu UTC; @/lib/date biçimlendiricileri timeZone'u açıkça
                      veriyor, ham toLocaleString sunucunun dilimine bağlı çıkardı. */}
                  <td>{formatDateTime(article.updatedAt)}</td>
                  <td>
                    <ConfirmDeleteDialog articleId={article.id} title={article.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
