import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { SITE } from '@/content/site'

// Açıklama sayfaya özgü yazılmak zorunda: boş bırakıldığında Next kök layout'un genel
// açıklamasına düşüyor ve arama sonucunda /makaleler ile ana sayfa aynı iki satırı
// gösteriyor. Metin bilgilendirme amacını belirtiyor; hukuki tavsiye vaadi vermiyor.
const ACIKLAMA = `${SITE.name} tarafından yayımlanan hukuk alanındaki bilgilendirme yazıları.`

export const metadata: Metadata = {
  title: 'Makaleler',
  description: ACIKLAMA,
  // Gerekçe iletisim/page.tsx ile aynı: kart paylaşıldığında sayfa adı görünsün.
  openGraph: {
    siteName: SITE.name,
    locale: 'tr_TR',
    title: 'Makaleler',
    description: ACIKLAMA,
    url: '/makaleler',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Makaleler', description: ACIKLAMA },
  // Kanonik adres: aynı içerik sorgu dizesi eklenmiş adreslerden de
  // ulaşılabildiğinde arama motoru bunu içerik kopyası sayabiliyor.
  alternates: { canonical: '/makaleler' },
}

export default function ArticlesPage() {
  return (
    <article className="pageShell">
      <PageHeading eyebrow="Yayınlar" title="Makaleler" />
      <p>Yayınlanan makalelerin listesi ve kategori filtresi Plan 3&apos;te eklenecek. Bu sayfa şimdilik yer tutucudur.</p>
    </article>
  )
}
