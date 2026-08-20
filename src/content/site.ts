// Son çare sabitleri. Ayarlar artık veritabanından geliyor (getPublicSiteIdentity); burada
// yalnız veri ÇEKİLEMEYEN yerler kaldı:
//   1) kök layout metadata'sı — spec §11 kök layout'ta veri çekmeyi yasaklıyor,
//   2) (site)/error.tsx ve global-error.tsx — istemci bileşenleri, üstelik hatanın kaynağı
//      veritabanının kendisi olabilir; oradan tekrar sorgulamak ikinci bir çöküş demektir,
//   3) /iletisim — Plan 3'ün iletişim görevinde getPublicSiteIdentity'ye bağlanacak.
// Değerler tohumdaki settings satırıyla aynı; büro adı değişirse burası da elle güncellenir.
export const SITE = {
  name: 'Akıl Hukuk Bürosu',
  address: 'Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul',
  phone: '+90 216 000 00 00',
  phoneHref: 'tel:+902160000000',
  email: 'info@example.com',
  emailHref: 'mailto:info@example.com',
} as const
