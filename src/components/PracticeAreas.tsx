import Link from 'next/link'
import type { PublicPracticeAreaCard } from '@/db/queries/public/practice-areas'
import { PracticeAreaCard } from '@/components/PracticeAreaCard'
import styles from './PracticeAreas.module.css'

type PracticeAreasProps = { areas: PublicPracticeAreaCard[] }

// Ana sayfada kaç alanın GÖRSELLİ kart olarak çizileceği. Devir tasarımı (5b) üç kart +
// kalanların pili gösteriyor: yedi eşit kart ana sayfayı tek başına dolduruyor ve
// altındaki makale bölümünü ekranın çok aşağısına itiyordu. Üçü öne çıkıyor, geri kalanı
// tek satırlık pil listesi olarak yine ERİŞİLEBİLİR kalıyor — hiçbir alan gizlenmiyor.
const FEATURED_COUNT = 3

// Liste boşken bölüm KALDIRILMIYOR, boş durum yazılıyor: başlıklar kaybolunca ana sayfa
// yalnızca hero'dan ibaret kalıyor ve düzen bozuk görünüyor. Başlık her hâlükârda duruyor,
// altındaki ızgara yerine tek satırlık bir açıklama geliyor.
export function PracticeAreas({ areas }: PracticeAreasProps) {
  const featured = areas.slice(0, FEATURED_COUNT)
  const rest = areas.slice(FEATURED_COUNT)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* `reveal` ve `stagger` globals.css'te tanımlı küresel sınıflar (CSS modülü değil):
            kaydırmaya bağlı giriş animasyonunu açarlar. Çalışma anında JavaScript
            gerektirmezler — `animation-timeline: view()` kullanıyorlar, bu yüzden bu
            bileşenin sunucu bileşeni kalması bozulmuyor. Desteklemeyen tarayıcıda ve
            azaltılmış hareket tercihinde içerik doğrudan görünür. */}
        <div className={`${styles.header} reveal`}>
          <h2>Çalışma alanları</h2>
          {/* Sayı RAKAMLA ve veriden: metinde "Yedi" yazsaydı panelden sekizinci alan
              eklendiği gün başlık sessizce yalan söylerdi. Alan yoksa satır hiç çizilmiyor. */}
          {areas.length > 0 ? (
            <p className={styles.note}>{areas.length} başlıkta avukatlık ve danışmanlık</p>
          ) : null}
        </div>
        {areas.length === 0 ? (
          <p className={styles.empty}>Çalışma alanları yakında yayımlanacak.</p>
        ) : (
          <>
            <ul className={`${styles.grid} stagger`}>
              {featured.map((area) => (
                <li key={area.slug}>
                  <PracticeAreaCard area={area} />
                </li>
              ))}
            </ul>
            {/* Kalan alanlar pil olarak. Ayrı bir <ul>: ızgaranın devamı değil, farklı bir
                sunum — ekran okuyucuya da iki ayrı liste olarak duyurulması doğru.
                rest boşsa (üç veya daha az alan varsa) blok hiç çizilmiyor. */}
            {rest.length > 0 ? (
              <ul className={styles.pills}>
                {rest.map((area) => (
                  <li key={area.slug}>
                    <Link href={`/calisma-alanlari/${area.slug}`} className={styles.pill}>
                      {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
