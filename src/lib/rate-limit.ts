type Window = { count: number; startedAt: number }

export type RateLimitResult = { allowed: boolean; retryAfterMs: number }

// Anahtar saldırgan tarafından belirlenebiliyor (IP veya e-posta), bu yüzden Map sınırsız
// büyüyebilir. Bu eşiği aşınca süresi dolmuş pencereler temizleniyor: temizlik gözlemlenebilir
// davranışı değiştirmez, yalnız belleğin sınırsız şişmesini engeller.
const SWEEP_THRESHOLD = 10_000

// Bellekte tutulur: süreç yeniden başlayınca sayaç sıfırlanır ve çok süreçli bir dağıtımda
// her sürecin kendi sayacı olur. Tek Node süreci çalıştıran Hostinger Business için yeterli;
// yatay ölçekleme gerekirse ortak bir depoya (Redis) taşınmalı.
export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>()

  function sweepExpired(now: number): void {
    for (const [key, window] of windows) {
      if (now - window.startedAt >= options.windowMs) windows.delete(key)
    }
  }

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      const current = windows.get(key)
      if (!current || now - current.startedAt >= options.windowMs) {
        if (windows.size >= SWEEP_THRESHOLD) sweepExpired(now)
        windows.set(key, { count: 1, startedAt: now })
        return { allowed: true, retryAfterMs: 0 }
      }
      if (current.count >= options.limit) {
        return { allowed: false, retryAfterMs: options.windowMs - (now - current.startedAt) }
      }
      current.count += 1
      return { allowed: true, retryAfterMs: 0 }
    },
  }
}
