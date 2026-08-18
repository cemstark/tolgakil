import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'

export const metadata: Metadata = { title: 'İletişim | Akıl Hukuk Bürosu' }

// İletişim formu Plan 3'ün kapsamı; burada yalnızca başlık ve sabit iletişim bilgileri var.
export default function ContactPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="BİZE ULAŞIN" title="İletişim" />
      <p>İletişim formu Plan 3&apos;te eklenecek. O zamana kadar aşağıdaki bilgilerden bize ulaşabilirsiniz.</p>
      <address style={{ fontStyle: 'normal', marginTop: '24px', lineHeight: 1.8 }}>
        Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul
        <br />
        <a href="tel:+902160000000" className="textLink">+90 216 000 00 00</a>
        <br />
        <a href="mailto:info@example.com" className="textLink">info@example.com</a>
      </address>
    </article>
  )
}
