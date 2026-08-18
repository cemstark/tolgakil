import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Hakkımızda | Akıl Hukuk Bürosu' }

export default function AboutPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="BÜRO" title="Hakkımızda" />
      <p>Büro tanıtım metni panelden yönetilecek. Bu sayfa Plan 2/3&apos;te veriye bağlanacak.</p>
    </article>
  )
}
