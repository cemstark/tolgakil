import Image from 'next/image'
import { SITE } from '@/content/site'
import { HERO_IMAGE } from '@/content/practice-area-images'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import styles from './Hero.module.css'

// async sunucu bileşeni: prop imzası (<Hero />) değişmeden veriye bağlanmanın tek yolu bu.
// Kurulu @types/react 19 bunu destekliyor (JSXElementConstructor: `(props: P): ReactNode |
// Promise<ReactNode>`), yani ayrıca bir tip hilesi gerekmiyor.
//
// SİNEMATİK DÜZEN (devir tasarımı 5b) — önceki hâl iki sütunluydu: solda metin, sağda
// çerçeveli dikey bir görsel. Yeni düzende görsel ARKA PLANA geçti, metin onun üstünde
// duruyor ve gezinme hapı hero'nun üstünde yüzüyor. Kazanç ölçülebilir: eski düzende
// çalışma alanları ilk ekrana hiç girmiyordu, çünkü hero ekranın tamamını metin + dikey
// fotoğrafla dolduruyordu.
//
// Tanıtım metni veritabanında karşılığı olmayan sabit metindir; TBB reklam yasağına uygun
// (iddia, üstünlük ve başarı ifadesi içermez) ve `settings` tablosunda böyle bir alan yok.
//
// KAŞTA ŞEHİR/İLÇE, büro adı DEĞİL: büro adı zaten gezinme hapında yazılı ve hemen
// üstünde duruyor — iki kez yazmak ilk ekranın en değerli satırını harcıyordu. Konum ise
// yönetmeliğin açıkça yayımlanabilir saydığı bilgi (spec §2.1) ve site sahibinin görünür
// olmasını istediği şey. Değer SITE'den geliyor, ayarlardan değil: `settings` tablosunda
// şehir ve ilçe AYRI sütunlar değil, tek bir `address` dizesinin içinde — oradan ayrıştırmak
// virgül saymak olurdu.
export async function Hero() {
  const { phone, phoneHref, whatsappHref } = await getPublicSiteIdentity()

  return (
    <section className={styles.hero}>
      {/* Dekoratif görsel; içerik taşımadığı için erişilebilirlik ağacından çıkarılıyor.
          Adalet heykeli sayfanın söylemediği hiçbir şeyi söylemiyor — h1 ve altındaki
          paragraf büronun ne yaptığını zaten yazıyor.

          `priority` KULLANILMIYOR: Next 16'da o prop `preload` lehine bırakıldı
          (node_modules/next/dist/docs/.../image.md, "priority" başlığı). Belge ikisi
          yerine `loading="eager"` + `fetchPriority="high"` öneriyor ve `preload`u bu
          ikisiyle BİRLİKTE kullanmamayı söylüyor. Hero ilk ekranda ve LCP adayı olduğu
          için ikisi seçildi, preload yazılmadı.

          sizes="100vw": görsel artık sütun değil, hero'nun tamamını kaplıyor. */}
      <div className={styles.media} aria-hidden="true">
        <Image
          src={HERO_IMAGE.src}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            {SITE.city} / {SITE.district}
          </p>
          <h1 className={styles.title}>Hukuki çözüm süreçlerinizde yanınızdayız</h1>
        </div>
        <div className={styles.aside}>
          <p className={styles.lead}>
            Gayrimenkul başta olmak üzere yedi alanda avukatlık ve hukuki danışmanlık.
          </p>
          {/* Telefon ve WhatsApp doğrudan hero'da: sitenin tek işi ziyaretçiyi büroyla
              temasa geçirmek ve bu iki bağlantı eskiden yalnız alt bilgide ve /iletisim
              sayfasındaydı. Numara ayarlardan geliyor — panelden değişince burası da
              değişir, elle yazılmış bir numara ikinci bir gerçek kaynağı olurdu.

              WhatsApp KOŞULLU: `whatsappHref` panelde alan boşaltıldığında null döner
              (getPublicSiteIdentity boş dizeyi null'a indirgiyor) ve o durumda düğme hiç
              çizilmiyor — hedefi olmayan bir düğme göstermektense hiç göstermemek doğrusu. */}
          <div className={styles.actions}>
            <a href={phoneHref} className={styles.pillFilled}>
              {phone}
            </a>
            {whatsappHref !== null ? (
              <a
                href={whatsappHref}
                className={styles.pillOutline}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
