import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'

describe('createRateLimiter', () => {
  it('sınıra kadar izin verir, sonrasında reddeder', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
    expect(limiter.record('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.record('1.2.3.4', 1_000).allowed).toBe(true)
    expect(limiter.record('1.2.3.4', 2_000).allowed).toBe(true)
    expect(limiter.record('1.2.3.4', 3_000).allowed).toBe(false)
  })

  it('pencere dolunca yeniden izin verir', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    expect(limiter.record('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.record('1.2.3.4', 59_999).allowed).toBe(false)
    expect(limiter.record('1.2.3.4', 60_001).allowed).toBe(true)
  })

  it('farklı anahtarları birbirinden ayırır', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.record('1.2.3.4', 0)
    expect(limiter.record('5.6.7.8', 0).allowed).toBe(true)
  })

  it('reddedince ne kadar beklenmesi gerektiğini söyler', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.record('1.2.3.4', 0)
    expect(limiter.record('1.2.3.4', 10_000).retryAfterMs).toBe(50_000)
  })

  // peek sayaca dokunmamak zorunda: giriş formu her denemede önce peek çağırıyor, gerçek
  // sayımı authorize yapıyor. peek de sayarsa kullanıcı tek denemede iki hak kaybeder.
  it('peek sayacı ilerletmez', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    expect(limiter.peek('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.peek('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.peek('1.2.3.4', 0).allowed).toBe(true)
    // Üç peek'ten sonra tek hak hâlâ harcanmamış olmalı.
    expect(limiter.record('1.2.3.4', 0).allowed).toBe(true)
  })

  it('peek sınır dolduğunda kalan süreyi bildirir', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.record('1.2.3.4', 0)
    expect(limiter.peek('1.2.3.4', 10_000)).toEqual({ allowed: false, retryAfterMs: 50_000 })
  })

  it('peek pencere dolunca yeniden izin verir', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.record('1.2.3.4', 0)
    expect(limiter.peek('1.2.3.4', 59_999).allowed).toBe(false)
    expect(limiter.peek('1.2.3.4', 60_001).allowed).toBe(true)
  })

  // Süpürme yalnız süresi dolmuş pencereleri siler; hâlâ geçerli bir pencereyi silseydi
  // saldırgan bol anahtar üretip kurbanın sayacını sıfırlatabilirdi.
  it('süpürme yürürlükteki pencereyi silmez', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.record('kurban', 0)
    // Araya giren yeni anahtarlar ve bir pencere sonrası süpürme tetiklenir.
    for (let i = 0; i < 50; i += 1) limiter.record(`gurultu-${i}`, 30_000)
    expect(limiter.peek('kurban', 59_000).allowed).toBe(false)
  })
})
