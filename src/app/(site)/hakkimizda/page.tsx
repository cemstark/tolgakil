import type { Metadata } from 'next'
import Link from 'next/link'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { ContentCredit } from '@/components/ContentCredit'
import { LawyerCard } from '@/components/LawyerCard'
import { PageHero } from '@/components/PageHero'
import { ABOUT_IMAGE } from '@/content/practice-area-images'
import { SITE } from '@/content/site'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import { loadStaticPage } from '@/db/queries/public/static-pages'
import { renderableHtml } from '@/lib/render-html'
import { TAGS, pageTag } from '@/lib/cache-tags'
import styles from './page.module.css'

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
  // ÖNBELLEK SINIRI — sayfa artık yalnız loadStaticPage'i (kendi içinde 'use cache')
  // değil, kadro / çalışma alanı / ayar sorgularını da çağırıyor. Onlar önbelleksiz
  // olduğu için sınır ÇAĞIRANDA olmak zorunda; ilk yazımda yoktu ve derleme "uncached or
  // runtime data during prerendering" ile düştü.
  //
  // Dört etiket, sayfanın alt ağacında okunan HER veri kalemi için: sayfa metni, kadro,
  // çalışma alanları ve ayarlar. Biri eksik olsaydı panelden o veri değiştiğinde
  // /hakkimizda eski hâlini göstermeye devam ederdi.
  //
  // notFound() bu sınırın İÇİNDE ama <Suspense> sınırının DIŞINDA — alan ve makale
  // ayrıntı sayfalarıyla aynı kural (next.config.ts'te gerekçesi yazılı).
  'use cache'
  cacheTag(TAGS.pages, pageTag('hakkimizda'), TAGS.lawyers, TAGS.practiceAreas, TAGS.settings)
  cacheLife('max')

  const page = await loadStaticPage('hakkimizda')
  // Satır yoksa bu bir kurulum eksikliğidir; sessizce boş sayfa göstermek yerine 404.
  if (page === null) notFound()

  // Üç sorgu paralel; sıralı await'te toplam gecikme üçünün toplamı olurdu.
  const [lawyers, areas, identity] = await Promise.all([
    listPublicLawyers(),
    listPublicPracticeAreas(),
    getPublicSiteIdentity(),
  ])

  return (
    <article>
      {/* 560px bant: sayfanın en ağır başlığı, büro görseliyle. StaticPage'in dar
          çerçeveli şeridi yerine tam genişlik sinematik bant (devir tasarımı 6a). */}
      <PageHero src={ABOUT_IMAGE.src} eyebrow="Büro" title={page.title} boy="uzun" />

      <div className={styles.body}>
        <div className={styles.split}>
          <div className={styles.main}>
            {/* Gövde HTML'i panelde temizlenerek yazılıyor, renderableHtml basma anında
                bir kez daha temizler (gerekçe: src/lib/render-html.ts). Metnin KENDİSİ bu
                kodda YAZILMAZ — büro metni panelden düzenlenebilir (sözleşme §3.6). */}
            <div className="prose" dangerouslySetInnerHTML={renderableHtml(page.content)} />
            {/* Künye: bu sayfanın metni müvekkil belgesinden geliyor ve avukat onaylı. */}
            <ContentCredit />

            {lawyers.length > 0 ? (
              <section className={styles.team}>
                <h2 className={styles.teamTitle}>Kadro</h2>
                <ul className={styles.teamGrid}>
                  {lawyers.map((lawyer) => (
                    <li key={lawyer.slug}>
                      <LawyerCard lawyer={lawyer} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className={styles.side}>
            {areas.length > 0 ? (
              <nav className={styles.block} aria-label="Çalışma alanları">
                <h2 className={styles.blockTitle}>Çalışma alanları</h2>
                <ul className={styles.pills}>
                  {areas.map((area) => (
                    <li key={area.slug}>
                      <Link href={`/calisma-alanlari/${area.slug}`} className={styles.pill}>
                        {area.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {/* Büro künyesi. Hepsi ayarlardan geliyor; elle yazılmış bir adres ya da
                numara ikinci bir gerçek kaynağı olurdu. Yönetmeliğin açıkça
                yayımlanabilir saydığı kalemler (adres, telefon, e-posta, çalışma saatleri)
                dışında bir şey yazmıyor. */}
            <div className={styles.block}>
              <h2 className={styles.blockTitle}>Büro</h2>
              <address className={styles.address}>
                <span className={styles.addressLine}>{identity.address}</span>
                <a href={identity.phoneHref} className={styles.contactLink}>
                  {identity.phone}
                </a>
                {identity.phoneSecondary !== null && identity.phoneSecondaryHref !== null ? (
                  <a href={identity.phoneSecondaryHref} className={styles.contactLink}>
                    {identity.phoneSecondary}
                  </a>
                ) : null}
                <a href={identity.emailHref} className={styles.contactLink}>
                  {identity.email}
                </a>
              </address>
              {identity.workingHours !== null ? (
                <p className={styles.hours}>{identity.workingHours}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}
