import type { Metadata } from 'next'
import Link from 'next/link'
import { listPracticeAreas } from '@/db/queries/practice-areas'
import { requireAccess } from '@/lib/auth-guards'
import { panelNoticeState, type PanelNoticeQuery } from '@/lib/panel-notice'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelActionLink, PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelNotice } from '@/components/PanelNotice'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { MoveButtons } from './MoveButtons'
import { deletePracticeArea } from './actions'

export const metadata: Metadata = {
  title: 'Çalışma Alanları',
  robots: { index: false, follow: false },
}

type PracticeAreaListPageProps = { searchParams: Promise<PanelNoticeQuery> }

export default async function PracticeAreaListPage({ searchParams }: PracticeAreaListPageProps) {
  await requireAccess('practiceAreas')
  const [areas, query] = await Promise.all([listPracticeAreas(), searchParams])
  const { key, message } = panelNoticeState(query, {
    saved: 'Çalışma alanı kaydedildi.',
    deleted: 'Çalışma alanı silindi.',
  })

  return (
    <>
      {message ? <PanelNotice key={key} message={message} /> : null}

      <PanelHeading
        title="Çalışma Alanları"
        description="Büronun hizmet verdiği hukuk alanları ve tanıtım metinleri."
        action={<PanelActionLink href="/panel/calisma-alanlari/yeni">Yeni çalışma alanı</PanelActionLink>}
      />

      {areas.length === 0 ? (
        <PanelEmptyState>
          Henüz çalışma alanı yok. “Yeni çalışma alanı” ile ilk kaydı ekleyin.
        </PanelEmptyState>
      ) : (
        <PanelTable
          label="Çalışma alanı listesi"
          caption="Sıra numarasına, eşitlikte ada göre dizili çalışma alanları"
          columns={['Alan adı', 'Sıra', 'Durum', 'İşlem']}
        >
          {areas.map((area, index) => (
            <tr key={area.id}>
              <th scope="row" className={table.nameCell}>
                <Link href={`/panel/calisma-alanlari/${area.id}`} className={table.nameLink}>
                  {area.name}
                </Link>
              </th>
              {/* Sıra sütunu artık yalnız sayıyı göstermiyor, taşıma düğmelerini de
                  taşıyor: sırayı değiştirmek için iki kaydı açıp iki sayıyı elle
                  düzenlemek gerekiyordu (devir tasarımı 4a). Düğmeler sürükle-bırak
                  YERİNE: sürükleme klavyeyle ve ekran okuyucuyla yapılamaz (WCAG 2.5.7).
                  Sayı görünür kalıyor — hangi kaydın nerede olduğunu okumanın tek yolu o. */}
              <td>
                <div className={table.rowActions}>
                  <span>{area.sortOrder}</span>
                  <MoveButtons
                    areaId={area.id}
                    name={area.name}
                    isFirst={index === 0}
                    isLast={index === areas.length - 1}
                  />
                </div>
              </td>
              <td>
                {/* Durum yalnız renkle değil metinle de ayrışıyor (WCAG 1.4.1). */}
                <span className={area.isPublished ? table.on : table.off}>
                  {area.isPublished ? 'Yayında' : 'Taslak'}
                </span>
              </td>
              <td>
                <ConfirmDeleteDialog
                  action={deletePracticeArea}
                  recordId={area.id}
                  heading="Çalışma alanını sil"
                  recordName={area.name}
                  triggerLabel={`Sil: ${area.name}`}
                />
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
