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
