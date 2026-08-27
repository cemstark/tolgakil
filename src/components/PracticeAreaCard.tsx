import Image from 'next/image'
import Link from 'next/link'
import { practiceAreaImage } from '@/content/practice-area-images'
import type { PublicPracticeAreaCard } from '@/db/queries/public/practice-areas'
import styles from './PracticeAreaCard.module.css'

type PracticeAreaCardProps = { area: PublicPracticeAreaCard }

// Başlık etiketi kullanılmıyor: kart hem ana sayfada <h2> altında hem /calisma-alanlari
// sayfasında <h1> altında çiziliyor, sabit bir seviye ikisinde birden doğru olamaz
// (LawyerCard ile aynı gerekçe). Gezinme yükü <ul>/<li> yapısında.
export function PracticeAreaCard({ area }: PracticeAreaCardProps) {
  const gorsel = practiceAreaImage(area.slug)

  return (
    <Link href={`/calisma-alanlari/${area.slug}`} className={`card ${styles.card}`}>
      {/* Görseli olmayan alan için blok HİÇ çizilmiyor. Panelden yeni bir çalışma alanı
          eklendiğinde eşlemede karşılığı olmaz; kırık bir görsel kutusu göstermektense
          kartı yalnız metinle çizmek doğrusu. Eşlemenin tohumla uyumu ayrıca test
          altında (practice-area-images.test.ts). */}
      {gorsel && (
        <span className={`${styles.media} mediaFrame`}>
          <Image
            src={gorsel.src}
            alt=""
            fill
            /* Izgara PracticeAreas.module.css'te iki kırılma noktasıyla çalışıyor: 560px'te
               iki sütun, 1024px'te üç.

               387px SABİTİ YALNIZ ≥1200px'te doğru: orada kapsayıcı `--max` ile 1200px'e
               oturuyor ve kart (1200 − 2×20px gap) ÷ 3 ≈ 387px oluyor. 1024–1199 arasında
               kapsayıcı daha dar (1024px'te `--pad` 2×40px düşünce 944px) ve kart ~301px'e
               iniyor; o aralık için ayrı bir adım yazılmasa tarayıcı gereğinden büyük
               varyant indirirdi. 30vw, 1024px'te 307px veriyor — gerçek genişliğin hemen
               üstünde, yani güvenli yönde yanılıyor (küçük beyan bulanık görsel demek
               olurdu, büyük beyan yalnız birkaç fazla kilobayt). */
            sizes="(min-width: 1200px) 387px, (min-width: 1024px) 30vw, (min-width: 560px) 50vw, 100vw"
          />
        </span>
      )}
      <span className={styles.name}>{area.name}</span>
      <span className={styles.summary}>{area.summary}</span>
    </Link>
  )
}
