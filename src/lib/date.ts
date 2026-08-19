// tr-TR sunucuda biçimlendirilir; ISO tarih istemciye ham taşınmaz. timeZone 'UTC' sabitlenir:
// new Date('YYYY-MM-DD') UTC gece yarısı olarak ayrıştırılır, negatif ofsetli bir sunucuda
// bu sabitleme olmadan görünen tarih bir gün geriye kayıp dateTime özniteliğiyle çelişirdi.
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
})

// Veritabanı oturumu UTC'ye sabitli (src/db/client.ts) ve öyle KALIYOR — saklama dilimi
// değişmedi, yalnız gösterim değişti. UTC basmak panelde somut bir hataya yol açıyordu:
// büro saatiyle 14:05'te kaydeden editör, listede güncellenme saatini 11:05 görüyor ve
// kaydının işlenmediğini sanıyordu.
//
// Dilim sabit yazılıyor, sunucununkine bırakılmıyor: geliştirme +03, testler
// America/New_York, üretim Hostinger'da bilinmiyor. Büro İstanbul'da, okuyan da orada.
const WITH_TIME = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Istanbul',
})

export function formatDate(iso: string): string {
  return DAY_MONTH_YEAR.format(new Date(iso))
}

export function formatDateTime(value: Date): string {
  return WITH_TIME.format(value)
}
