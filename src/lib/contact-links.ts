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

// wa.me ARTI İŞARETİ KABUL ETMEZ; ülke koduyla başlayan salt rakam bekler.
export function whatsappHref(number: string): string {
  return `https://wa.me/${dialable(number).replace(/^\+/, '')}`
}
