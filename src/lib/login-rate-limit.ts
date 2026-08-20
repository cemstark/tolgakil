import { createRateLimiter, type RateLimiter, type RateLimitResult, type WindowId } from '@/lib/rate-limit'

const WINDOW_MS = 15 * 60 * 1000

/** Tek bir hesabın penceredeki başarısız deneme hakkı. */
const PER_USERNAME_LIMIT = 5

/**
 * Pencere başına TOPLAM başarısız deneme tavanı; anahtardan bağımsız.
 *
 * NEDEN: sınır anahtarı kullanıcı adı (aşağıdaki gerekçeye bakın) ve her istekte FARKLI bir
 * kullanıcı adı gönderen kimliği doğrulanmamış bir istemci kendi kovasına hiç dokunmuyordu.
 * Her deneme bir veritabanı sorgusu ve bir `argon2.verify` çalıştırıyordu — kullanıcı
 * bulunmasa bile, sahte özete karşı, 64 MB bellek + timeCost 3 ile. argon2'nin N-API
 * çağrıları libuv iş havuzunda koşuyor (varsayılan 4 iş parçacığı): birkaç eşzamanlı
 * istek havuzu doldurur, sharp ve fs işleri kuyruğa girer ve paylaşımlı barındırmada
 * genel site de yavaşlar. Kullanıcı adı anahtarı doğru anahtardır ama tek başına bir tavan
 * DEĞİLDİR.
 *
 * DEĞER GEREKÇESİ: hesap başına hak 5, yani 200 tavanı aynı 15 dakikada 40 AYRI hesabın
 * hakkını sonuna kadar tüketmesine karşılık gelir. Büronun panelinde bir avuç kullanıcı
 * var; meşru trafiğin bu tavana yaklaşması için her kullanıcının onlarca kez yanılması
 * gerekirdi. Saldırgan tarafında ise sürdürülebilir hız 15 dakikada 200 özet doğrulaması
 * ≈ 4,5 saniyede bir olur; libuv havuzunu doldurmaya yetmez.
 *
 * KABUL EDİLEN BEDEL: tavan küresel olduğu için, tavanı dolduran bir saldırgan meşru
 * girişleri de o pencerenin sonuna kadar erteler. Takas bilinçli — paylaşımlı sunucunun
 * tümünü yavaşlatan bir kaynak tüketimi, 15 dakikalık gecikmeli girişten daha pahalıdır.
 * Kullanıcı bu durumda hata sayfası değil, ne olduğunu söyleyen Türkçe bir mesaj görüyor.
 *
 * YAN KAZANÇ: sayaç haritasında kapasite tavanı bilinçli olarak yok (bkz. rate-limit.ts —
 * tavan + tahliye, kurbanın penceresini attırmanın yolu olurdu). Bütçe dolduğunda `admit`
 * kayıt yapmadan döndüğü için haritaya yeni girdi de girmiyor: küresel tavan aynı zamanda
 * bellek tavanıdır (pencere başına en çok 200 girdi).
 */
const GLOBAL_LIMIT = 200

// Küresel bütçenin tek anahtarı. Kendi sınırlayıcısında yaşıyor, kullanıcı adı kovalarıyla
// aynı haritada değil: aynı haritada olsaydı 'login:' önekiyle üretilen bir kullanıcı adı
// anahtarı (ör. kullanıcı adı "toplam" olan bir hesap) bütçeyle çakışabilirdi.
const GLOBAL_KEY = 'toplam'

export type LoginGateScope = 'username' | 'global'

/** `scope`, reddin hangi tavandan geldiğini söyler; izin verilen sonuçta `null`. */
export type LoginGateResult = RateLimitResult & { scope: LoginGateScope | null }

/**
 * Kabul edilen denemenin makbuzu.
 *
 * `budgetWindow`, denemenin küresel bütçede sayıldığı pencerenin kimliği; başarı yolunda
 * `clear`'a geri verilir. Reddedilen denemede `null` — sayılmadığı için iade edilecek bir
 * şey de yok.
 */
export type LoginAdmission = LoginGateResult & { budgetWindow: WindowId | null }

export type LoginGate = ReturnType<typeof createLoginGate>

// Anahtar kullanıcı adı, IP değil. x-forwarded-for'un ilk girdisi istemcinin gönderdiği değerdir:
// her istekte farklı bir başlık yazan saldırgan her seferinde yeni kova alır ve sınırı
// tamamen atlar (bu atlatma repoda ölçüldü). Ters vekil başlığı zincire eklediğinde de
// split(',')[0] yanlış ucu seçer; yani iki durumda da yanlış.
//
// Takas açık: kullanıcı adı anahtarıyla bir saldırgan bilinen bir hesabı 15 dakika kilitleyebilir.
// Küçük bir büro paneli için bu, brute-force savunmasının hiç olmamasından iyidir. Hostinger
// ters vekilinin başlığı ezip ezmediği Plan 3'te ölçülünce IP anahtarı yeniden değerlendirilir.
// `.toLowerCase()` KORUNUYOR (`toLocaleLowerCase('tr')` DEĞİL — o 'I'yi 'ı' yapar ve iki
// yazımı ayrı kovalara düşürürdü). Şema zaten yalnız küçük ASCII kabul ediyor, yani bu
// çağrı bugün etkisiz; anahtar üretimini şemanın gevşemesine karşı bağımsız tutuyor.
function loginRateLimitKey(username: string): string {
  return `login:${username.trim().toLowerCase()}`
}

/**
 * İki tavanı tek kapıda toplar.
 *
 * Sınırlayıcılar dışarıdan veriliyor ki testler kendi taze örnekleriyle koşabilsin;
 * üretimdeki tekil örnek aşağıda kuruluyor.
 */
export function createLoginGate(perUsername: RateLimiter, budget: RateLimiter) {
  /**
   * Denemeye izin verilip verilmediğini SAYACA DOKUNMADAN okur.
   *
   * Sıra önemli: kullanıcı adı tavanı önce sorulur. Kendi hakkını tüketmiş kullanıcıya
   * "servis meşgul" demek onu yanlış yönlendirirdi.
   *
   * Giriş formunun action'ı bunu kullanıyor: gerçek sayımı `admit` yapıyor, form yalnız
   * doğru Türkçe mesajı üretebilmek için soruyor. Form da sayarsa tek deneme iki hak yerdi.
   */
  function check(username: string, now: number = Date.now()): LoginGateResult {
    const perUsernameResult = perUsername.peek(loginRateLimitKey(username), now)
    if (!perUsernameResult.allowed) return { ...perUsernameResult, scope: 'username' }

    const budgetResult = budget.peek(GLOBAL_KEY, now)
    if (!budgetResult.allowed) return { ...budgetResult, scope: 'global' }

    return { allowed: true, retryAfterMs: 0, scope: null }
  }

  return {
    check,

    /**
     * Denemeyi kabul eder ve KÜRESEL BÜTÇEYİ kabul anında sayar.
     *
     * Küresel sayım neden burada, denemenin SONUCUNDA değil: bütçe yalnız başarısızlıktan
     * sonra artsaydı, aradaki bütün pahalı iş (bir veritabanı sorgusu + bir
     * `argon2.verify`) bayat bir sayaca bakarak başlatılırdı. Bin eşzamanlı istek geldiğinde
     * hepsi "izinli" yanıtını alır, hepsi argon2 kuyruğuna girer ve tavan ancak ~200
     * başarısızlık kaydedildikten sonra kapanırdı: sürdürülebilir hız sınırlanır ama
     * saldırgan pencere başına bir PATLAMA hakkı kazanırdı. `record` senkron ve Node tek iş
     * parçacıklı olduğu için, kabul burada sayıldığında pencerede kabul edilen istek sayısı
     * gerçekten tavanda durur.
     *
     * BU GÜVENCE YALNIZ BAŞARISIZ DENEMELER İÇİN GEÇERLİ. Başarılı giriş kendi birimini
     * `clear` ile iade ediyor (gerekçesi orada), yani bütçeye net etkisi sıfır: doğru
     * parolayla art arda POST atan biri sınırsız `argon2.verify` çalıştırabilir. Tavan
     * "kimliği doğrulanmamış deneme sayısını" sınırlıyor, "toplam argon2 işini" değil.
     * Kimliği doğrulanmış çağrılar için ayrı bir tavan Plan 3'e bırakıldı.
     *
     * KULLANICI ADI KOVASI BURADA SAYILMIYOR, `recordFailure`'da sayılıyor — ve bu ölçümle
     * belirlendi. Kabul anında sayıldığında, aynı hesabın EŞZAMANLI ve BAŞARILI girişleri
     * birbirinin hakkını yiyor: her deneme argon2 dönene kadar bir slot tutuyor, altıncı
     * eşzamanlı giriş doğru parolayla reddediliyor. E2E süiti bunu belirgin biçimde
     * üretti (paralel işçiler aynı yönetici hesabıyla giriyor, iki test kırıldı).
     *
     * Bedeli açık ve kabul edildi: eşzamanlı bir patlamada tek bir hesaba karşı yapılan
     * deneme sayısı, kullanıcı adı tavanı olan 5'i geçebilir. Üst sınır yine de küresel bütçedir
     * (pencere başına 200 kabul), yani patlama sınırsız değil ve 12 karakterlik asgari
     * parola karşısında anlamsız kalır. Buna karşılık meşru bir kullanıcının doğru
     * parolayla kilitlenmesi her gün karşılaşılabilecek bir arıza olurdu.
     */
    admit(username: string, now: number = Date.now()): LoginAdmission {
      const result = check(username, now)
      if (!result.allowed) return { ...result, budgetWindow: null }

      // Arada await yok: kabul ile sayım arasına başka bir istek giremez.
      // Pencere kimliği çağırana veriliyor — iade zamana değil bu kimliğe bakıyor.
      const { windowId } = budget.record(GLOBAL_KEY, now)
      return { ...result, budgetWindow: windowId }
    },

    /**
     * Başarısız denemeyi hesabın kovasına işler.
     *
     * Yalnız BAŞARISIZ denemeler sayılıyor. Brute-force'un her denemesi başarısızdır, yani
     * savunma zayıflamıyor; buna karşılık 15 dakikada altı kez giriş yapan meşru bir
     * kullanıcı kendi hesabını kilitlemiyor.
     */
    recordFailure(username: string, now: number = Date.now()): void {
      perUsername.record(loginRateLimitKey(username), now)
    },

    /**
     * Başarılı girişi işler: hesabın penceresi sıfırlanır, küresel bütçeye o denemenin
     * BİR birimi `admit`'ten alınan pencere kimliğiyle iade edilir.
     *
     * Kimlik zorunlu, zaman damgası yetmez: kabul ile başarı arasında argon2 çalışıyor ve
     * pencere o sırada dönmüş olabilir. Zamana bakan sürüm ölçüldü — pencere bitimine
     * 1 ms kala kabul edilen girişler, iade sırasında YENİ pencerenin sayacını düşürüyor ve
     * eski pencerenin kullanılmamış bütçesini yeniye taşıyordu.
     *
     * Pencerenin sıfırlanması: üç kez yanılıp dördüncüde giren avukat, aynı pencerede iki
     * kez daha yanıldığında kilitlenmemeli.
     *
     * İade: küresel bütçe kabul anında sayıldığı için başarılı giriş de bir birim harcıyor.
     * İade olmasaydı bütçe meşru trafikle dolardı — ölçüldü: e2e süiti bir turda ~250
     * başarılı giriş yapıyor ve 200'lük tavanı turun ortasında tüketip on bir testi kırdı.
     * Aynı şey gerçek kullanımda da olabilirdi (yoğun bir gün, art arda açılan oturumlar).
     *
     * Bütçe SIFIRLANMIYOR, yalnız bir birim iade ediliyor. Sıfırlama olsaydı geçerli tek
     * bir hesabı olan saldırgan her girişten sonra tavanı tamamen etkisizleştirirdi; bu
     * hâliyle iade en fazla kendi tükettiğini geri verir, başkalarının başarısız
     * denemelerini affetmez.
     */
    clear(username: string, budgetWindow: WindowId | null): void {
      perUsername.reset(loginRateLimitKey(username))
      if (budgetWindow !== null) budget.refund(GLOBAL_KEY, budgetWindow)
    },
  }
}

// Sınır iki yerden görülüyor: giriş sayfasının server action'ı (yalnız Türkçe mesaj üretmek
// için, check) ve auth.ts'teki authorize (gerçek kapı, admit). Gerçek kapının orada olması
// şart: /api/auth/callback/credentials'a CSRF token'ıyla doğrudan POST atan bir saldırgan
// action'dan hiç geçmiyor, yani sınır yalnız formda dursaydı hiç devreye girmezdi.
//
// Örnek globalThis üzerinde önbelleğe alınıyor. İki tüketici farklı rota paketlerine
// derlenebiliyor (action /panel/giris, authorize ayrıca /api/auth/[...nextauth]) ve her paket
// modülü yeniden değerlendirirse her birinin kendi sayacı olur — sınır sessizce ikiye katlanır.
// db/client.ts havuzu da aynı nedenle böyle tutuluyor.
const globalCache = globalThis as typeof globalThis & { __loginGate?: LoginGate }

export const loginGate =
  globalCache.__loginGate ??
  createLoginGate(
    createRateLimiter({ limit: PER_USERNAME_LIMIT, windowMs: WINDOW_MS }),
    createRateLimiter({ limit: GLOBAL_LIMIT, windowMs: WINDOW_MS }),
  )
globalCache.__loginGate = loginGate

/**
 * Reddi kullanıcıya gösterilecek Türkçe metne çevirir; izin verilen sonuçta `null`.
 *
 * Metin burada üretiliyor çünkü giriş action'ı `'use server'` taşıyor ve o modüllerden
 * yalnız async fonksiyon dışa aktarılabiliyor.
 */
export function loginRateLimitMessage(result: LoginGateResult): string | null {
  if (result.allowed) return null

  const minutes = Math.ceil(result.retryAfterMs / 60_000)
  // Küresel tavana takılan kullanıcı kendi parolasını doğru girmiş olabilir; "çok fazla
  // deneme yaptınız" demek onu yanlış yönlendirir ve parolasını sıfırlamaya iterdi.
  return result.scope === 'global'
    ? `Giriş servisi şu anda çok fazla başarısız deneme alıyor. ${minutes} dakika sonra tekrar deneyin.`
    : `Çok fazla deneme yapıldı. ${minutes} dakika sonra tekrar deneyin.`
}
