import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { SITE } from '@/content/site'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'İletişim | Akıl Hukuk Bürosu' }

// İletişim formu Plan 3'ün kapsamı; burada yalnızca başlık ve sabit iletişim bilgileri var.
export default function ContactPage() {
  return (
    <article style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <PageHeading eyebrow="Bize Ulaşın" title="İletişim" />
      <p>İletişim formu Plan 3&apos;te eklenecek. O zamana kadar aşağıdaki bilgilerden bize ulaşabilirsiniz.</p>
      <address className={styles.address}>
        {SITE.address}
        <br />
        <a href={SITE.phoneHref} className="textLink">{SITE.phone}</a>
        <br />
        <a href={SITE.emailHref} className="textLink">{SITE.email}</a>
      </address>
    </article>
  )
}
