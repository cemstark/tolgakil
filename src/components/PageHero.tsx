import Image from 'next/image'
import styles from './PageHero.module.css'

type PageHeroProps = {
  /** Görselin adresi. Yalnız `src` isteniyor çünkü bant `fill` ile çiziliyor; ölçü
      CSS'ten geliyor. Böylece hem statik stok görseller (practice-area-images.ts) hem
      panelden yüklenmiş kapaklar (mediaUrl) aynı bileşene verilebiliyor. */
  src: string
  eyebrow: string
  title: string
  lead?: string
  /** Devir tasarımının verdiği üç yükseklik: alan detayı 520, hakkımızda 560, makale 440. */
  boy?: 'kisa' | 'orta' | 'uzun'
}

// İç sayfaların sinematik başlık bandı (devir tasarımı 5b).
//
// Ana sayfanın <Hero />'sundan AYRI bir bileşen: orada başlığın yanında ikinci bir sütun
// (özet + telefon + WhatsApp) ve veri okuması var; burada tek sütun ve saf sunum. İkisini
// tek bileşende birleştirmek, kullanılmayan prop'larla dolu bir imza üretirdi.
//
// Sayfanın tek <h1>'i buradan geliyor — PageHeading ile aynı sözleşme. Görselli sayfalar
// bunu, görselsizler PageHeading'i kullanır.
export function PageHero({ src, eyebrow, title, lead, boy = 'orta' }: PageHeroProps) {
  return (
    <header className={`${styles.hero} ${styles[boy]}`}>
      {/* Dekoratif: alan görseli metnin söylemediği bir şey söylemiyor, kaş ve başlık
          sayfanın ne olduğunu zaten yazıyor. Bu yüzden alt="" ve aria-hidden.

          `priority` yerine loading/fetchPriority: Next 16'da priority prop'u preload
          lehine bırakıldı ve belge ikisinin BİRLİKTE kullanılmamasını söylüyor. Bu görsel
          ilk ekranda ve LCP adayı. */}
      <div className={styles.media} aria-hidden="true">
        <Image src={src} alt="" fill sizes="100vw" loading="eager" fetchPriority="high" />
      </div>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {lead !== undefined ? <p className={styles.lead}>{lead}</p> : null}
      </div>
    </header>
  )
}
