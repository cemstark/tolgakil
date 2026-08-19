import type { ReactNode } from 'react'
import { SiteShell } from '@/components/SiteShell'

// settings sorgusu Plan 3'te BURAYA gelecek — kök layout'a değil. Kök layout hatasında
// sunucu Next'in __next_error__ kabuğunu döndürüyor ve telefon numarası kayboluyor (ölçüldü).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
