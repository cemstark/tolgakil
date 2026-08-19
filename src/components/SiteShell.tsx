import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

type SiteShellProps = { children: ReactNode }

// Kabuk hem (site) rota grubunun layout'unda hem de kök not-found.tsx'te kullanılıyor:
// eşleşmeyen adreslerde Next kök layout'u çiziyor, rota grubunun layout'unu değil.
export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <a href="#content" className="skipLink">
        İçeriğe atla
      </a>
      <SiteHeader />
      <main id="content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
