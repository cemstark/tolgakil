import Link from 'next/link'
import type { PublicLawyerCard } from '@/db/queries/public/lawyers'
import styles from './TeamStrip.module.css'

type TeamStripProps = { lawyers: PublicLawyerCard[] }

// Fotoğraf Görev 5'te ortak LawyerCard bileşeniyle geliyor; bu görev yalnız veri kaynağını
// değiştiriyor, işaretlemeyi değil.
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
                <Link href={`/kadro/${lawyer.slug}`} className={`card ${styles.cardLayout}`}>
                  <h3 className={styles.name}>{lawyer.fullName}</h3>
                  <p className={styles.title}>{lawyer.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
