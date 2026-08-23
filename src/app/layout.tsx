import type { Metadata } from 'next'
import { Cormorant_Garamond, Outfit } from 'next/font/google'
import { SITE } from '@/content/site'
// Mutlak adres dört yerde okunuyor (metadataBase, sitemap, robots, JSON-LD); kopyalanan bir
// adres sessizce ayrışıp arama motoruna iki farklı site gösterirdi.
import { SITE_URL } from '@/lib/site-url'
import './globals.css'

// latin-ext olmadan ğ ş ı İ ç ö ü harfleri yedek yazı tipine düşer.
const display = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400'],
  variable: '--font-display',
  display: 'swap',
})

const body = Outfit({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

// Meta açıklaması ~140 karakter: arama sonucunda kesilmeden görünen aralık. Şehir ve ilçe
// başta, çünkü hedef sorgu "Samsun avukat" biçiminde konum içeriyor; ardından belgedeki
// yedi çalışma alanı, arama motoru sayfayı bu konularla ilişkilendirsin.
const DESCRIPTION =
  'Samsun İlkadım’da gayrimenkul, icra ve iflas, iş, tazminat, sigorta, kira ve miras hukuku alanlarında avukatlık ve hukuki danışmanlık hizmeti.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: DESCRIPTION,
  // Paylaşım kartı meta'sı hiç yoktu: WhatsApp, LinkedIn ve X'te bağlantı çıplak adres
  // olarak, başlıksız ve görselsiz görünüyordu. Görsel opengraph-image.tsx'ten geliyor,
  // Next onu dosya varlığından bulur — burada ayrıca `images` yazmak gerekmiyor.
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: SITE.name,
    title: SITE.name,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: DESCRIPTION,
  },
  // Meslek etiği gereği reklam yasağı var ama site DİZİNE GİRMELİ: yasak tanıtımı
  // sınırlar, aramada bulunmayı değil.
  robots: { index: true, follow: true },
}

type RootLayoutProps = { children: React.ReactNode }

// Yalnız <html>/<body>, yazı tipleri ve metadata. Kabuk (atlama bağlantısı, başlık, <main>,
// alt bilgi) buradan çıktı: genel site onu (site)/layout.tsx'ten, panel kendi layout'undan alır.
// Burada VERİ ÇEKİLMEZ (spec §11): kök layout hatasında sunucu <html id="__next_error__">
// kabuğunu döndürüyor, Türkçe metin ve telefon numarası kayboluyor (Plan 1'de ölçüldü).
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
