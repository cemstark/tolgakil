import Link from 'next/link'
import type { PracticeArea } from '@/content/sample-content'
import styles from './PracticeAreas.module.css'

type PracticeAreasProps = { areas: PracticeArea[] }

export function PracticeAreas({ areas }: PracticeAreasProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>Çalışma Alanları</h2>
        <ul className={styles.grid}>
          {areas.map((area) => (
            <li key={area.slug}>
              <Link href={`/calisma-alanlari/${area.slug}`} className={styles.card}>
                <h3 className={styles.cardTitle}>{area.name}</h3>
                <p className={styles.cardSummary}>{area.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
