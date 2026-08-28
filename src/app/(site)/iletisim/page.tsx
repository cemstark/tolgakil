import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { ContactForm } from '@/components/ContactForm'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import { SITE } from '@/content/site'
import { sendContactMessage } from './actions'
import styles from './page.module.css'

const ACIKLAMA = `${SITE.name} iletişim bilgileri: ${SITE.district} / ${SITE.city} adresi, telefon numaraları ve iletişim formu.`

export const metadata: Metadata = {
  title: 'İletişim',
  description: ACIKLAMA,
  alternates: { canonical: '/iletisim' },
  // openGraph/twitter olmadan bu sayfa paylaşıldığında kartta yalnız kök layout'un
  // başlığı — "Akil Hukuk Bürosu" — görünüyordu; alıcı hangi sayfanın gönderildiğini
  // anlamıyordu. siteName ve locale TEKRAR yazılmak zorunda: Next openGraph'ı kökle
  // derin birleştirmiyor, tümüyle değiştiriyor.
  openGraph: {
    siteName: SITE.name,
    locale: 'tr_TR',
    title: 'İletişim',
    description: ACIKLAMA,
    url: '/iletisim',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'İletişim', description: ACIKLAMA },
}

// Sabit SITE değil VERİTABANI okunuyor: iletişim bilgileri panelden değiştirilebilmeli ve
// bu sayfa onların asıl gösterildiği yer. SITE yalnız metadata'da kalıyor — orası derleme
// anında çalışıyor ve `generateMetadata`ya çevirmek sayfayı dinamikleştirirdi.
export default async function ContactPage() {
  const identity = await getPublicSiteIdentity()

  return (
    <article className={styles.page}>
      <div className={styles.split}>
        {/* SOL SÜTUN — başlık ve büro künyesi (devir tasarımı 6a: 5fr/7fr). Önceki düzende
            künye ile form eşit iki sütundu ve form alanları dar kalıyordu; formun daha
            geniş sütuna alınması alan genişliğini gerçekten kullanan tarafa veriyor. */}
        <div className={styles.aside}>
          <PageHeading eyebrow="Bize Ulaşın" title="İletişim" />

          <div className={styles.card}>
            <h2 className={styles.blockTitle}>Büro bilgileri</h2>
            {/* <address> tarayıcı varsayılanında italik; künye burada düz metin okunmalı. */}
            <address className={styles.address}>
              <span className={styles.addressLine}>{identity.address}</span>
              <a href={identity.phoneHref} className={styles.contactLink}>
                {identity.phone}
              </a>
              {identity.phoneSecondary !== null && identity.phoneSecondaryHref !== null ? (
                <a href={identity.phoneSecondaryHref} className={styles.contactLink}>
                  {identity.phoneSecondary}
                </a>
              ) : null}
              <a href={identity.emailHref} className={styles.contactLink}>
                {identity.email}
              </a>
            </address>

            {identity.whatsappHref !== null ? (
              <p className={styles.whatsapp}>
                {/* rel="noopener": target="_blank" ile açılan sayfa window.opener üzerinden
                    bu sekmeyi yönlendirebilir. noreferrer ayrıca gönderen adresi gizler. */}
                <a
                  href={identity.whatsappHref}
                  className={styles.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp ile yazın
                  {/* Yeni sekmede açıldığı ekran okuyucuya da söyleniyor; yalnız görsel bir
                      simge, bağlantının davranışını duyurmaz. */}
                  <span className={styles.visuallyHidden}> (yeni sekmede açılır)</span>
                </a>
              </p>
            ) : null}

            {identity.workingHours !== null ? (
              <div className={styles.hours}>
                <h2 className={styles.blockTitle}>Çalışma saatleri</h2>
                <p>{identity.workingHours}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* SAĞ SÜTUN — krem form kartı. data-surface="paper" yüzey sözleşmesini çeviriyor;
            ContactForm zaten o sözleşmeden okuyor (--surface/--text/--line/--field-border/
            --danger) ve krem zemindeki kontrastları ölçülmüş, yani kart rengini
            değiştirmek formun içinde hiçbir şeyi bozmuyor. */}
        <div data-surface="paper" className={styles.formCard}>
          <h2 className={styles.formTitle}>Mesaj gönderin</h2>
          <p className={styles.formNote}>
            Aşağıdaki formu doldurarak büromuza ulaşabilirsiniz. Formla iletilen mesajlar
            değerlendirilerek en kısa sürede dönüş yapılır.
          </p>
          <ContactForm action={sendContactMessage} />
        </div>
      </div>
    </article>
  )
}
