import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPracticeAreaById } from '@/db/queries/practice-areas'
import { requireAccess } from '@/lib/auth-guards'
import { isRouteId } from '@/lib/form-id'
import { savedMessage } from '@/lib/panel-notice'
import { PanelHeading } from '@/components/PanelHeading'
import { PracticeAreaForm } from '@/components/PracticeAreaForm'
import { savePracticeArea } from '../actions'

export const metadata: Metadata = {
  title: 'Çalışma alanını düzenle',
  robots: { index: false, follow: false },
}

type EditPracticeAreaPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ kaydedildi?: string }>
}

export default async function EditPracticeAreaPage({ params, searchParams }: EditPracticeAreaPageProps) {
  await requireAccess('practiceAreas')

  const { id } = await params
  // Adres kullanıcı verisi; biçim önce denetleniyor (bkz. makaleler/[id]/page.tsx).
  if (!isRouteId(id)) notFound()

  const area = await getPracticeAreaById(Number(id))
  if (area === null) notFound()

  const query = await searchParams

  return (
    <>
      <PanelHeading title="Çalışma alanını düzenle" description={`Adres: /calisma-alanlari/${area.slug}`} />

      <PracticeAreaForm
        action={savePracticeArea}
        initialMessage={savedMessage(query.kaydedildi, 'Çalışma alanı kaydedildi.')}
        values={{
          id: area.id,
          name: area.name,
          slug: area.slug,
          summary: area.summary,
          content: area.content ?? '',
          sortOrder: String(area.sortOrder),
          isPublished: area.isPublished,
        }}
      />
    </>
  )
}
