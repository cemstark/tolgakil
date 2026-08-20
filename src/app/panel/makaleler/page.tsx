import type { Metadata } from 'next'
import Link from 'next/link'
import { listArticles } from '@/db/queries/articles'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { panelNoticeState, type PanelNoticeQuery } from '@/lib/panel-notice'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelActionLink, PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelNotice } from '@/components/PanelNotice'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { deleteArticle } from './actions'

export const metadata: Metadata = {
  title: 'Makaleler',
  robots: { index: false, follow: false },
}

type ArticleListPageProps = { searchParams: Promise<PanelNoticeQuery> }

export default async function ArticleListPage({ searchParams }: ArticleListPageProps) {
  await requireAccess('articles')
  const [articles, query] = await Promise.all([listArticles(), searchParams])
  // Adres çubuğundan gelen değer kullanıcı tarafından yazılabilir; panelNoticeState yalnız
  // tanıdığı biçimde bildirim üretir ve gelen metni ekrana HİÇ basmaz.
  const { key, message } = panelNoticeState(query, {
    saved: 'Makale kaydedildi.',
    deleted: 'Makale silindi.',
  })

  return (
    <>
      {/* Anahtar her işlemde değişiyor: ardışık silmelerde bildirim yeniden kuruluyor,
          odaklanıyor ve canlı bölge yeniden duyuruyor (bkz. lib/panel-notice.ts). */}
      {message ? <PanelNotice key={key} message={message} /> : null}

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
