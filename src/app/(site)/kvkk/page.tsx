import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Aydınlatma metni HUKUKİ BELGEDİR ve bu kodda yazılmaz; büro panelden girer. Tohumdaki
// yer tutucu, gerçek metin girilene kadar durur (sözleşme §3.6, spec §13).
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('kvkk')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  return { title: page.title }
}

export default async function KvkkPage() {
  const page = await loadStaticPage('kvkk')
  if (page === null) notFound()

  return <StaticPage eyebrow="Yasal" title={page.title} content={page.content} />
}
