import type { Metadata } from 'next'
import Link from 'next/link'
import { getArticleById, listArticles } from '@/db/queries/articles'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { panelNoticeState, type PanelNoticeQuery } from '@/lib/panel-notice'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelActionLink, PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelNotice } from '@/components/PanelNotice'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { formatDate } from '@/lib/date'
import { deleteArticle } from './actions'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Makaleler',
  robots: { index: false, follow: false },
}

// `sec` = önizleme panelinde gösterilecek kaydın kimliği. Seçim URL'de taşınıyor,
// istemci durumunda DEĞİL: sayfa sunucu bileşeni kalıyor (veri okuması ve requireAccess
// aynen sunucuda), seçim derin bağlantılanabiliyor ve geri tuşuyla geziliyor.
type ArticleListPageProps = { searchParams: Promise<PanelNoticeQuery & { sec?: string }> }

export default async function ArticleListPage({ searchParams }: ArticleListPageProps) {
  await requireAccess('articles')
  const [articles, query] = await Promise.all([listArticles(), searchParams])
  // Adres çubuğundan gelen değer kullanıcı tarafından yazılabilir; panelNoticeState yalnız
  // tanıdığı biçimde bildirim üretir ve gelen metni ekrana HİÇ basmaz.
  const { key, message } = panelNoticeState(query, {
    saved: 'Makale kaydedildi.',
    deleted: 'Makale silindi.',
  })

  // Seçili kayıt: adres çubuğundaki `sec` geçerli bir kimliği gösteriyorsa o, aksi hâlde
  // listenin ilki. Kullanıcı yazabildiği için değer sayıya çevrilip listede ARANIYOR —
  // bulunamayan bir kimlik sessizce ilk kayda düşüyor, hiçbir sorgu uydurma id ile
  // koşmuyor.
  const secilenId = Number.parseInt(query.sec ?? '', 10)
  const secili =
    articles.find((a) => a.id === secilenId) ?? articles[0] ?? null
  // Önizleme özeti liste sorgusunda yok (o sorgu TEXT sütunlarını bilerek taşımıyor);
  // yalnız SEÇİLİ kayıt için tek satırlık ikinci bir okuma yapılıyor.
  const detay = secili === null ? null : await getArticleById(secili.id)

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
        <div className={styles.split}>
        <PanelTable
          label="Makale listesi"
          caption="Güncellenme tarihine göre sıralı makaleler"
          columns={['Başlık', 'Kategori', 'Durum', 'Güncellenme', 'İşlem']}
        >
          {articles.map((article) => (
            // aria-current="true": seçili satır yalnız zeminle değil, ekran okuyucuya da
            // bildiriliyor (WCAG 1.4.1 — durum tek başına renkle taşınmıyor).
            <tr key={article.id} aria-current={secili?.id === article.id ? 'true' : undefined}>
              <th scope="row" className={table.nameCell}>
                {/* Başlık artık EDİTÖRE değil ÖNİZLEMEYE bağlanıyor (devir tasarımı 5d):
                    seçim sağdaki paneli değiştiriyor, düzenlemeye "Düzenle" ile geçiliyor.
                    scroll={false}: seçim değiştiğinde sayfa başa sıçramasın, kullanıcı
                    listede kaldığı yerde kalsın. */}
                <Link href={`?sec=${article.id}`} scroll={false} className={table.nameLink}>
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
              <td className={styles.rowActions}>
                <Link href={`/panel/makaleler/${article.id}`} className={styles.editLink}>
                  Düzenle
                  {/* Erişilebilir ad satırın hangi kaydına ait olduğunu söylemeli:
                      listede dokuz "Düzenle" bağlantısı var ve ekran okuyucu kullanıcısı
                      bağlantı listesinde hepsini aynı adla görürdü. */}
                  <span className={styles.srOnly}>: {article.title}</span>
                </Link>
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

          {/* ÖNİZLEME BÖLMESİ (5d). Seçili kaydın özeti; düzenlemeye ve yayındaysa sitedeki
              hâline buradan geçiliyor. Kapak görseli GÖSTERİLMİYOR: medya tablosuna ikinci
              bir okuma gerektirir ve bu tur sunum katmanıyla sınırlı. */}
          {detay !== null && secili !== null ? (
            <aside className={styles.preview} aria-label="Seçili makalenin önizlemesi">
              <p className={styles.previewEyebrow}>Önizleme</p>
              <h2 className={styles.previewTitle}>{detay.title}</h2>
              <p className={styles.previewMeta}>
                {secili.categoryName ?? 'Kategorisiz'}
                <span aria-hidden="true"> · </span>
                {formatDate(secili.updatedAt.toISOString().slice(0, 10))}
                <span aria-hidden="true"> · </span>
                {secili.status === 'published' ? 'Yayında' : 'Taslak'}
              </p>
              {detay.excerpt.trim() !== '' ? (
                <p className={styles.previewExcerpt}>{detay.excerpt}</p>
              ) : null}
              <div className={styles.previewActions}>
                <Link href={`/panel/makaleler/${secili.id}`} className={styles.previewPrimary}>
                  Düzenle
                </Link>
                {/* "Sitede gör" yalnız YAYIMLANMIŞ kayıtta: taslağın herkese açık adresi
                    404 veriyor (yayımlanmışlık yüklemi sorguda), yani düğme kırık bir
                    bağlantı olurdu. */}
                {secili.status === 'published' ? (
                  <a
                    href={`/makaleler/${secili.slug}`}
                    className={styles.previewSecondary}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sitede gör
                    <span className={styles.srOnly}> (yeni sekmede açılır)</span>
                  </a>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </>
  )
}
