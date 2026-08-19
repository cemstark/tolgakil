import Link from 'next/link'
import type { LawyerSummary } from '@/content/sample-content'
import styles from './TeamStrip.module.css'

type TeamStripProps = { lawyers: LawyerSummary[] }

// Fotoğraf yok: Plan 2'de gerçek kadro verisiyle birlikte gelecek.
export function TeamStrip({ lawyers }: TeamStripProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>Kadro</h2>
        <ul className={styles.grid}>
          {lawyers.map((lawyer) => (
            <li key={lawyer.slug}>
              <Link href={`/kadro/${lawyer.slug}`} className={`card ${styles.cardLayout}`}>
                <h3 className={styles.name}>{lawyer.name}</h3>
                <p className={styles.title}>{lawyer.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
