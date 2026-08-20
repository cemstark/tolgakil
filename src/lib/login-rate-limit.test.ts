import { describe, expect, it } from 'vitest'
import { createLoginGate, loginRateLimitMessage } from '@/lib/login-rate-limit'
import { createRateLimiter } from '@/lib/rate-limit'

const PENCERE = 60_000

// Sınırlayıcılar dışarıdan veriliyor: üretimdeki tekil örnek globalThis üzerinde yaşıyor ve
// testler arasında paylaşılsaydı bir testin doldurduğu bütçe diğerini yanlış kırmızıya
// düşürürdü.
function kapiKur(options: { epostaSiniri: number; kureselSinir: number }) {
  return createLoginGate(
    createRateLimiter({ limit: options.epostaSiniri, windowMs: PENCERE }),
    createRateLimiter({ limit: options.kureselSinir, windowMs: PENCERE }),
  )
}

describe('createLoginGate e-posta sınırı', () => {
  it('sınıra kadar izin verir, sonrasında e-posta kapsamıyla reddeder', () => {
    const kapi = kapiKur({ epostaSiniri: 3, kureselSinir: 1000 })

    for (let i = 0; i < 3; i += 1) {
      expect(kapi.admit('kurban@ornek.test', 0).allowed).toBe(true)
      kapi.recordFailure('kurban@ornek.test', 0)
    }

    const sonuc = kapi.admit('kurban@ornek.test', 0)
    expect(sonuc.allowed).toBe(false)
    expect(sonuc.scope).toBe('email')
  })

  it('anahtarı kırparak ve küçülterek üretir; aynı hesap iki kova almaz', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1000 })
    kapi.recordFailure('  Kurban@Ornek.TEST  ', 0)
    expect(kapi.check('kurban@ornek.test', 0).allowed).toBe(false)
  })

  // Giriş formunun action'ı her denemede önce check çağırıyor; gerçek sayımı admit ve
  // recordFailure yapıyor. check de sayarsa kullanıcı tek denemede iki hak kaybeder.
  it('check sayacı ilerletmez', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1000 })
    kapi.check('kurban@ornek.test', 0)
    kapi.check('kurban@ornek.test', 0)
    expect(kapi.check('kurban@ornek.test', 0).allowed).toBe(true)
    // Üç check'ten sonra tek hak hâlâ harcanmamış olmalı.
    expect(kapi.admit('kurban@ornek.test', 0).allowed).toBe(true)
  })

  /**
   * Ölçülen regresyon: e-posta kovası KABUL anında sayıldığında, aynı hesabın eşzamanlı ve
   * BAŞARILI girişleri birbirinin hakkını yiyordu — her deneme argon2 dönene kadar bir slot
   * tutuyor, altıncı eşzamanlı giriş doğru parolayla reddediliyordu. E2E süiti paralel
   * işçilerle aynı yönetici hesabına girdiği için iki testi belirgin biçimde kırdı.
   * Bu yüzden hesabın kovası yalnız BAŞARISIZLIKTA sayılıyor.
   */
  it('eşzamanlı başarılı girişler aynı hesabı kilitlemez', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 1000 })
    // Sekiz oturum aynı anda kabul ediliyor; hiçbirinin sonucu daha belli değil.
    for (let i = 0; i < 8; i += 1) {
      expect(kapi.admit('admin@ornek.test', 0).allowed).toBe(true)
    }
  })

  // Reddedilen deneme sayacı İLERLETMEZ: aksi hâlde kilitli bir hesaba istek yağdıran
  // saldırgan, pencerenin bitişini sürekli öteleyebilirdi.
  it('reddedilen deneme sayaca yazılmaz', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1000 })
    kapi.recordFailure('kurban@ornek.test', 0)
    expect(kapi.admit('kurban@ornek.test', 30_000).retryAfterMs).toBe(PENCERE - 30_000)
    expect(kapi.admit('kurban@ornek.test', 40_000).retryAfterMs).toBe(PENCERE - 40_000)
  })
})

// Denetim bulgusu: anahtar e-posta olduğu için her istekte FARKLI bir e-posta gönderen
// kimliği doğrulanmamış bir istemci sınırdan hiç etkilenmiyordu; her deneme bir veritabanı
// sorgusu ve bir argon2.verify (64 MB, timeCost 3) çalıştırıyordu.
describe('createLoginGate küresel bütçe', () => {
  it('her denemede farklı e-posta gönderen istemciyi de durdurur', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 3 })

    for (let i = 0; i < 3; i += 1) {
      expect(kapi.admit(`rastgele-${i}@ornek.test`, 0).allowed).toBe(true)
    }

    // Dördüncü e-posta kendi kovasına hiç dokunmadı; onu durduran yalnız küresel bütçe.
    const sonuc = kapi.admit('rastgele-3@ornek.test', 0)
    expect(sonuc.allowed).toBe(false)
    expect(sonuc.scope).toBe('global')
    expect(sonuc.retryAfterMs).toBe(PENCERE)
  })

  /**
   * Denetim bulgusu: sayaç pahalı işten SONRA artsaydı tavan yalnız sürdürülebilir hızı
   * sınırlardı. Eşzamanlı gelen istekler bayat sayacı görüp hep birlikte argon2 kuyruğuna
   * girer, tavan ancak sonuçlar döndükçe kapanırdı — saldırgan pencere başına bir patlama
   * hakkı kazanırdı. Bu test kabulün SONUÇ BEKLENMEDEN sayıldığını ölçüyor: aşağıda
   * hiçbir denemenin sonucu bildirilmiyor, yalnız kabul ediliyorlar.
   */
  it('kabul anında sayar: sonuç bildirilmeden tavan dolar', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 2 })
    expect(kapi.admit('bir@ornek.test', 0).allowed).toBe(true)
    expect(kapi.admit('iki@ornek.test', 0).allowed).toBe(true)
    // Üçüncü istek pahalı işe HİÇ girmeden reddediliyor.
    expect(kapi.admit('uc@ornek.test', 0).scope).toBe('global')
  })

  it('pencere dolunca küresel bütçe yeniden açılır', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 1 })
    kapi.admit('bir@ornek.test', 0)
    expect(kapi.check('iki@ornek.test', PENCERE - 1).allowed).toBe(false)
    expect(kapi.check('iki@ornek.test', PENCERE + 1).allowed).toBe(true)
  })

  // Bütçe dolduğunda admit kayıt yapmadan dönüyor, yani e-posta kovası haritasına da
  // yeni girdi eklenmiyor: küresel tavan aynı zamanda bellek tavanıdır.
  it('e-posta sınırı küresel bütçeden ÖNCE bildirilir', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1 })
    kapi.admit('kurban@ornek.test', 0)
    kapi.recordFailure('kurban@ornek.test', 0)
    expect(kapi.check('kurban@ornek.test', 0).scope).toBe('email')
  })
})

// Üç kez yanılıp dördüncüde giren avukat, aynı pencerede iki kez daha yanılırsa
// kilitlenmemeli: başarı o hesabın penceresini temizler.
describe('createLoginGate başarılı giriş', () => {
  it('e-posta sayacını sıfırlar', () => {
    const kapi = kapiKur({ epostaSiniri: 3, kureselSinir: 1000 })
    kapi.recordFailure('avukat@ornek.test', 0)
    kapi.recordFailure('avukat@ornek.test', 0)
    kapi.recordFailure('avukat@ornek.test', 0)
    expect(kapi.check('avukat@ornek.test', 0).allowed).toBe(false)

    kapi.clear('avukat@ornek.test', 0)

    // Üç yanılgı affedildi: aynı pencerede iki kez daha yanılmak kilitlemiyor.
    kapi.recordFailure('avukat@ornek.test', 0)
    kapi.recordFailure('avukat@ornek.test', 0)
    expect(kapi.check('avukat@ornek.test', 0).allowed).toBe(true)
  })

  // Sayım kabul anında yapıldığı için başarılı giriş de bir birim harcıyor. İade olmasaydı
  // bütçe meşru trafikle dolardı — ölçüldü: e2e süiti bir turda ~250 başarılı giriş yapıyor
  // ve 200'lük tavanı turun ortasında tüketip on bir testi kırdı.
  it('kendi birimini küresel bütçeye geri verir', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 2 })
    kapi.admit('bir@ornek.test', 0)
    kapi.admit('iki@ornek.test', 0)
    expect(kapi.check('uc@ornek.test', 0).scope).toBe('global')

    kapi.clear('bir@ornek.test', 0)

    expect(kapi.check('uc@ornek.test', 0).allowed).toBe(true)
  })

  // İade en fazla kendi tükettiğini geri verir. Sıfırlama olsaydı geçerli tek bir hesabı
  // olan saldırgan her girişten sonra tavanı tamamen etkisizleştirirdi.
  it('başkalarının başarısız denemelerini affetmez', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 3 })
    kapi.admit('saldirgan@ornek.test', 0)
    kapi.admit('kurban-bir@ornek.test', 0)
    kapi.admit('kurban-iki@ornek.test', 0)
    expect(kapi.check('yeni@ornek.test', 0).scope).toBe('global')

    // Saldırganın elindeki geçerli hesap yalnız KENDİ birimini geri alıyor.
    kapi.clear('saldirgan@ornek.test', 0)

    expect(kapi.admit('yeni@ornek.test', 0).allowed).toBe(true)
    expect(kapi.check('yeni@ornek.test', 0).scope).toBe('global')
  })

  // Bütçe sayacı eksiye düşmemeli: iade edilmemiş bir birim geri verilirse tavan sessizce
  // yükselirdi.
  it('harcanmamış birim iade edilemez', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 1 })
    kapi.clear('hic-denemeyen@ornek.test', 0)
    kapi.clear('hic-denemeyen@ornek.test', 0)

    expect(kapi.admit('bir@ornek.test', 0).allowed).toBe(true)
    expect(kapi.check('iki@ornek.test', 0).scope).toBe('global')
  })
})

describe('loginRateLimitMessage', () => {
  it('izin verilen sonuçta mesaj üretmez', () => {
    expect(loginRateLimitMessage({ allowed: true, retryAfterMs: 0, scope: null })).toBeNull()
  })

  it('e-posta sınırında kalan süreyi dakika olarak yazar', () => {
    expect(loginRateLimitMessage({ allowed: false, retryAfterMs: 610_000, scope: 'email' })).toBe(
      'Çok fazla deneme yapıldı. 11 dakika sonra tekrar deneyin.',
    )
  })

  // Küresel tavana takılan kullanıcı kendi parolasını doğru girmiş olabilir; "çok fazla
  // deneme yaptınız" demek onu yanlış yönlendirirdi.
  it('küresel tavanda kullanıcıyı suçlamayan bir metin döner', () => {
    expect(loginRateLimitMessage({ allowed: false, retryAfterMs: 60_000, scope: 'global' })).toBe(
      'Giriş servisi şu anda çok fazla başarısız deneme alıyor. 1 dakika sonra tekrar deneyin.',
    )
  })
})
