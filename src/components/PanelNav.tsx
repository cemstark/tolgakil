'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/db/schema'
import { canAccess, type PanelResource } from '@/lib/permissions'
import { isCurrentPath } from '@/lib/navigation'
import { signOutAction } from '@/app/panel/actions'
import styles from './PanelNav.module.css'

// Gezinme sözleşmesi burada sabitleniyor; bağlantı listesi tek yerde durduğu için yeni
// bölüm eklemek tek satır: yetki süzgeci ve etkin bölüm işaretlemesi kendiliğinden çalışır.
const PANEL_LINKS = [
  { href: '/panel/makaleler', label: 'Makaleler', resource: 'articles' },
  { href: '/panel/medya', label: 'Medya', resource: 'media' },
  { href: '/panel/kadro', label: 'Kadro', resource: 'lawyers' },
  { href: '/panel/calisma-alanlari', label: 'Çalışma Alanları', resource: 'practiceAreas' },
  { href: '/panel/kategoriler', label: 'Kategoriler', resource: 'categories' },
  { href: '/panel/sayfalar', label: 'Sayfa Metinleri', resource: 'pages' },
  { href: '/panel/mesajlar', label: 'Mesajlar', resource: 'messages' },
  { href: '/panel/kullanicilar', label: 'Kullanıcılar', resource: 'users' },
  { href: '/panel/ayarlar', label: 'Ayarlar', resource: 'settings' },
] as const satisfies ReadonlyArray<{ href: string; label: string; resource: PanelResource }>

type PanelNavProps = { role: UserRole; userName: string }

export function PanelNav({ role, userName }: PanelNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // Alt rotalar (/panel/makaleler/yeni) da üst bölümü işaretli tutar.
  const isCurrent = (href: string) => isCurrentPath(pathname, href)

  // SiteHeader ile aynı WAI-ARIA disclosure deseni: Escape paneli kapatır ve odağı
  // tetikleyen düğmeye döndürür. İki kabuk aynı davranışı göstermek zorunda; kullanıcı
  // panele geçtiğinde menünün başka türlü çalıştığını öğrenmek durumunda kalmamalı.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      menuButtonRef.current?.focus()
    }
  }

  return (
    <nav aria-label="Panel gezinmesi" className={styles.nav} onKeyDown={handleKeyDown}>
      <div className={styles.bar}>
        {/* Tam eşleşme, isCurrentPath değil: /panel her panel rotasının öneki, önek eşleşmesi
            marka bağlantısını sayfaların hepsinde etkin gösterirdi. */}
        <Link
          href="/panel"
          prefetch={false}
          className={styles.brand}
          aria-current={pathname === '/panel' ? 'page' : undefined}
        >
          Panel
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="panel-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Menüyü kapat' : 'Menüyü aç'}
        </button>
      </div>

      {/* Kapalıyken display:none — bağlantılar klavye sırasına hiç girmez (odak sızıntısı
          olmaz) ve erişilebilirlik ağacından da düşer. */}
      <div id="panel-menu" data-open={open} className={styles.menu}>
        <div className={styles.links}>
          {/* prefetch={false}: panel rotalarının hepsi dinamik ve her biri veritabanına
              gidiyor; sekiz bağlantıyı önden çekmek menü her açıldığında sekiz gereksiz
              sorgu demek. Asıl gerekçe ise ölçülen bir yarış: uçuştaki bir panel isteği
              çıkıştan SONRA dönüp oturum çerezini geri yazabiliyor (next-auth JWT'yi her
              istekte tazeliyor) — kullanıcı giriş sayfasını görüyor ama oturumu açık
              kalıyordu. Üretim derlemesinde tam süit altında yakalandı. */}
          {PANEL_LINKS.filter((l) => canAccess(role, l.resource)).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
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
      </div>
    </nav>
  )
}
