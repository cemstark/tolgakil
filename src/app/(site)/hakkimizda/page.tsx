import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Hakkımızda' }

export default function AboutPage() {
  return (
    <article className="pageShell">
      <PageHeading eyebrow="Büro" title="Hakkımızda" />
      <p>Büro tanıtım metni panelden yönetilecek. Bu sayfa Plan 2/3&apos;te veriye bağlanacak.</p>
    </article>
  )
}
