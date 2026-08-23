import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Çerez politikası da hukuki belgedir; metin bu kodda yazılmaz (bkz. kvkk/page.tsx).
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('cerez-politikasi')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  // Kanonik adres bulunamayan sayfaya YAZILMIYOR: var olmayan bir belgeyi kendi kendisinin
  // aslı ilan etmek, arama motoruna 404'ü indekslenebilir bir sayfa gibi gösterirdi.
  return { title: page.title, alternates: { canonical: '/cerez-politikasi' } }
}

export default async function CookiePolicyPage() {
  const page = await loadStaticPage('cerez-politikasi')
  if (page === null) notFound()

  return <StaticPage eyebrow="Yasal" title={page.title} content={page.content} />
}
