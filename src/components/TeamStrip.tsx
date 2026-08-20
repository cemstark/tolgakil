import type { PublicLawyerCard } from '@/db/queries/public/lawyers'
import { LawyerCard } from '@/components/LawyerCard'
import styles from './TeamStrip.module.css'

type TeamStripProps = { lawyers: PublicLawyerCard[] }

export function TeamStrip({ lawyers }: TeamStripProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>Kadro</h2>
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
    </section>
  )
}
