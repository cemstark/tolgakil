import type { Metadata } from 'next'
import { requireAccess } from '@/lib/auth-guards'
import { PanelHeading } from '@/components/PanelHeading'
import { PracticeAreaForm } from '@/components/PracticeAreaForm'
import { savePracticeArea } from '../actions'

export const metadata: Metadata = {
  title: 'Yeni çalışma alanı',
  robots: { index: false, follow: false },
}

export default async function NewPracticeAreaPage() {
  await requireAccess('practiceAreas')

  return (
    <>
      <PanelHeading
        title="Yeni çalışma alanı"
        description="Özet listede, içerik alanın kendi sayfasında gösterilir."
      />
      <PracticeAreaForm action={savePracticeArea} />
    </>
  )
}
