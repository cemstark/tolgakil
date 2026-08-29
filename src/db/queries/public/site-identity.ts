import { cacheLife, cacheTag } from 'next/cache'
import { getSettings } from '@/db/queries/settings'
import { TAGS } from '@/lib/cache-tags'
import { directionsHref, telHref, whatsappHref } from '@/lib/contact-links'

export type PublicSiteIdentity = {
  officeName: string
  address: string
  phone: string
  phoneHref: string
  // İkinci numara ve çalışma saatleri isteğe bağlı: ayarlarda boş bırakılabilirler ve
  // boşken ekranda hiç çizilmiyorlar (null, boş dize DEĞİL — "değer yok" ile "boş metin"
  // ayrımı çağıran tarafta koşul yazmayı gerektirmesin).
  phoneSecondary: string | null
  phoneSecondaryHref: string | null
  workingHours: string | null
  email: string
  emailHref: string
  whatsappHref: string | null
  footerText: string | null
  /**
   * Yol tarifi bağlantısı. Koordinat ayarlarda girilmişse ona, girilmemişse ADRESE göre
   * kuruluyor — yani her zaman bir değer var ve /iletisim'deki düğme hiçbir durumda
   * kırık kalmıyor. Kurulumu lib/contact-links.ts'te; burada yalnız hazır dize taşınıyor
   * ki çağıran sayfa koordinat biçimlendirmesiyle uğraşmasın.
   */
  directionsHref: string
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
  // Boş dize ile null aynı şeye indirgeniyor: panelde temizlenen bir alan '' olarak
  // kaydediliyor ve o hâliyle "değer var" gibi görünüp ekranda boş bir bağlantı çizerdi.
  const bosVeyaNull = (value: string | null) => (value === null || value.trim() === '' ? null : value)
  const whatsapp = bosVeyaNull(s.whatsapp)
  const phoneSecondary = bosVeyaNull(s.phoneSecondary)

  return {
    officeName: s.officeName,
    address: s.address,
    phone: s.phone,
    phoneHref: telHref(s.phone),
    phoneSecondary,
    phoneSecondaryHref: phoneSecondary === null ? null : telHref(phoneSecondary),
    workingHours: bosVeyaNull(s.workingHours),
    email: s.email,
    emailHref: `mailto:${s.email}`,
    whatsappHref: whatsapp === null ? null : whatsappHref(whatsapp),
    footerText: s.footerText,
    directionsHref: directionsHref(s.address, bosVeyaNull(s.mapLat), bosVeyaNull(s.mapLng)),
  }
}
