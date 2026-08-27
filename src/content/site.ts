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

/**
 * Belgeden gelen sayfaların altında gösterilen hazırlayan/onaylayan künyesi.
 *
 * Müvekkil belgesi (07.08.2026) bunu açıkça istiyor:
 * *"HER BİR BAŞLIK AVUKAT TOLGA AKİL TARAFINDAN HAZIRLANMIŞTIR. METİNLER AV TOLGA AKİL
 * TARAFINDAN ONAYLANMIŞTIR. SON GÜNCELLEME TARİHİ 07.08.2026"*
 *
 * Tarih ISO biçiminde saklanıyor: `<time dateTime>` özniteliği ile ekrandaki Türkçe metin
 * aynı kaynaktan üretilsin (biçimleme `src/lib/date.ts`). İki ayrı dize yazılsaydı biri
 * güncellenip diğeri unutulurdu.
 *
 * Yalnız BELGEDEN GELEN sayfalar bu künyeyi taşır: yedi çalışma alanı ve /hakkimizda.
 * /kvkk ile /cerez-politikasi belgeden gelmiyor, dolayısıyla 07.08.2026 tarihi onlar için
 * yanlış olurdu — o sayfaların kendi güncelleme tarihi metnin içinde yazılı.
 */
export const CONTENT_APPROVAL = {
  preparedBy: 'Av. Tolga Akil',
  lastUpdatedIso: '2026-08-07',

  /**
   * Künyenin basılabileceği çalışma alanı slug'ları — belgede metni TESLİM EDİLMİŞ olan
   * yedi alan.
   *
   * Bu liste olmadan künye her alan ayrıntı sayfasına koşulsuz basılıyordu ve panelden
   * yeni bir çalışma alanı eklendiğinde (ki panel tam olarak bunun için var) sayfa,
   * avukatın hiç görmediği bir metnin altında "Av. Tolga Akil tarafından hazırlanmış ve
   * onaylanmıştır" diyordu. Bir hukuk bürosunun sitesinde yanlış bir onay beyanı,
   * künyenin kendi varlık sebebini çürütür.
   *
   * BİLİNEN SINIR: tarih sabit. Avukat bu yedi metinden birini panelden düzenlerse künye
   * hâlâ 07.08.2026 gösterir. Doğru çözüm `practice_areas` tablosuna `updated_at` sütunu
   * eklemektir; bu iş şema değişikliği kapsam dışı bırakıldığı için yapılmadı.
   */
  practiceAreaSlugs: [
    'gayrimenkul-hukuku',
    'icra-ve-iflas-hukuku',
    'is-hukuku',
    'tazminat-hukuku',
    'sigorta-hukuku',
    'kira-hukuku',
    'miras-hukuku',
  ] as readonly string[],
} as const
