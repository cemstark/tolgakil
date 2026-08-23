import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Aydınlatma metni HUKUKİ BELGEDİR ve bu kodda yazılmaz; büro panelden girer. Tohumdaki
// yer tutucu, gerçek metin girilene kadar durur (sözleşme §3.6, spec §13).
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('kvkk')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  // Kanonik adres bulunamayan sayfaya YAZILMIYOR: var olmayan bir belgeyi kendi kendisinin
  // aslı ilan etmek, arama motoruna 404'ü indekslenebilir bir sayfa gibi gösterirdi.
  return { title: page.title, alternates: { canonical: '/kvkk' } }
}

export default async function KvkkPage() {
  const page = await loadStaticPage('kvkk')
  if (page === null) notFound()

  return <StaticPage eyebrow="Yasal" title={page.title} content={page.content} />
}
