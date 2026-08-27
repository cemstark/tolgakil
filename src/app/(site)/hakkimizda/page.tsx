import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { ABOUT_IMAGE } from '@/content/practice-area-images'
import { SITE } from '@/content/site'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Başlık da gövde de veritabanından; büro metni panelden düzenlenebilir olmalı (sözleşme
// §3.6). İki çağrı var ama sorgu bir: loadStaticPage 'use cache' altında.
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('hakkimizda')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  // Kanonik adres bulunamayan sayfaya YAZILMIYOR: var olmayan bir belgeyi kendi kendisinin
  // aslı ilan etmek, arama motoruna 404'ü indekslenebilir bir sayfa gibi gösterirdi.
  //
  // Açıklama sayfaya ÖZGÜ yazılmak zorunda: bu alan boş bırakıldığında Next kök layout'un
  // genel açıklamasına düşüyordu (src/app/layout.tsx), yani arama sonucunda /hakkimizda ile
  // ana sayfa birebir aynı iki satırla görünüyordu — iki farklı sayfa, tek tanıtım.
  //
  // Metin övgü sıfatı, üstünlük ve başarı iddiası içermiyor (TBB reklam yasağı); yer adı
  // yönetmeliğin zaten yayımlanmasını beklediği iletişim bilgisi olarak, doğal bir cümle
  // içinde geçiyor. Anahtar kelime kalıbı ("Samsun En İyi Avukat" vb.) kurulmuyor.
  const description = `Akil Hukuk Bürosu ve Av. Tolga Akil hakkında: ${SITE.district} / ${SITE.city}’da gayrimenkul, icra ve iflas, iş, tazminat, sigorta, kira ve miras hukuku alanlarında yürütülen çalışmalar.`

  // openGraph/twitter da yazılıyor: yalnız `description` eklemek düzeltmeyi arama
  // sonucuyla sınırlı bırakıyordu — paylaşım kartında og:title hâlâ "Akil Hukuk Bürosu",
  // açıklama hâlâ anasayfanınki kalıyordu. siteName ve locale TEKRAR yazılmak zorunda:
  // Next openGraph'ı kökle derin birleştirmiyor, tümüyle değiştiriyor (aynı gerekçe
  // calisma-alanlari/[slug]/page.tsx'te uzun uzun yazılı).
  //
  // NOT — /iletisim, /kadro ve /makaleler'de bu eksik SÜRÜYOR: onlar bu işin kapsamı
  // dışındaydı, paylaşım kartlarında hâlâ yalnız büro adı görünüyor.
  return {
    title: page.title,
    description,
    alternates: { canonical: '/hakkimizda' },
    openGraph: {
      siteName: SITE.name,
      locale: 'tr_TR',
      title: page.title,
      description,
      url: '/hakkimizda',
      type: 'profile',
    },
    twitter: { card: 'summary_large_image', title: page.title, description },
  }
}

export default async function AboutPage() {
  const page = await loadStaticPage('hakkimizda')
  // Satır yoksa bu bir kurulum eksikliğidir; sessizce boş sayfa göstermek yerine 404.
  if (page === null) notFound()

  // Görsel yalnız bu sayfaya veriliyor; /kvkk ve /cerez-politikasi aynı bileşeni
  // kullanıyor ama hukuki metin sayfasında dekoratif fotoğrafın işi yok.
  return (
    <StaticPage
      eyebrow="Büro"
      title={page.title}
      content={page.content}
      image={ABOUT_IMAGE}
      credit
    />
  )
}
