'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/db/schema'
import { canAccess, type PanelResource } from '@/lib/permissions'
import { isCurrentPath } from '@/lib/navigation'
import { signOutAction } from '@/app/panel/actions'
import styles from './PanelNav.module.css'

// Gezinme sözleşmesi burada sabitleniyor; sayfaların bir kısmı Görev 5-7'de geliyor ve
// o zamana kadar 404 veriyor. Bağlantı listesi tek yerde durduğu için yeni bölüm eklemek
// tek satır: yetki süzgeci ve etkin bölüm işaretlemesi kendiliğinden çalışır.
const PANEL_LINKS = [
  { href: '/panel/makaleler', label: 'Makaleler', resource: 'articles' },
  { href: '/panel/medya', label: 'Medya', resource: 'media' },
  { href: '/panel/kadro', label: 'Kadro', resource: 'lawyers' },
  { href: '/panel/calisma-alanlari', label: 'Çalışma Alanları', resource: 'practiceAreas' },
  { href: '/panel/kategoriler', label: 'Kategoriler', resource: 'categories' },
  { href: '/panel/mesajlar', label: 'Mesajlar', resource: 'messages' },
  { href: '/panel/kullanicilar', label: 'Kullanıcılar', resource: 'users' },
  { href: '/panel/ayarlar', label: 'Ayarlar', resource: 'settings' },
] as const satisfies ReadonlyArray<{ href: string; label: string; resource: PanelResource }>

type PanelNavProps = { role: UserRole; userName: string }

export function PanelNav({ role, userName }: PanelNavProps) {
  const pathname = usePathname()

  // Alt rotalar (/panel/makaleler/yeni) da üst bölümü işaretli tutar.
  const isCurrent = (href: string) => isCurrentPath(pathname, href)

  return (
    <nav aria-label="Panel gezinmesi" className={styles.nav}>
      {/* Tam eşleşme, isCurrentPath değil: /panel her panel rotasının öneki, önek eşleşmesi
          marka bağlantısını sayfaların hepsinde etkin gösterirdi. */}
      <Link href="/panel" className={styles.brand} aria-current={pathname === '/panel' ? 'page' : undefined}>
        Panel
      </Link>

      <div className={styles.links}>
        {PANEL_LINKS.filter((l) => canAccess(role, l.resource)).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={styles.link}
            aria-current={isCurrent(l.href) ? 'page' : undefined}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className={styles.account}>
        <p className={styles.userName}>{userName}</p>
        <form action={signOutAction}>
          <button type="submit" className={styles.signOut}>
            Çıkış yap
          </button>
        </form>
      </div>
    </nav>
  )
}
