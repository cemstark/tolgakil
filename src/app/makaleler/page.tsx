import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Makaleler | Akıl Hukuk Bürosu' }

export default function ArticlesPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="YAYINLAR" title="Makaleler" />
      <p>Yayınlanan makalelerin listesi ve kategori filtresi Plan 3&apos;te eklenecek. Bu sayfa şimdilik yer tutucudur.</p>
    </article>
  )
}
