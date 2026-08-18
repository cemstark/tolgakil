import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'KVKK Aydınlatma Metni' }

// Gerçek hukuki metin Plan 3'te müşteri onayıyla gelecek; burada uydurma metin yok.
export default function KvkkPage() {
  return (
    <article className="pageShell">
      <PageHeading eyebrow="Yasal" title="KVKK Aydınlatma Metni" />
      <p>Bu sayfadaki metin yer tutucudur; bu metin yayına alınmadan önce güncellenecektir.</p>
    </article>
  )
}
