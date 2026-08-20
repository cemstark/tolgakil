import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound } from 'next/navigation'
import { PageHeading } from '@/components/PageHeading'
import {
  getPublicPracticeAreaBySlug,
  listPublicPracticeAreas,
} from '@/db/queries/public/practice-areas'
import { renderableHtml } from '@/lib/render-html'
import { TAGS } from '@/lib/cache-tags'
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

  // Açıklama alanın kendi özetinden geliyor; övgü sıfatı ya da şehir + hukuk dalı
  // kalıbı eklenmiyor (spec §2.1 anahtar kelime sınırı).
  return { title: area.name, description: area.summary }
}

export default async function PracticeAreaPage({ params }: AreaPageProps) {
  // ÖNBELLEK SINIRI + notFound() KURALI (kadro/[slug]/page.tsx ile bağlayıcı): sorgu
  // 'use cache' olmadan derleme düşer. notFound() bu sınırın İÇİNDE ama herhangi bir
  // <Suspense> sınırının DIŞINDA çağrılıyor; Suspense içine taşınmış hâli üretim
  // derlemesinde 200 döndürüyordu (Görev 5'te ölçüldü). Varlık denetimi bu yüzden akan bir
  // çocuğa değil, doğrudan sayfa gövdesine yazılıyor.
  'use cache'
  cacheTag(TAGS.practiceAreas)
  cacheLife('max')

  const { slug } = await params
  const area = await getPublicPracticeAreaBySlug(slug)
  if (area === null) notFound()

  const hasContent = area.content !== null && area.content.trim() !== ''

  return (
    <article className="pageShell">
      <PageHeading eyebrow="Çalışma Alanı" title={area.name} />
      <p className={styles.lead}>{area.summary}</p>
      {/* Ayrıntı metni girilmemiş alanda yalnız özet kalır; boş bir .prose kabı çizilmez. */}
      {hasContent ? (
        <div className="prose" dangerouslySetInnerHTML={renderableHtml(area.content!)} />
      ) : null}
    </article>
  )
}
