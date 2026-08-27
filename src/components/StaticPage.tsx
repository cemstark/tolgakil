import Image from 'next/image'
import { ContentCredit } from '@/components/ContentCredit'
import { PageHeading } from '@/components/PageHeading'
import type { StokGorsel } from '@/content/practice-area-images'
import { renderableHtml } from '@/lib/render-html'
import styles from './StaticPage.module.css'

type StaticPageProps = {
  eyebrow: string
  title: string
  content: string
  /**
   * Başlık ile gövde arasına konacak dekoratif şerit. İsteğe bağlı ve yalnız
   * /hakkimizda veriyor: /kvkk ile /cerez-politikasi hukuki metin sayfaları, oralarda
   * dekoratif fotoğraf hem yersiz durur hem okuma niyetiyle gelen kişiyi oyalar.
   */
  image?: StokGorsel
  /**
   * Metnin altına "Av. Tolga Akil tarafından hazırlanmış ve onaylanmıştır" künyesini koyar.
   * Yalnız /hakkimizda veriyor: o sayfanın metni müvekkil belgesinden geliyor ve avukat
   * onaylı. /kvkk ile /cerez-politikasi belgeden gelmediği için 07.08.2026 tarihi onlarda
   * yanlış olurdu — güncelleme tarihleri kendi metinlerinin içinde yazılı.
   */
  credit?: boolean
}

// /hakkimizda, /kvkk ve /cerez-politikasi aynı desendir: başlık + tek gövde metni.
// Üçü de bu bileşeni kullanır; hukuki metinlerin sunumu tek yerde değişsin.
//
// Gövde HTML'i panelde temizlenerek yazılıyor, renderableHtml basma anında bir kez daha
// temizler (gerekçe: src/lib/render-html.ts). Metnin KENDİSİ bu kodda YAZILMAZ — KVKK
// aydınlatma metni ve çerez politikası hukuki belgedir, büro panelden girer (sözleşme §3.6).
export function StaticPage({ eyebrow, title, content, image, credit = false }: StaticPageProps) {
  return (
    <article className="pageShell">
      <PageHeading eyebrow={eyebrow} title={title} />
      {image && (
        <div className={`${styles.media} mediaFrame`}>
          <Image
            src={image.src}
            alt=""
            fill
            sizes="(min-width: 1200px) 1200px, 100vw"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      )}
      <div className="prose" dangerouslySetInnerHTML={renderableHtml(content)} />
      {credit && <ContentCredit />}
    </article>
  )
}
