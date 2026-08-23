import Link from 'next/link'
import { CTA_LINK } from '@/lib/navigation'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import styles from './Hero.module.css'

// async sunucu bileşeni: prop imzası (<Hero />) değişmeden veriye bağlanmanın tek yolu bu.
// Kurulu @types/react 19 bunu destekliyor (JSXElementConstructor: `(props: P): ReactNode |
// Promise<ReactNode>`), yani ayrıca bir tip hilesi gerekmiyor.
//
// Tanıtım metni (h1 ve lead) veritabanında karşılığı olmayan sabit metindir; TBB reklam
// yasağına uygun (iddia, üstünlük ve başarı ifadesi içermez) ve `settings` tablosunda
// böyle bir alan yok. Yalnız büro adı veriden geliyor.
//
// Metin müşterinin teslim ettiği belgeden: başlık belgenin anasayfa başlığı, alt metin ise
// oradaki tanıtım cümlesi. Şehir ve ilçe ilk ekranda GEÇİYOR — site Samsun'da aranacak ve
// h1'in hemen altındaki ilk paragraf, arama motorunun konumu ilişkilendirdiği yer.
export async function Hero() {
  const { officeName } = await getPublicSiteIdentity()

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{officeName}</p>
          <h1 className={styles.title}>
            Hukuki çözüm süreçlerinizde
            <br />
            yanınızdayız
          </h1>
          <p className={styles.lead}>
            Samsun ili İlkadım ilçesinde faaliyet gösteren büromuz; gayrimenkul hukuku başta olmak
            üzere icra ve iflas, iş, tazminat, sigorta, kira ve miras hukuku alanlarında avukatlık
            ve hukuki danışmanlık hizmeti sunmaktadır.
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
        {/* Dekoratif zemin; içerik taşımadığı için erişilebilirlik ağacından çıkarılıyor. */}
        <div className={styles.visual} aria-hidden="true" />
      </div>
    </section>
  )
}
