// Son çare sabitleri. Ayarlar artık veritabanından geliyor (getPublicSiteIdentity); burada
// yalnız veri ÇEKİLEMEYEN yerler kaldı:
//   1) kök layout metadata'sı — spec §11 kök layout'ta veri çekmeyi yasaklıyor,
//   2) (site)/error.tsx ve global-error.tsx — istemci bileşenleri, üstelik hatanın kaynağı
//      veritabanının kendisi olabilir; oradan tekrar sorgulamak ikinci bir çöküş demektir,
//   3) opengraph-image.tsx — derleme anında çalışıyor, o sırada veritabanı olmayabilir.
// Değerler tohumdaki settings satırıyla aynı (src/db/seed-content.ts); büro bilgisi
// panelden değişirse burası da elle güncellenir.
//
// YAZIM UYARISI: büro adı "Akil", "Akıl" DEĞİL — avukatın soyadı AKİL. İlk sürümde noktasız
// ı ile yazılmıştı; müşteri belgesi (07.08.2026) noktalı i kullanıyor.
export const SITE = {
  name: 'Akil Hukuk Bürosu',
  // Şehir ve ilçe adresin içinde: sitenin tamamı Samsun/İlkadım odaklı ve arama motoru
  // için konum bilgisi bu dizeden okunuyor (ayrıca JSON-LD'de yapılandırılmış hâli var).
  address: 'Bahçelievler Mah. İstiklal Cad. No: 162/A D: 8, İlkadım / Samsun',
  city: 'Samsun',
  district: 'İlkadım',
  phone: '0362 234 00 54',
  phoneHref: 'tel:+903622340054',
  phoneSecondary: '0541 643 50 55',
  phoneSecondaryHref: 'tel:+905416435055',
  whatsappHref: 'https://wa.me/905416435055',
  workingHours: 'Hafta içi 08.00-18.00, Cumartesi 08.00-14.00, Pazar kapalı',
  email: 'akilavukatlik@gmail.com',
  emailHref: 'mailto:akilavukatlik@gmail.com',
} as const
