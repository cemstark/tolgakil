import { PageHeading } from '@/components/PageHeading'
import { renderableHtml } from '@/lib/render-html'

type StaticPageProps = {
  eyebrow: string
  title: string
  content: string
}

// /kvkk ve /cerez-politikasi aynı desendir: başlık + tek gövde metni. İkisi de bu
// bileşeni kullanır; hukuki metinlerin sunumu tek yerde değişsin.
//
// `image` ve `credit` PROP'LARI KALDIRILDI (masaüstü 6a turu): ikisini de yalnız
// /hakkimizda veriyordu, o sayfa ise artık kendi sinematik bandını (PageHero) ve künyesini
// doğrudan çiziyor. Geriye kalan iki çağıranın ikisi de bu prop'ları hiç kullanmıyordu,
// dolayısıyla burada tutulmaları ölü koddu.
//
// Gövde HTML'i panelde temizlenerek yazılıyor, renderableHtml basma anında bir kez daha
// temizler (gerekçe: src/lib/render-html.ts). Metnin KENDİSİ bu kodda YAZILMAZ — KVKK
// aydınlatma metni ve çerez politikası hukuki belgedir, büro panelden girer (sözleşme §3.6).
export function StaticPage({ eyebrow, title, content }: StaticPageProps) {
  return (
    <article className="pageShell">
      <PageHeading eyebrow={eyebrow} title={title} />
      <div className="prose" dangerouslySetInnerHTML={renderableHtml(content)} />
    </article>
  )
}
