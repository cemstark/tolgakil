import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = {
  title: 'Makaleler',
  // Kanonik adres: aynı içerik sorgu dizesi eklenmiş adreslerden de
  // ulaşılabildiğinde arama motoru bunu içerik kopyası sayabiliyor.
  alternates: { canonical: '/makaleler' },
}

export default function ArticlesPage() {
  return (
    <article className="pageShell">
      <PageHeading eyebrow="Yayınlar" title="Makaleler" />
      <p>Yayınlanan makalelerin listesi ve kategori filtresi Plan 3&apos;te eklenecek. Bu sayfa şimdilik yer tutucudur.</p>
    </article>
  )
}
