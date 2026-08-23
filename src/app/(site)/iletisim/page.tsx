import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { ContactForm } from '@/components/ContactForm'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import { SITE } from '@/content/site'
import { sendContactMessage } from './actions'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'İletişim',
  description: `${SITE.name} iletişim bilgileri: ${SITE.district} / ${SITE.city} adresi, telefon numaraları ve iletişim formu.`,
  alternates: { canonical: '/iletisim' },
}

// Sabit SITE değil VERİTABANI okunuyor: iletişim bilgileri panelden değiştirilebilmeli ve
// bu sayfa onların asıl gösterildiği yer. SITE yalnız metadata'da kalıyor — orası derleme
// anında çalışıyor ve `generateMetadata`ya çevirmek sayfayı dinamikleştirirdi.
export default async function ContactPage() {
  const identity = await getPublicSiteIdentity()

  return (
    <article className="pageShell">
      <PageHeading eyebrow="Bize Ulaşın" title="İletişim" />

      <div className={styles.layout}>
        <div>
          <h2 className={styles.blockTitle}>Büro bilgileri</h2>
          <address className={styles.address}>
            {identity.address}
            <br />
            <a href={identity.phoneHref} className="textLink">{identity.phone}</a>
            {identity.phoneSecondary !== null && identity.phoneSecondaryHref !== null ? (
              <>
                <br />
                <a href={identity.phoneSecondaryHref} className="textLink">{identity.phoneSecondary}</a>
              </>
            ) : null}
            <br />
            <a href={identity.emailHref} className="textLink">{identity.email}</a>
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

        <div>
          <h2 className={styles.blockTitle}>Mesaj gönderin</h2>
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
