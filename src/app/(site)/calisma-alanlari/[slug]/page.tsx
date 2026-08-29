import type { Metadata } from 'next'
import Link from 'next/link'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { ContentCredit } from '@/components/ContentCredit'
import { OfficeLocationNote } from '@/components/OfficeLocationNote'
import { PageHeading } from '@/components/PageHeading'
import { PageHero } from '@/components/PageHero'
import { practiceAreaImage } from '@/content/practice-area-images'
import {
  getPublicPracticeAreaBySlug,
  listPublicPracticeAreas,
} from '@/db/queries/public/practice-areas'
import { listArticlesByPracticeArea } from '@/db/queries/public/articles'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import { formatDate, isoDate } from '@/lib/date'
import { renderableHtml } from '@/lib/render-html'
import { TAGS } from '@/lib/cache-tags'
import { CONTENT_APPROVAL, SITE } from '@/content/site'
import styles from './page.module.css'

// params Next 16'da Promise; await edilmeden okunamaz.
type AreaPageProps = { params: Promise<{ slug: string }> }

// YER TUTUCU SLUG — kadro/[slug]/page.tsx ile birebir aynı gerekçe: cacheComponents
// açıkken generateStaticParams boş dizi DÖNEMEZ, "empty generateStaticParams" derleme
// hatası fırlatır (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
// generate-static-params.md, "With Cache Components" bölümü). Panelde henüz yayımlanmış
// çalışma alanı yokken de derleme geçsin diye tek bir yer tutucu döndürülüyor. Bu slug
// hiçbir gerçek alanla eşleşmez (veritabanı slug'ları alan adından üretiliyor, bu değer
// bilerek üretilemeyecek bir biçimde yazıldı); sayfa gövdesindeki
// getPublicPracticeAreaBySlug onu bulamayınca zaten notFound()'a düşüyor.
const YER_TUTUCU_SLUG = '__henuz-calisma-alani-yok__'

// Sağ kolondaki "İlgili alanlar" listesinin uzunluğu. Yedi alanın altısını birden
// listelemek yan kolonu sayfadan uzun yapıyordu; dördü, sticky kolonun ekrana sığdığı
// en büyük sayı.
const RELATED_COUNT = 4

// Yan kolonda listelenen yazı sayısı. Dört satır, yapışkan kolonun ekrana sığdığı sınır;
// tamamı için "Makaleler" arşivi var.
const AREA_ARTICLE_COUNT = 4

// Yalnız yayımlanmış alanlar ön üretilir; taslak adresleri derleme çıktısında görünmez.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const areas = await listPublicPracticeAreas()
  if (areas.length === 0) return [{ slug: YER_TUTUCU_SLUG }]
  return areas.map((area) => ({ slug: area.slug }))
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  // Aynı önbellek sınırı — sayfa gövdesindeki gerekçeyle birebir (aşağıda).
  'use cache'
  cacheTag(TAGS.practiceAreas)
  cacheLife('max')

  const { slug } = await params
  const area = await getPublicPracticeAreaBySlug(slug)
  if (area === null) return { title: 'Sayfa bulunamadı' }

  // Başlık ALANIN KENDİ ADI: "Samsun Gayrimenkul Avukatı" gibi bir anahtar kelime kalıbı
  // kurulmuyor (spec §2.1). Açıklamada ise büronun bulunduğu yer doğal bir cümle içinde
  // geçiyor — konum, yönetmeliğin zaten yayımlanmasını beklediği iletişim bilgisidir ve
  // müşterinin talebi de "doğal şekilde" Samsun odaklı olmasıydı. Övgü sıfatı, üstünlük
  // veya başarı ifadesi hiçbir durumda eklenmiyor.
  const description = `${area.summary} ${SITE.district} / ${SITE.city}’daki büromuz bu alanda avukatlık ve hukuki danışmanlık hizmeti sunmaktadır.`

  return {
    title: area.name,
    description,
    alternates: { canonical: `/calisma-alanlari/${slug}` },
    // openGraph olmadan yedi alanın hepsi sosyal medyada kök layout'un tek kartıyla,
    // yani yalnız büro adıyla paylaşılıyordu: WhatsApp'ta "Kira Hukuku" bağlantısı
    // gönderen biri karşı tarafta "Akil Hukuk Bürosu" görüyordu. Sayfa başına başlık ve
    // açıklama o karışıklığı bitiriyor.
    //
    // og:image BİLEREK yazılmıyor: kök dizindeki opengraph-image.tsx dosya varlığından
    // bulunuyor ve her rotaya kendiliğinden uygulanıyor (kök layout'ta yazılı). Burada
    // ikinci bir görsel bildirmek onu ezerdi.
    openGraph: {
      // siteName ve locale TEKRAR yazılıyor, ÖLÇÜLDÜ: Next `openGraph` nesnesini kökle
      // derin birleştirmiyor, tümüyle DEĞİŞTİRİYOR. Yalnız title/description/url/type
      // yazıldığında kök layout'un `og:site_name` ve `og:locale` etiketleri çıktıdan
      // tümüyle düşüyordu (anasayfada var, alan sayfasında yok). Paylaşım kartının alt
      // satırındaki büro adı ve dil bilgisi kaybolduğu için, başlığı düzeltirken başka
      // bir eksik üretmiş oluyorduk.
      siteName: SITE.name,
      locale: 'tr_TR',
      title: area.name,
      description,
      url: `/calisma-alanlari/${slug}`,
      type: 'article',
    },
    // twitter ayrıca yazılmak ZORUNDA: kök layout açık bir `twitter` nesnesi tanımlıyor ve
    // Next o durumda openGraph'tan türetmiyor, kökteki değerleri olduğu gibi bırakıyor.
    // Ölçüldü — yalnız openGraph eklendiğinde og:title "Kira Hukuku" olurken twitter:title
    // "Akil Hukuk Bürosu" kalıyordu, yani sorun X/Twitter tarafında aynen sürüyordu.
    //
    // `card` ve `images` de yazılmak zorunda, ÖLÇÜLDÜ: sayfada `twitter` nesnesi tanımlamak
    // kökün tamamını eziyor, yalnız verilen alanlar kalıyordu. Kısmi yazıldığında kart
    // summary_large_image'dan summary'ye düşüyor ve twitter:image tümüyle kayboluyordu —
    // yani başlığı düzeltirken paylaşım görselini yok ediyorduk.
    twitter: { card: 'summary_large_image', title: area.name, description },
  }
}

export default async function PracticeAreaPage({ params }: AreaPageProps) {
  // ÖNBELLEK SINIRI + notFound() KURALI (kadro/[slug]/page.tsx ile bağlayıcı): sorgu
  // 'use cache' olmadan derleme düşer. notFound() bu sınırın İÇİNDE ama herhangi bir
  // <Suspense> sınırının DIŞINDA çağrılıyor; Suspense içine taşınmış hâli üretim
  // derlemesinde 200 döndürüyordu (Görev 5'te ölçüldü). Varlık denetimi bu yüzden akan bir
  // çocuğa değil, doğrudan sayfa gövdesine yazılıyor.
  'use cache'
  // settings ETİKETİ EKLENDİ: sağ kolondaki görüşme kartı telefon ve WhatsApp bağlantısını
  // ayarlardan okuyor. Etiket yazılmasaydı panelden numara değiştiğinde bu yedi sayfa eski
  // numarayı göstermeye devam ederdi.
  // articles ETİKETİ de var: yan kolon bu alana bağlı yazıları listeliyor, yani panelden
  // bir yazı yayımlandığında bu sayfa da tazelenmeli.
  cacheTag(TAGS.practiceAreas, TAGS.settings, TAGS.articles)
  cacheLife('max')

  const { slug } = await params
  const area = await getPublicPracticeAreaBySlug(slug)
  if (area === null) notFound()

  // İki sorgu paralel; sıralı await'te gecikme ikisinin toplamı olurdu.
  const [areas, identity, alanYazilari] = await Promise.all([
    listPublicPracticeAreas(),
    getPublicSiteIdentity(),
    listArticlesByPracticeArea(slug, AREA_ARTICLE_COUNT),
  ])

  const hasContent = area.content !== null && area.content.trim() !== ''
  const gorsel = practiceAreaImage(slug)

  // Kaştaki sıra numarası alanın YAYIMLANMIŞ liste içindeki yeri; liste sortOrder'a göre
  // dizili, yani numara panelden yapılan sıralamayı yansıtıyor. Bulunamazsa kaş yalnız
  // "Çalışma alanı" kalıyor — uydurma bir numara basmaktansa eksik bırakmak doğrusu.
  const index = areas.findIndex((a) => a.slug === slug)
  const eyebrow =
    index === -1
      ? 'Çalışma alanı'
      : `Çalışma alanı · ${String(index + 1).padStart(2, '0')} / ${String(areas.length).padStart(2, '0')}`

  const ilgili = areas.filter((a) => a.slug !== slug).slice(0, RELATED_COUNT)

  return (
    <article>
      {/* Görseli olan alan sinematik bandı, olmayan sade başlığı alır. Panelden eklenen
          yeni bir alanın eşlemede karşılığı olmaz (practice-area-images.ts); kırık bir
          görsel kutusu göstermektense bandı hiç çizmemek doğrusu. Her iki dalda da
          sayfanın tek <h1>'i çiziliyor. */}
      {gorsel !== undefined ? (
        <PageHero src={gorsel.src} eyebrow={eyebrow} title={area.name} lead={area.summary} boy="orta" />
      ) : (
        <div className="pageShell">
          <PageHeading eyebrow={eyebrow} title={area.name} />
          <p className={styles.lead}>{area.summary}</p>
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.main}>
          {/* Ayrıntı metni girilmemiş alanda yalnız özet (banttaki lead) kalır; boş bir
              .prose kabı çizilmez. */}
          {hasContent ? (
            <div className="prose" dangerouslySetInnerHTML={renderableHtml(area.content!)} />
          ) : null}
          {/* Konum notu KOŞULSUZ: künyenin aksine bir onay beyanı değil, büronun nerede
              faaliyet gösterdiğini söyleyen bir olgu — panelden sonradan eklenen bir alan
              için de doğru. Alanın adını içermiyor; gerekçesi bileşenin kendi başında
              (spec §2.1, şehir + hukuk dalı kalıbı yasak). */}
          <OfficeLocationNote />
          {/* Künye YALNIZ belgeden gelen yedi alanda basılıyor. Koşulsuz basıldığında,
              panelden sonradan eklenen bir çalışma alanı da "Av. Tolga Akil tarafından
              hazırlanmış ve onaylanmıştır" diyordu — avukatın hiç görmediği bir metnin
              altında yanlış bir onay beyanı. Kapsam listesi CONTENT_APPROVAL'da. */}
          {CONTENT_APPROVAL.practiceAreaSlugs.includes(slug) && <ContentCredit />}
        </div>

        <aside className={styles.side}>
          {/* Görüşme kartı. Numara ayarlardan geliyor — elle yazılmış bir numara ikinci
              bir gerçek kaynağı olurdu. Metin TBB reklam yasağına uygun: iddia, üstünlük,
              başarı veya ücret ifadesi yok, yalnız iletişim daveti. */}
          <div className={styles.cta}>
            <h2 className={styles.ctaTitle}>Bu konuda görüşme</h2>
            <p className={styles.ctaText}>
              Konunuzu iletirseniz çalışma saatleri içinde dönüş yapılır.
            </p>
            <a href={identity.phoneHref} className={styles.ctaPhone}>
              {identity.phone}
            </a>
            {identity.whatsappHref !== null ? (
              <a
                href={identity.whatsappHref}
                className={styles.ctaAlt}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            ) : null}
          </div>

          {/* BU ALANDAKİ YAZILAR — makale ile çalışma alanı arasındaki bağ "tüm planlar"
              turunda kuruldu (articles.practice_area_id). Bağlı yazı yoksa blok hiç
              çizilmiyor: boş bir "yazılar" başlığı, arşivin boş olduğunu değil sayfanın
              eksik olduğunu düşündürüyordu. */}
          {alanYazilari.length > 0 ? (
            <nav className={styles.related} aria-label="Bu alandaki yazılar">
              <h2 className={styles.relatedTitle}>Bu alandaki yazılar</h2>
              <ul className={styles.articleList}>
                {alanYazilari.map((yazi) => {
                  const gun = isoDate(yazi.publishedAt)
                  return (
                    <li key={yazi.slug}>
                      <Link href={`/makaleler/${yazi.slug}`} className={styles.articleLink}>
                        <span className={styles.articleTitle}>{yazi.title}</span>
                        <time dateTime={gun} className={styles.articleDate}>
                          {formatDate(gun)}
                        </time>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          ) : null}

          {/* <nav> + aria-label: ekran okuyucu bunu sayfa içeriğinin devamı değil ayrı bir
              gezinme bölgesi olarak duyursun. Tek alan yayındaysa liste boş kalır ve blok
              hiç çizilmez. */}
          {ilgili.length > 0 ? (
            <nav className={styles.related} aria-label="İlgili çalışma alanları">
              <h2 className={styles.relatedTitle}>İlgili alanlar</h2>
              <ul className={styles.pills}>
                {ilgili.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/calisma-alanlari/${a.slug}`} className={styles.pill}>
                      {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </aside>
      </div>
    </article>
  )
}
