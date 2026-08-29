// tel: ve wa.me adresleri yalnız rakam (ve tel: için baştaki +) taşıyabilir. Ayarlardaki
// telefon insan için biçimli giriliyor; iki biçimi ayıran tek yer burası olsun diye
// dönüştürme sabitler dosyasında değil, kendi modülünde ve testli duruyor.
function dialable(value: string): string {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

export function telHref(phone: string): string {
  return `tel:${dialable(phone)}`
}

/**
 * Türkiye ülke kodu. Site tek bir ülkeye hizmet veriyor (tr locale, TBB mevzuatı, KVKK);
 * ulusal biçimde girilmiş bir numarayı uluslararası biçime çevirmek için gereken tek sabit.
 */
const TR_ULKE_KODU = '90'

/**
 * wa.me ARTI İŞARETİ KABUL ETMEZ; ülke koduyla başlayan salt rakam bekler.
 *
 * Baştaki `0` ülke koduyla DEĞİŞTİRİLİYOR. Bu olmadan panelde ulusal biçimde girilen bir
 * numara (`0541 643 50 55`) `wa.me/05416435055` üretiyordu ve WhatsApp bunu "The phone
 * number shared via link is incorrect" diye reddediyordu — bağlantı ilk günden çalışmıyordu,
 * denetimde yakalandı. Testin gözden kaçırma sebebi tek örneğinin zaten uluslararası biçimde
 * (`+90 532 …`) olmasıydı.
 *
 * Zaten ülke koduyla başlayan numaralara dokunulmuyor: `+90…` ve `90…` olduğu gibi geçer.
 */
export function whatsappHref(number: string): string {
  const rakamlar = dialable(number).replace(/^\+/, '')
  const uluslararasi = rakamlar.startsWith('0') ? `${TR_ULKE_KODU}${rakamlar.slice(1)}` : rakamlar
  return `https://wa.me/${uluslararasi}`
}

/**
 * Harita uygulamasında yol tarifi açan adres.
 *
 * Koordinat VARSA ona göre kuruluyor: adres dizesi arama motoruna bırakıldığında
 * "İstiklal Cad." gibi birden çok şehirde bulunan bir sokak yanlış ile eşleşebiliyor,
 * koordinat ise tek bir noktayı gösteriyor. Koordinat yoksa adres metnine düşülüyor —
 * ayarlarda enlem/boylam boş bırakılabilir (isteğe bağlı alanlar) ve o durumda düğmenin
 * hiç çizilmemesi yerine yaklaşık da olsa çalışması yeğleniyor.
 *
 * `google.com/maps` uçları resmî ve parametreleri belgeli (`api=1`); uygulama yüklüyse
 * mobil işletim sistemi bağlantıyı ona devrediyor, değilse tarayıcıda açılıyor. Her iki
 * dalda da değer encodeURIComponent'ten geçiyor: adres panelden geliyor, yani serbest
 * metin.
 */
export function directionsHref(
  address: string,
  mapLat: string | null,
  mapLng: string | null,
): string {
  if (mapLat !== null && mapLng !== null) {
    const hedef = encodeURIComponent(`${mapLat},${mapLng}`)
    return `https://www.google.com/maps/dir/?api=1&destination=${hedef}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
