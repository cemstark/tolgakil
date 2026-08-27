import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { PageHeading } from '@/components/PageHeading'
import { LawyerCard } from '@/components/LawyerCard'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { TAGS } from '@/lib/cache-tags'
import { SITE } from '@/content/site'
import styles from './page.module.css'

// Başlık büro adı + sayfa konusuyla sınırlı (spec §10); kök layout şablonu büro adını ekler.
// Açıklama sayfaya özgü yazılmak zorunda: boş bırakıldığında Next kök layout'un genel
// açıklamasına düşüyor ve arama sonucunda /kadro ile ana sayfa aynı iki satırı gösteriyor.
// Metin yalnız sayfanın ne içerdiğini söylüyor; övgü, üstünlük ve başarı iddiası yok
// (TBB reklam yasağı).
const ACIKLAMA = `${SITE.name} bünyesinde görev yapan avukatlar; ${SITE.district} / ${SITE.city}.`

export const metadata: Metadata = {
  title: 'Kadro',
  description: ACIKLAMA,
  // Kanonik adres: aynı içerik sorgu dizesi eklenmiş adreslerden de
  // ulaşılabildiğinde arama motoru bunu içerik kopyası sayabiliyor.
  alternates: { canonical: '/kadro' },
  // Gerekçe iletisim/page.tsx ile aynı: kart paylaşıldığında sayfa adı görünsün.
  openGraph: {
    siteName: SITE.name,
    locale: 'tr_TR',
    title: 'Kadro',
    description: ACIKLAMA,
    url: '/kadro',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Kadro', description: ACIKLAMA },
}

export default async function TeamPage() {
  // ÖNBELLEK SINIRI — src/app/(site)/page.tsx'teki kalıpla aynı (Görev 1C ile bağlayıcı
  // hâle geldi): sayfa DB'den okuyor ve 'use cache' olmadan derleme "uncached or runtime
  // data during prerendering" ile düşüyor (ölçüldü, Görev 1 raporu §3.2).
  'use cache'
  cacheTag(TAGS.lawyers)
  cacheLife('max')

  const lawyers = await listPublicLawyers()

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Avukatlar" title="Kadro" />
      {lawyers.length === 0 ? (
        <p className={styles.empty}>Kadro bilgileri yakında yayımlanacak.</p>
      ) : (
        <ul className={styles.grid}>
          {lawyers.map((lawyer) => (
            <li key={lawyer.slug}>
              <LawyerCard lawyer={lawyer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
