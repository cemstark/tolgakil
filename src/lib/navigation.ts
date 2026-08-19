export const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/kadro', label: 'Kadro' },
  { href: '/calisma-alanlari', label: 'Çalışma Alanları' },
  { href: '/makaleler', label: 'Makaleler' },
]

export const CTA_LINK = { href: '/iletisim', label: 'İletişim' } as const

// Etkin bölüm yüklemi: alt sayfalarda üst bölüm işaretli kalır (/kadro/tolga-akil → "Kadro",
// /panel/makaleler/yeni → "Makaleler"). Sınır `/` ile çekiliyor; aksi hâlde /kadro öneki
// /kadrolar ile de eşleşirdi. Hem SiteHeader hem PanelNav bunu kullanır.
export function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
