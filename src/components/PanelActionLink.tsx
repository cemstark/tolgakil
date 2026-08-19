import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './PanelActionLink.module.css'

/** Liste başlığının sağındaki birincil eylem bağlantısı ("Yeni avukat" gibi). */
export function PanelActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  )
}

/** Liste boşken gösterilen kart; her bölümde aynı yerleşim, farklı metin. */
export function PanelEmptyState({ children }: { children: ReactNode }) {
  return <p className={`card ${styles.empty}`}>{children}</p>
}
