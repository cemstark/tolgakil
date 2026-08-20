import Link from 'next/link'
import Image from 'next/image'
import type { PublicLawyerCard } from '@/db/queries/public/lawyers'
import { mediaUrl } from '@/lib/media-url'
import styles from './LawyerCard.module.css'

type LawyerCardProps = { lawyer: PublicLawyerCard }

// Ad BAŞLIK ETİKETİYLE yazılmıyor. Kart iki farklı bağlamda kullanılıyor: ana sayfada
// <h2>Kadro</h2> altında (h3 doğru olurdu), /kadro sayfasında <h1>Kadro</h1> altında
// (orada h3 bir seviye atlardı). Sabit bir seviye ikisinde birden doğru olamayacağı için
// gezinme yükü <ul>/<li> liste yapısına bırakıldı; bağlantı metni zaten avukatın adı.
export function LawyerCard({ lawyer }: LawyerCardProps) {
  return (
    <Link href={`/kadro/${lawyer.slug}`} className={`card ${styles.card}`}>
      {lawyer.photoPath !== null ? (
        <span className={styles.photoFrame}>
          <Image
            // alt metni medya kitaplığından geliyor (media.alt_text NOT NULL, panelde
            // zorunlu alan). photoAlt yalnız fotoğraf hiç yokken null olabilir ve o
            // durumda bu dal zaten çizilmiyor; ?? '' tip daraltmasının gereği.
            src={mediaUrl(lawyer.photoPath)}
            alt={lawyer.photoAlt ?? ''}
            fill
            sizes="(min-width: 768px) 360px, 100vw"
            className={styles.photo}
          />
        </span>
      ) : null}
      <span className={styles.name}>{lawyer.fullName}</span>
      <span className={styles.title}>{lawyer.title}</span>
    </Link>
  )
}
