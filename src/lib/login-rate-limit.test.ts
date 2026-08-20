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
      expect(kapi.check('kurban@ornek.test', 0).allowed).toBe(true)
      kapi.recordFailure('kurban@ornek.test', 0)
    }

    const sonuc = kapi.check('kurban@ornek.test', 0)
    expect(sonuc.allowed).toBe(false)
    expect(sonuc.scope).toBe('email')
  })

  it('anahtarı kırparak ve küçülterek üretir; aynı hesap iki kova almaz', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1000 })
    kapi.recordFailure('  Kurban@Ornek.TEST  ', 0)
    expect(kapi.check('kurban@ornek.test', 0).allowed).toBe(false)
  })

  it('check sayacı ilerletmez', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1000 })
    kapi.check('kurban@ornek.test', 0)
    kapi.check('kurban@ornek.test', 0)
    expect(kapi.check('kurban@ornek.test', 0).allowed).toBe(true)
  })
})

// Denetim bulgusu: anahtar e-posta olduğu için her istekte FARKLI bir e-posta gönderen
// kimliği doğrulanmamış bir istemci sınırdan hiç etkilenmiyordu; her deneme bir veritabanı
// sorgusu ve bir argon2.verify (64 MB, timeCost 3) çalıştırıyordu.
describe('createLoginGate küresel bütçe', () => {
  it('her denemede farklı e-posta gönderen istemciyi de durdurur', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 3 })

    for (let i = 0; i < 3; i += 1) {
      expect(kapi.check(`rastgele-${i}@ornek.test`, 0).allowed).toBe(true)
      kapi.recordFailure(`rastgele-${i}@ornek.test`, 0)
    }

    // Dördüncü e-posta kendi kovasına hiç dokunmadı; onu durduran yalnız küresel bütçe.
    const sonuc = kapi.check('rastgele-3@ornek.test', 0)
    expect(sonuc.allowed).toBe(false)
    expect(sonuc.scope).toBe('global')
    expect(sonuc.retryAfterMs).toBe(PENCERE)
  })

  it('pencere dolunca küresel bütçe yeniden açılır', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 1 })
    kapi.recordFailure('bir@ornek.test', 0)
    expect(kapi.check('iki@ornek.test', PENCERE - 1).allowed).toBe(false)
    expect(kapi.check('iki@ornek.test', PENCERE + 1).allowed).toBe(true)
  })

  // Bütçe dolduğunda authorize kayıt yapmadan dönüyor, yani e-posta kovası haritasına da
  // yeni girdi eklenmiyor: küresel tavan aynı zamanda bellek tavanıdır.
  it('e-posta sınırı küresel bütçeden ÖNCE bildirilir', () => {
    const kapi = kapiKur({ epostaSiniri: 1, kureselSinir: 1 })
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

    kapi.clear('avukat@ornek.test')

    expect(kapi.check('avukat@ornek.test', 0).allowed).toBe(true)
    kapi.recordFailure('avukat@ornek.test', 0)
    kapi.recordFailure('avukat@ornek.test', 0)
    expect(kapi.check('avukat@ornek.test', 0).allowed).toBe(true)
  })

  // Aksi hâlde geçerli tek bir hesabı olan saldırgan, her girişten sonra bütçeyi
  // sıfırlayıp küresel tavanı tamamen etkisizleştirirdi.
  it('küresel bütçeyi sıfırlamaz', () => {
    const kapi = kapiKur({ epostaSiniri: 5, kureselSinir: 2 })
    kapi.recordFailure('bir@ornek.test', 0)
    kapi.recordFailure('iki@ornek.test', 0)

    kapi.clear('bir@ornek.test')

    expect(kapi.check('uc@ornek.test', 0).scope).toBe('global')
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
