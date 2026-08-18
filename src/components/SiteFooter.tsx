import Link from 'next/link'
import { NAV_LINKS } from '@/lib/navigation'
import styles from './SiteFooter.module.css'

// İçerik şimdilik sabit yer tutucu; Plan 2'de `settings` tablosundan gelecek.
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brand}>Akıl Hukuk Bürosu</p>
          <address className={styles.address}>
            Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul
            <br />
            <a href="tel:+902160000000" className="textLink">+90 216 000 00 00</a>
            <br />
            <a href="mailto:info@example.com" className="textLink">info@example.com</a>
          </address>
        </div>

        <nav aria-label="Alt bilgi gezinmesi" className={styles.links}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Yasal" className={styles.links}>
          <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link href="/cerez-politikasi">Çerez Politikası</Link>
        </nav>
      </div>
    </footer>
  )
}
