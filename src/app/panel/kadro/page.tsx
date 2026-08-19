import type { Metadata } from 'next'
import Link from 'next/link'
import { listLawyers } from '@/db/queries/lawyers'
import { requireAccess } from '@/lib/auth-guards'
import { panelNoticeState, type PanelNoticeQuery } from '@/lib/panel-notice'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelActionLink, PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelNotice } from '@/components/PanelNotice'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { deleteLawyer } from './actions'

export const metadata: Metadata = {
  title: 'Kadro',
  robots: { index: false, follow: false },
}

type LawyerListPageProps = { searchParams: Promise<PanelNoticeQuery> }

export default async function LawyerListPage({ searchParams }: LawyerListPageProps) {
  await requireAccess('lawyers')
  const [lawyers, query] = await Promise.all([listLawyers(), searchParams])
  const { key, message } = panelNoticeState(query, {
    saved: 'Avukat kaydedildi.',
    deleted: 'Kadro kaydı silindi.',
  })

  return (
    <>
      {message ? <PanelNotice key={key} message={message} /> : null}

      <PanelHeading
        title="Kadro"
        description="Sitede tanıtılan avukatlar ve mevzuatın istediği sicil bilgileri."
        action={<PanelActionLink href="/panel/kadro/yeni">Yeni avukat</PanelActionLink>}
      />

      {lawyers.length === 0 ? (
        <PanelEmptyState>Henüz kadro kaydı yok. “Yeni avukat” ile ilk kaydı ekleyin.</PanelEmptyState>
      ) : (
        <PanelTable
          label="Kadro listesi"
          caption="Sıra numarasına, eşitlikte ada göre dizili kadro kayıtları"
          columns={['Ad soyad', 'Unvan', 'Sıra', 'Durum', 'İşlem']}
        >
          {lawyers.map((lawyer) => (
            <tr key={lawyer.id}>
              <th scope="row" className={table.nameCell}>
                <Link href={`/panel/kadro/${lawyer.id}`} className={table.nameLink}>
                  {lawyer.fullName}
                </Link>
              </th>
              <td>{lawyer.title}</td>
              <td>{lawyer.sortOrder}</td>
              <td>
                {/* Durum yalnız renkle değil metinle de ayrışıyor (WCAG 1.4.1). */}
                <span className={lawyer.isPublished ? table.on : table.off}>
                  {lawyer.isPublished ? 'Yayında' : 'Taslak'}
                </span>
              </td>
              <td>
                <ConfirmDeleteDialog
                  action={deleteLawyer}
                  recordId={lawyer.id}
                  heading="Kadro kaydını sil"
                  recordName={lawyer.fullName}
                  triggerLabel={`Sil: ${lawyer.fullName}`}
                />
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
