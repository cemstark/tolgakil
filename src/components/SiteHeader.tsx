'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, CTA_LINK } from '@/lib/navigation'
import styles from './SiteHeader.module.css'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  // WAI-ARIA disclosure deseni: Escape paneli kapatır, odağı tetikleyen düğmeye döndürür.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      menuButtonRef.current?.focus()
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.pill} onKeyDown={handleKeyDown}>
        <Link href="/" className={styles.brand}>
          AKIL <span aria-hidden="true">·</span> HUKUK
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Menüyü kapat' : 'Menüyü aç'}
        </button>

        <nav id="main-menu" aria-label="Ana gezinme" data-open={open} className={styles.nav}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.link}
              aria-current={pathname === l.href ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={CTA_LINK.href}
            className={styles.cta}
            aria-current={pathname === CTA_LINK.href ? 'page' : undefined}
          >
            {CTA_LINK.label}
          </Link>
        </nav>
      </div>
    </header>
  )
}
