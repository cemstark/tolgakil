// Panel giriş kimliğinin biçim kuralı. Kendi modülünde duruyor çünkü iki ayrı dünyadan
// okunuyor: uygulama tarafı (`@/lib/validation`, zod şemaları) ve `scripts/seed.mts`
// üzerinden doğrudan Node ESM ile yüklenen `src/db/seed.ts`. Node ne `@/` takma adını
// çözer ne de validation.ts'in zincirini takip edebilir, bu yüzden kural kopyalanmak
// yerine buraya alındı (aynı düzen: lib/settings-id.ts).

/**
 * 3-60 karakter, yalnız küçük İngiliz harfi, rakam, nokta, alt çizgi, tire.
 *
 * NEDEN ASCII VE KÜÇÜK HARF — bu kısıt keyfî değil, bir hata sınıfını kapatıyor:
 * Türkçe yerelde `'I'.toLocaleLowerCase('tr')` `'ı'` üretir, `'İ'.toLowerCase()` ise
 * karakteri İKİ kod birimine açar ve uzunluğu değiştirir (aynı tuzak src/lib/ad-ban.ts
 * ve src/lib/slug.ts içinde belgeli). Kullanıcı adı hem eşitlik anahtarı hem hız sınırı
 * kovasının anahtarı: normalleştirmenin yerele göre farklı sonuç vermesi, kullanıcının
 * "parola hatalı" duvarına çarpması ya da iki farklı kovanın aynı hesabı temsil etmesi
 * demekti. Küme ASCII'ye kısıtlandığında `toLowerCase()` yerelden bağımsız ve uzunluk
 * koruyucu olur; sınıf tümüyle kapanır.
 *
 * Üst sınır 60: sütun varchar(190) ama kimlik olarak bu kadarı fazlasıyla yeter ve
 * sütun sınırına yaslanmak kesilme riskini kullanıcıya taşırdı.
 */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,60}$/

/** Hata metni neyin kabul edildiğini söylüyor; "geçersiz" demek kullanıcıyı çıkmaza sokar. */
export const USERNAME_ERROR =
  'Kullanıcı adı 3-60 karakter olmalı ve yalnız küçük İngiliz harfleri (a-z), rakam, nokta, alt çizgi ve tire içerebilir.'
