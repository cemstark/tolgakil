import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'Çerez Politikası | Akıl Hukuk Bürosu' }

// Gerçek hukuki metin Plan 3'te müşteri onayıyla gelecek; burada uydurma metin yok.
export default function CookiePolicyPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="Yasal" title="Çerez Politikası" />
      <p>Bu sayfadaki metin yer tutucudur; bu metin yayına alınmadan önce güncellenecektir.</p>
    </article>
  )
}
