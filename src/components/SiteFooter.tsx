import Link from 'next/link'
import { NAV_LINKS } from '@/lib/navigation'
import type { PublicSiteIdentity } from '@/db/queries/public/site-identity'
import styles from './SiteFooter.module.css'

type SiteFooterProps = { identity: PublicSiteIdentity }

export function SiteFooter({ identity }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brand}>{identity.officeName}</p>
          <address className={styles.address}>
            {identity.address}
            <br />
            <a href={identity.phoneHref} className="textLink">{identity.phone}</a>
            {/* İkinci numara, WhatsApp ve çalışma saatleri ayarlarda boş bırakılabilir;
                boşken hiç çizilmiyorlar ki alt bilgide anlamsız bir boşluk kalmasın. */}
            {identity.phoneSecondary !== null && identity.phoneSecondaryHref !== null ? (
              <>
                <br />
                <a href={identity.phoneSecondaryHref} className="textLink">{identity.phoneSecondary}</a>
              </>
            ) : null}
            <br />
            <a href={identity.emailHref} className="textLink">{identity.email}</a>
            {identity.whatsappHref !== null ? (
              <>
                <br />
                {/* rel="noopener": target="_blank" ile açılan sayfa window.opener üzerinden
                    bu sekmeyi yönlendirebilir. */}
                <a
                  href={identity.whatsappHref}
                  className="textLink"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </>
            ) : null}
          </address>

          {identity.workingHours !== null ? (
            <p className={styles.hours}>{identity.workingHours}</p>
          ) : null}
          {/* Alt bilgi metni boş bırakılabilir; boşken paragraf hiç çizilmez ki
              alt bilgide anlamsız bir boşluk kalmasın. */}
          {identity.footerText !== null && identity.footerText.trim() !== '' ? (
            <p className={styles.note}>{identity.footerText}</p>
          ) : null}
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
