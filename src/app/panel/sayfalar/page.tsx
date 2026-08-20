import type { Metadata } from 'next'
import Link from 'next/link'
import { listPages } from '@/db/queries/pages'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'

export const metadata: Metadata = {
  title: 'Sayfa metinleri',
  robots: { index: false, follow: false },
}

export default async function PagesPage() {
  await requireAccess('pages')
  const pages = await listPages()

  return (
    <>
      <PanelHeading
        title="Sayfa metinleri"
        description="Hakkımızda, KVKK aydınlatma metni ve çerez politikası. Yeni sayfa eklenemez, mevcutlar düzenlenir."
      />

      {pages.length === 0 ? (
        <PanelEmptyState>
          Sayfa kayıtları bulunamadı. Kurulum betiğini çalıştırın: npm run db:seed
        </PanelEmptyState>
      ) : (
        <PanelTable
          label="Sayfa metinleri listesi"
          caption="Sitedeki sabit sayfalar ve son güncelleme zamanları"
          columns={['Başlık', 'Adres', 'Son güncelleme', 'İşlem']}
        >
          {pages.map((page) => (
            <tr key={page.slug}>
              <th scope="row" className={table.nameCell}>
                {page.title}
              </th>
              <td>/{page.slug}</td>
              <td>{formatDateTime(page.updatedAt)}</td>
              <td>
                {/* Erişilebilir ad aria-label ile ayrıştırılıyor (kullanıcı listesindeki
                    "Düzenle" bağlantısıyla aynı bileşen, aynı sınıf): ekran okuyucu
                    kullanıcısı bağlantı listesinde üç kez aynı "Düzenle"yi duymamalı. */}
                <Link
                  href={`/panel/sayfalar/${page.slug}`}
                  prefetch={false}
                  className={table.nameLink}
                  aria-label={`Düzenle: ${page.title}`}
                >
                  Düzenle
                </Link>
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
