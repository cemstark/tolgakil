// Sabit iletişim bilgileri; Plan 2'de `settings` tablosundan gelecek, alan adları aynı
// kalacak. SiteFooter ve iletişim sayfası aynı kaynaktan okur — iki kopya birbirinden
// bağımsız güncellenip çelişen bilgi göstermesin diye.
export const SITE = {
  name: 'Akıl Hukuk Bürosu',
  address: 'Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul',
  phone: '+90 216 000 00 00',
  phoneHref: 'tel:+902160000000',
  email: 'info@example.com',
  emailHref: 'mailto:info@example.com',
} as const
