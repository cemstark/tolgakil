import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Çalışma Alanları | Akıl Hukuk Bürosu' }

export default function PracticeAreasPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="HİZMET ALANLARI" title="Çalışma Alanları" />
      <p>Çalışma alanlarının ayrıntılı açıklamaları panelden yönetilecek. Bu sayfa Plan 2/3&apos;te veriye bağlanacak.</p>
    </article>
  )
}
