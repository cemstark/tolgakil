import { cacheLife, cacheTag } from 'next/cache'
import { getSettings } from '@/db/queries/settings'
import { TAGS } from '@/lib/cache-tags'
import { telHref, whatsappHref } from '@/lib/contact-links'

export type PublicSiteIdentity = {
  officeName: string
  address: string
  phone: string
  phoneHref: string
  email: string
  emailHref: string
  whatsappHref: string | null
  footerText: string | null
}

// SQL YOK: sözleşme §3.5 gereği tek ayar sorgusu getSettings()'te kalıyor. Bu modül onun
// önbellek kabuğu ve halka açık izdüşümü. Kabuk şart, çünkü başlık/alt bilgi her sayfada
// çiziliyor: önbelleklenmemiş bir okuma sitenin tamamını dinamikleştirirdi. Suspense
// alternatif değil — spec §11 telefonun JavaScript'siz HTML'de bulunmasını istiyor.
//
// Bu dosya `queries/public/` altındaki 'use cache' taşıyan TEK modül: kardeşleri Vitest
// altında koşuyor ve cacheTag() istek bağlamı olmadan fırlatıyor. Buranın testi yok,
// çünkü ölçtüğü tek şey getSettings()'in alan adlarını yeniden yazması olurdu.
//
// cacheLife('max') + cacheTag: panelin ayar kaydı updateTag(TAGS.settings) çağırıyor
// (src/app/panel/ayarlar/actions.ts), yani süre değil OLAY tazeliyor.
//
// Hata YUTULMUYOR: getSettings() satır yoksa fırlatır ve fırlatma buradan geçer.
export async function getPublicSiteIdentity(): Promise<PublicSiteIdentity> {
  'use cache'
  cacheTag(TAGS.settings)
  cacheLife('max')

  const s = await getSettings()
  const whatsapp = s.whatsapp === null || s.whatsapp.trim() === '' ? null : s.whatsapp

  return {
    officeName: s.officeName,
    address: s.address,
    phone: s.phone,
    phoneHref: telHref(s.phone),
    email: s.email,
    emailHref: `mailto:${s.email}`,
    whatsappHref: whatsapp === null ? null : whatsappHref(whatsapp),
    footerText: s.footerText,
  }
}
