import Link from 'next/link'
import type { PublicPracticeAreaCard } from '@/db/queries/public/practice-areas'
import styles from './PracticeAreaCard.module.css'

type PracticeAreaCardProps = { area: PublicPracticeAreaCard }

// Başlık etiketi kullanılmıyor: kart hem ana sayfada <h2> altında hem /calisma-alanlari
// sayfasında <h1> altında çiziliyor, sabit bir seviye ikisinde birden doğru olamaz
// (LawyerCard ile aynı gerekçe). Gezinme yükü <ul>/<li> yapısında.
export function PracticeAreaCard({ area }: PracticeAreaCardProps) {
  return (
    <Link href={`/calisma-alanlari/${area.slug}`} className={`card ${styles.card}`}>
      <span className={styles.name}>{area.name}</span>
      <span className={styles.summary}>{area.summary}</span>
    </Link>
  )
}
