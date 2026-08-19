import type { Metadata } from 'next'
import { Cormorant_Garamond, Outfit } from 'next/font/google'
import { SITE } from '@/content/site'
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

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: 'Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık.',
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
