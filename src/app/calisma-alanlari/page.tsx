import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Çalışma Alanları' }

export default function PracticeAreasPage() {
  return (
    <article className="pageShell">
      <PageHeading eyebrow="Hizmet Alanları" title="Çalışma Alanları" />
      <p>Çalışma alanlarının ayrıntılı açıklamaları panelden yönetilecek. Bu sayfa Plan 2/3&apos;te veriye bağlanacak.</p>
    </article>
  )
}
