import type { Metadata } from 'next'
import { listCategories } from '@/db/queries/categories'
import { requireAccess } from '@/lib/auth-guards'
import { panelNoticeState, type PanelNoticeQuery } from '@/lib/panel-notice'
import { CategoryForm } from '@/components/CategoryForm'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelNotice } from '@/components/PanelNotice'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { createCategory, deleteCategory } from './actions'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Kategoriler',
  robots: { index: false, follow: false },
}

type CategoryPageProps = { searchParams: Promise<PanelNoticeQuery> }

export default async function CategoryPage({ searchParams }: CategoryPageProps) {
  await requireAccess('categories')
  const [categories, query] = await Promise.all([listCategories(), searchParams])
  const { key, message } = panelNoticeState(query, {
    saved: 'Kategori eklendi.',
    deleted: 'Kategori silindi.',
  })

  return (
    <>
      {/* İki kardeşin anahtarı AYNI olamaz. Ölçüldü (Görev 7): ikisine de düz `key`
          verildiğinde React yinelenen kardeş anahtarıyla karşılaşıyor, reconciliation
          bozuluyor ve ikinci işlemden sonra ESKİ bildirim DOM'da kalıyor — kullanıcı aynı
          anda "Kategori eklendi." ve "Kategori silindi." görüyordu. */}
      {message ? <PanelNotice key={`bildirim-${key}`} message={message} /> : null}

      <PanelHeading title="Kategoriler" description="Makalelerin bağlandığı konu başlıkları." />

      {/* Anahtar her işlemde değişiyor: form yeniden kuruluyor ve eklenen kategorinin adı
          kutuda asılı kalmıyor (medya yükleme formuyla aynı ölçüm). */}
      <CategoryForm key={`form-${key}`} action={createCategory} />

      <section aria-labelledby="category-list-heading" className={styles.list}>
        <h2 id="category-list-heading" className={styles.listHeading}>
          Mevcut kategoriler
        </h2>

        {categories.length === 0 ? (
          <PanelEmptyState>Henüz kategori yok. Yukarıdaki formla ilk kategoriyi ekleyin.</PanelEmptyState>
        ) : (
          <PanelTable
            label="Kategori listesi"
            caption="Ada göre dizili kategoriler ve bağlı makale sayıları"
            columns={['Ad', 'Adres', 'Makale', 'İşlem']}
          >
            {categories.map((category) => (
              <tr key={category.id}>
                <th scope="row" className={table.nameCell}>
                  {category.name}
                </th>
                <td>{category.slug}</td>
                <td>{category.articleCount}</td>
                <td>
                  {/* Bağlı makalesi olan kategori veritabanı tarafından reddediliyor;
                      düğme yine de çiziliyor ki gerekçe kip pencerede açıkça okunsun. */}
                  <ConfirmDeleteDialog
                    action={deleteCategory}
                    recordId={category.id}
                    heading="Kategoriyi sil"
                    recordName={category.name}
                    triggerLabel={`Sil: ${category.name}`}
                  />
                </td>
              </tr>
            ))}
          </PanelTable>
        )}
      </section>
    </>
  )
}
