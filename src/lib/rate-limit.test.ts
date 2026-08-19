import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'

describe('createRateLimiter', () => {
  it('sınıra kadar izin verir, sonrasında reddeder', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
    expect(limiter.check('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 1_000).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 2_000).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 3_000).allowed).toBe(false)
  })

  it('pencere dolunca yeniden izin verir', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    expect(limiter.check('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 59_999).allowed).toBe(false)
    expect(limiter.check('1.2.3.4', 60_001).allowed).toBe(true)
  })

  it('farklı anahtarları birbirinden ayırır', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('1.2.3.4', 0)
    expect(limiter.check('5.6.7.8', 0).allowed).toBe(true)
  })

  it('reddedince ne kadar beklenmesi gerektiğini söyler', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('1.2.3.4', 0)
    expect(limiter.check('1.2.3.4', 10_000).retryAfterMs).toBe(50_000)
  })
})
