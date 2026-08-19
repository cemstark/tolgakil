type Window = { count: number; startedAt: number }

export type RateLimitResult = { allowed: boolean; retryAfterMs: number }

// Bellekte tutulur: süreç yeniden başlayınca sayaç sıfırlanır ve çok süreçli bir dağıtımda
// her sürecin kendi sayacı olur. Tek Node süreci çalıştıran Hostinger Business için yeterli;
// yatay ölçekleme gerekirse ortak bir depoya (Redis) taşınmalı.
export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>()
  let lastSweptAt = Number.NEGATIVE_INFINITY

  // Süpürme zamana bağlı, kapasiteye değil. Verdiği güvence şu: bellekte yalnız son bir
  // pencere (+ bir süpürme aralığı) içinde görülmüş anahtarlar durur, süresi dolan her giriş
  // en geç bir pencere sonra silinir. Kapasite sınırı + tahliye bilinçli olarak seçilmedi:
  // saldırgan bol miktarda yeni anahtar üretip kurbanın penceresini listeden attırabilir ve
  // sayacını sıfırlayabilirdi — yani üst sınırın kendisi bir atlatma yolu olurdu.
  function sweepExpired(now: number): void {
    if (now - lastSweptAt < options.windowMs) return
    lastSweptAt = now
    for (const [key, window] of windows) {
      if (now - window.startedAt >= options.windowMs) windows.delete(key)
    }
  }

  function evaluate(current: Window | undefined, now: number): RateLimitResult {
    if (!current || now - current.startedAt >= options.windowMs) return { allowed: true, retryAfterMs: 0 }
    if (current.count >= options.limit) {
      return { allowed: false, retryAfterMs: options.windowMs - (now - current.startedAt) }
    }
    return { allowed: true, retryAfterMs: 0 }
  }

  return {
    // Yalnızca yukarıdaki bellek güvencesini ölçülebilir kılmak için var. Süpürmenin süresi
    // dolmuş girdileri gerçekten sildiği başka türlü gözlemlenemiyor: peek de record da
    // silinmiş bir anahtarla hiç var olmamış anahtarı aynı yanıtla karşılıyor, yani süpürme
    // tümüyle kaldırılsa bile davranış testleri yeşil kalırdı.
    size(): number {
      return windows.size
    },

    // Sayaca dokunmadan yalnızca durumu okur. Giriş formu bunu kullanıyor: gerçek sayımı
    // authorize yapıyor, form yalnız Türkçe mesajı üretebilmek için soruyor. Form da sayarsa
    // tek deneme iki hak yerdi.
    peek(key: string, now: number = Date.now()): RateLimitResult {
      return evaluate(windows.get(key), now)
    },

    // Bir denemeyi kaydeder ve o denemenin sınır içinde olup olmadığını döner.
    record(key: string, now: number = Date.now()): RateLimitResult {
      sweepExpired(now)
      const current = windows.get(key)
      if (!current || now - current.startedAt >= options.windowMs) {
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
