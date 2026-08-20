import Link from 'next/link'
import type { PublicPracticeAreaCard } from '@/db/queries/public/practice-areas'
import styles from './PracticeAreas.module.css'

type PracticeAreasProps = { areas: PublicPracticeAreaCard[] }

// Liste boşken bölüm KALDIRILMIYOR, boş durum yazılıyor: başlıklar kaybolunca ana sayfa
// yalnızca hero'dan ibaret kalıyor ve düzen bozuk görünüyor. Başlık her hâlükârda duruyor,
// altındaki ızgara yerine tek satırlık bir açıklama geliyor.
export function PracticeAreas({ areas }: PracticeAreasProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>Çalışma Alanları</h2>
        {areas.length === 0 ? (
          <p className={styles.empty}>Çalışma alanları yakında yayımlanacak.</p>
        ) : (
          <ul className={styles.grid}>
            {areas.map((area) => (
              <li key={area.slug}>
                <Link href={`/calisma-alanlari/${area.slug}`} className={`card ${styles.cardLayout}`}>
                  <h3 className={styles.cardTitle}>{area.name}</h3>
                  <p className={styles.cardSummary}>{area.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
