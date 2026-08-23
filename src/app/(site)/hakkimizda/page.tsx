import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Başlık da gövde de veritabanından; büro metni panelden düzenlenebilir olmalı (sözleşme
// §3.6). İki çağrı var ama sorgu bir: loadStaticPage 'use cache' altında.
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('hakkimizda')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  // Kanonik adres bulunamayan sayfaya YAZILMIYOR: var olmayan bir belgeyi kendi kendisinin
  // aslı ilan etmek, arama motoruna 404'ü indekslenebilir bir sayfa gibi gösterirdi.
  return { title: page.title, alternates: { canonical: '/hakkimizda' } }
}

export default async function AboutPage() {
  const page = await loadStaticPage('hakkimizda')
  // Satır yoksa bu bir kurulum eksikliğidir; sessizce boş sayfa göstermek yerine 404.
  if (page === null) notFound()

  return <StaticPage eyebrow="Büro" title={page.title} content={page.content} />
}
