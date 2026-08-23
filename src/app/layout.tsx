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

const DESCRIPTION = 'Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık.'

const YEREL_ADRES = 'http://localhost:3000'

// metadataBase olmadan Next göreli og:image/canonical adreslerini mutlak hâle getiremiyor
// ve derlemede uyarı basıyor; paylaşım kartı da sessizce görselsiz kalıyor.
// Sıralama: kendi değişkeni → AUTH_URL (üretimde zaten alan adını taşıyor) → yerel.
// AUTH_URL yedek olarak duruyor çünkü dağıtımda tanımlı olan tek mutlak adres o; gerçek
// alan adı belli olunca NEXT_PUBLIC_SITE_URL tanımlanması yeterli, kod değişmez.
//
// `||` kullanılıyor, `??` DEĞİL: .env dosyasında `NEXT_PUBLIC_SITE_URL=` (değersiz) yazmak
// boş DİZE üretir, `??` bunu geçerli sayıp geçirir ve `new URL('')` fırlatır. try/catch de
// aynı sebeple var — bozuk bir adres (ör. şeması unutulmuş "example.com") aynı sonucu verir.
// Hata MODÜL DEĞERLENDİRME anında oluştuğu için hiçbir error boundary yakalayamaz; sunucu
// bu dosyanın en altındaki yorumun tam olarak kaçınmak istediği __next_error__ kabuğunu
// döndürür ve Türkçe metinle telefon numarası kaybolur. Yanlış yapılandırma, sitenin
// tamamını değil yalnızca paylaşım kartının adresini bozmalı.
function siteAdresiniCoz(): string {
  const aday = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || YEREL_ADRES
  try {
    return new URL(aday).toString()
  } catch {
    return YEREL_ADRES
  }
}

const SITE_URL = siteAdresiniCoz()

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
