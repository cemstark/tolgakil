import Link from 'next/link'
import { CTA_LINK } from '@/lib/navigation'
import { SITE } from '@/content/site'
import styles from './Hero.module.css'

// Statik tanıtım metni; Plan 2'ye kadar `settings` tablosu yok, sabit içerik yeterli.
export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{SITE.name}</p>
          <h1 className={styles.title}>
            Hukuki süreçlerde
            <br />
            yanınızdayız
          </h1>
          <p className={styles.lead}>
            Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık hizmeti sunuyoruz.
          </p>
          <div className={styles.actions}>
            <Link href={CTA_LINK.href} className={styles.pillFilled}>
              {CTA_LINK.label}
            </Link>
            <Link href="/calisma-alanlari" className={styles.pillOutline}>
              Çalışma alanlarını görün
            </Link>
          </div>
        </div>
        {/* Gerçek fotoğraf Plan 2'de gelecek; şimdilik token zeminli yer tutucu. */}
        <div className={styles.visual} aria-hidden="true" />
      </div>
    </section>
  )
}
