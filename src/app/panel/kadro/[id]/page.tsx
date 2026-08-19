import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLawyerById } from '@/db/queries/lawyers'
import { listMedia } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { formatDate } from '@/lib/date'
import { isRouteId } from '@/lib/form-id'
import { savedMessage } from '@/lib/panel-notice'
import { LawyerForm } from '@/components/LawyerForm'
import { PanelHeading } from '@/components/PanelHeading'
import { saveLawyer } from '../actions'

export const metadata: Metadata = {
  title: 'Avukatı düzenle',
  robots: { index: false, follow: false },
}

type EditLawyerPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ kaydedildi?: string }>
}

export default async function EditLawyerPage({ params, searchParams }: EditLawyerPageProps) {
  await requireAccess('lawyers')

  const { id } = await params
  // Adres kullanıcı verisi: "3e2" Number ile sessizce 300 olurdu, var olmayan bir kayda
  // referans verip 500 döndürürdü. Biçim önce denetleniyor.
  if (!isRouteId(id)) notFound()

  const lawyer = await getLawyerById(Number(id))
  if (lawyer === null) notFound()

  const [mediaOptions, query] = await Promise.all([listMedia(), searchParams])

  return (
    <>
      <PanelHeading
        title="Avukatı düzenle"
        description={
          // Sütun mode: 'string' — değer "YYYY-MM-DD" ve formatDate timeZone'u UTC'ye
          // sabitliyor, yani gösterilen gün sunucunun dilimine göre kaymıyor.
          lawyer.practiceStartDate === null
            ? 'Mesleğe başlama tarihi girilmedi.'
            : `Mesleğe başlama: ${formatDate(lawyer.practiceStartDate)}`
        }
      />

      <LawyerForm
        action={saveLawyer}
        mediaOptions={mediaOptions}
        initialMessage={savedMessage(query.kaydedildi, 'Avukat kaydedildi.')}
        values={{
          id: lawyer.id,
          fullName: lawyer.fullName,
          title: lawyer.title,
          slug: lawyer.slug,
          barAssociation: lawyer.barAssociation ?? '',
          barRegistryNo: lawyer.barRegistryNo ?? '',
          tbbRegistryNo: lawyer.tbbRegistryNo ?? '',
          practiceStartDate: lawyer.practiceStartDate ?? '',
          university: lawyer.university ?? '',
          languages: lawyer.languages ?? '',
          email: lawyer.email ?? '',
          sortOrder: String(lawyer.sortOrder),
          photoMediaId: lawyer.photoMediaId === null ? '' : String(lawyer.photoMediaId),
          bio: lawyer.bio ?? '',
          isPublished: lawyer.isPublished,
        }}
      />
    </>
  )
}
