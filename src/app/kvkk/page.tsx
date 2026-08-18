import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'KVKK Aydınlatma Metni | Akıl Hukuk Bürosu' }

// Gerçek hukuki metin Plan 3'te müşteri onayıyla gelecek; burada uydurma metin yok.
export default function KvkkPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="YASAL" title="KVKK Aydınlatma Metni" />
      <p>Bu sayfadaki metin yer tutucudur; bu metin yayına alınmadan önce güncellenecektir.</p>
    </article>
  )
}
