import type { Metadata } from 'next'
import Image from 'next/image'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { PageHeading } from '@/components/PageHeading'
import { getPublicLawyerBySlug, listPublicLawyers } from '@/db/queries/public/lawyers'
import { lawyerFacts } from '@/lib/lawyer-facts'
import { mediaUrl } from '@/lib/media-url'
import { renderableHtml } from '@/lib/render-html'
import { TAGS } from '@/lib/cache-tags'
import styles from './page.module.css'

// params Next 16'da Promise; await edilmeden okunamaz.
type LawyerPageProps = { params: Promise<{ slug: string }> }

// YER TUTUCU SLUG — cacheComponents açıkken generateStaticParams boş dizi DÖNEMEZ: "empty
// generateStaticParams" derleme hatası fırlatır (node_modules/next/dist/docs/01-app/03-api-
// reference/04-functions/generate-static-params.md, "With Cache Components" bölümü).
// Panelde henüz yayımlanmış avukat yokken de derleme geçsin diye tek bir yer tutucu
// döndürülüyor. Bu slug hiçbir gerçek avukatla eşleşmez (veritabanı slug'ları kelime
// gövdesinden üretiliyor, bu değer bilerek üretilemeyecek bir biçimde yazıldı); sayfa
// gövdesindeki getPublicLawyerBySlug onu bulamayınca zaten notFound()'a düşüyor — yer
// tutucu hiçbir zaman gerçek içerik üretmiyor veya sızdırmıyor.
const YER_TUTUCU_SLUG = '__henuz-avukat-yok__'

// Yalnız YAYIMLANMIŞ avukatlar ön üretilir; taslak adresleri derleme çıktısında hiç
// görünmesin. Bilinmeyen bir slug istendiğinde sayfa çalışma anında çizilir ve
// getPublicLawyerBySlug null döndüğü için notFound()'a düşer.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const lawyers = await listPublicLawyers()
  if (lawyers.length === 0) return [{ slug: YER_TUTUCU_SLUG }]
  return lawyers.map((lawyer) => ({ slug: lawyer.slug }))
}

export async function generateMetadata({ params }: LawyerPageProps): Promise<Metadata> {
  // Aynı önbellek sınırı — sayfa gövdesindeki gerekçeyle birebir (aşağıda).
  'use cache'
  cacheTag(TAGS.lawyers)
  cacheLife('max')

  const { slug } = await params
  const lawyer = await getPublicLawyerBySlug(slug)
  // Bulunamayan kayıtta sayfanın kendisi notFound()'a düşecek; burada yalnız nötr bir
  // başlık veriliyor, hata fırlatılmıyor (metadata çöktüğünde 404 sayfası da çökerdi).
  if (lawyer === null) return { title: 'Sayfa bulunamadı' }

  // Övgü sıfatı yok, mevzuatın saydığı alanlar dışına çıkılmıyor (spec §2.1, §10).
  return { title: `${lawyer.fullName} — ${lawyer.title}` }
}

export default async function LawyerPage({ params }: LawyerPageProps) {
  // ÖNBELLEK SINIRI + notFound() KURALI (Görev 1C ile bağlayıcı): sorgu 'use cache' olmadan
  // derleme düşer (Görev 1 raporu §3.2). notFound() bu sınırın İÇİNDE ama herhangi bir
  // <Suspense> sınırının DIŞINDA çağrılıyor — Suspense içine taşınmış hâli üretim
  // derlemesinde 200 döndürdü (ölçüldü, Görev 1C raporu §1C.2). Varlık denetimi bu yüzden
  // akan bir çocuğa değil, doğrudan sayfa gövdesine yazılıyor.
  'use cache'
  cacheTag(TAGS.lawyers)
  cacheLife('max')

  const { slug } = await params
  const lawyer = await getPublicLawyerBySlug(slug)
  if (lawyer === null) notFound()

  const facts = lawyerFacts(lawyer)
  const hasBio = lawyer.bio !== null && lawyer.bio.trim() !== ''

  return (
    <article className="pageShell">
      {/* Sayfanın tek h1'i ad; unvan üst etiket olarak veriliyor. */}
      <PageHeading eyebrow={lawyer.title} title={lawyer.fullName} />

      <div className={styles.layout}>
        {/* Fotoğrafı olmayan avukatta boş çerçeve çizilmiyor; ızgara tek sütuna düşüyor. */}
        {lawyer.photoPath !== null ? (
          <div className={styles.photoFrame}>
            <Image
              src={mediaUrl(lawyer.photoPath)}
              alt={lawyer.photoAlt ?? ''}
              fill
              sizes="(min-width: 768px) 320px, 100vw"
              className={styles.photo}
              priority
            />
          </div>
        ) : null}

        <div>
          {/* Boş alanlar hiç çizilmiyor: etiketi olup değeri olmayan satır,
              bilgi eksikliğini bilgiymiş gibi gösterir. */}
          {facts.length > 0 ? (
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div key={fact.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{fact.label}</dt>
                  <dd>
                    {fact.href !== undefined ? (
                      <a href={fact.href} className="textLink">{fact.value}</a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {/* Özgeçmiş metni panelde temizlenerek yazılıyor; renderableHtml basma anında
              bir kez daha temizler (gerekçe: src/lib/render-html.ts). */}
          {hasBio ? (
            <div className="prose" dangerouslySetInnerHTML={renderableHtml(lawyer.bio!)} />
          ) : null}
        </div>
      </div>
    </article>
  )
}
