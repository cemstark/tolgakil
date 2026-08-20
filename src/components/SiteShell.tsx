import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import type { PublicSiteIdentity } from '@/db/queries/public/site-identity'

type SiteShellProps = { children: ReactNode; identity: PublicSiteIdentity }

// Kabuk hem (site) rota grubunun layout'unda hem de kök not-found.tsx'te kullanılıyor:
// eşleşmeyen adreslerde Next kök layout'u çiziyor, rota grubunun layout'unu değil.
// Kimlik veriyi kabuk KENDİ çekmiyor, prop olarak alıyor: iki çağıranın ikisi de sunucu
// bileşeni ve okuma zaten önbellekli; kabuğun kendi veri bağımlılığı olması onu her
// kullanan yerde async'e zorlardı.
export function SiteShell({ children, identity }: SiteShellProps) {
  return (
    <>
      <a href="#content" className="skipLink">
        İçeriğe atla
      </a>
      <SiteHeader officeName={identity.officeName} />
      <main id="content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter identity={identity} />
    </>
  )
}
