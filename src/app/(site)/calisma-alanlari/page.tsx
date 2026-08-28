import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { PageHeading } from '@/components/PageHeading'
import { PracticeAreaCard } from '@/components/PracticeAreaCard'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { TAGS } from '@/lib/cache-tags'
import { SITE } from '@/content/site'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Çalışma Alanları',
  description: `${SITE.name}, ${SITE.district} / ${SITE.city}’da gayrimenkul, icra ve iflas, iş, tazminat, sigorta, kira ve miras hukuku alanlarında çalışmaktadır.`,
  alternates: { canonical: '/calisma-alanlari' },
}

export default async function PracticeAreasPage() {
  // ÖNBELLEK SINIRI — kadro/page.tsx ile aynı kalıp: sayfa DB'den okuyor ve 'use cache'
  // olmadan derleme "uncached or runtime data during prerendering" ile düşüyor.
  'use cache'
  cacheTag(TAGS.practiceAreas)
  cacheLife('max')

  const areas = await listPublicPracticeAreas()

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Hizmet Alanları" title="Çalışma Alanları" />
      {/* Sayfanın giriş paragrafı. Daha önce başlıkla kart ızgarası arasında hiç metin
          yoktu; sayfayı arama sonucundan açan biri büronun nerede olduğunu göremiyordu.

          Cümle müşteri belgesinin (07.08.2026) anasayfa metninden alınmıştır, uydurulmuş
          bir tanıtım değil. Konum bilgisi yönetmeliğin yayımlanmasını beklediği büro
          adresidir; alan adlarıyla birleştirilmiş bir anahtar kelime kalıbı KURULMUYOR
          (spec §2.1) — hangi alanlarda çalışıldığını zaten aşağıdaki kartlar söylüyor. */}
      <p className={styles.lead}>
        {SITE.name}, {SITE.city} ili {SITE.district} ilçesinde faaliyet gösteren ve farklı
        hukuk alanlarında hukuki danışmanlık ve avukatlık hizmetleri sunan bir hukuk bürosudur.
      </p>
      {areas.length === 0 ? (
        <p className={styles.empty}>Çalışma alanları yakında yayımlanacak.</p>
      ) : (
        <ul className={styles.grid}>
          {areas.map((area) => (
            <li key={area.slug}>
              <PracticeAreaCard area={area} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
