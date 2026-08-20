import type { ReactNode } from 'react'
import { SiteShell } from '@/components/SiteShell'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'

// Ayar okuması BURADA, kök layout'ta değil (spec §11): kök layout hatasında sunucu Next'in
// __next_error__ kabuğunu döndürüyor ve telefon numarası kayboluyor (Plan 1'de ölçüldü).
// Okuma önbellekli olduğu için üretim derlemesinde değer sayfaya gömülü gelir; çalışma
// anında veritabanı düşse bile kabuk ve telefon numarası yayında kalır.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const identity = await getPublicSiteIdentity()
  return <SiteShell identity={identity}>{children}</SiteShell>
}
