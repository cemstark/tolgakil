import type { Metadata } from 'next'
import Link from 'next/link'
import { listArticles } from '@/db/queries/articles'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelActionLink, PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { deleteArticle } from './actions'
import { DeleteNotice } from './DeleteNotice'

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
        action={<PanelActionLink href="/panel/makaleler/yeni">Yeni makale</PanelActionLink>}
      />

      {articles.length === 0 ? (
        <PanelEmptyState>Henüz makale yok. “Yeni makale” ile ilk yazıyı ekleyin.</PanelEmptyState>
      ) : (
        <PanelTable
          label="Makale listesi"
          caption="Güncellenme tarihine göre sıralı makaleler"
          columns={['Başlık', 'Kategori', 'Durum', 'Güncellenme', 'İşlem']}
        >
          {articles.map((article) => (
            <tr key={article.id}>
              <th scope="row" className={table.nameCell}>
                <Link href={`/panel/makaleler/${article.id}`} className={table.nameLink}>
                  {article.title}
                </Link>
              </th>
              <td>{article.categoryName ?? '—'}</td>
              <td>
                {/* Durum yalnız renkle değil metinle de ayrışıyor (WCAG 1.4.1). */}
                <span className={article.status === 'published' ? table.on : table.off}>
                  {article.status === 'published' ? 'Yayında' : 'Taslak'}
                </span>
              </td>
              {/* Veritabanı oturumu UTC; @/lib/date biçimlendiricileri timeZone'u açıkça
                  veriyor, ham toLocaleString sunucunun dilimine bağlı çıkardı. */}
              <td>{formatDateTime(article.updatedAt)}</td>
              <td>
                <ConfirmDeleteDialog
                  action={deleteArticle}
                  recordId={article.id}
                  heading="Makaleyi sil"
                  recordName={article.title}
                  triggerLabel={`Sil: ${article.title}`}
                />
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
