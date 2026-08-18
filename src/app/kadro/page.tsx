import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Kadro | Akıl Hukuk Bürosu' }

export default function TeamPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="Avukatlar" title="Kadro" />
      <p>Kadro üyelerinin ayrıntılı profilleri panelden yönetilecek. Bu sayfa Plan 2/3&apos;te veriye bağlanacak.</p>
    </article>
  )
}
