type Window = { count: number; startedAt: number }

export type RateLimitResult = { allowed: boolean; retryAfterMs: number }

/**
 * Bir denemenin sayıldığı pencerenin kimliği (pencerenin başlangıç anı).
 *
 * İade bu kimliği istiyor, zaman damgası değil: kabul ile iade arasında geçen sürede
 * (argon2 doğrulaması) pencere dönmüş olabilir ve "şu anki pencere" artık denemenin
 * sayıldığı pencere olmayabilir.
 */
export type WindowId = number

export type RecordResult = RateLimitResult & { windowId: WindowId }

export type RateLimiter = ReturnType<typeof createRateLimiter>

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

    // Tek bir denemeyi sayaçtan geri alır.
    //
    // Kabul anında sayan bir çağıran için gerekli: deneme, sonucu bilinmeden sayılıyor ve
    // sonuç "bu istek zaten sayılmamalıydı" çıkarsa tek yol geri vermek. Sayacın tümünü
    // sıfırlamaz — paylaşılan bir anahtarda o, başkalarının denemelerini de affederdi.
    //
    // İade YALNIZ denemenin sayıldığı pencereye gider; kimlik `record`'dan alınıyor.
    //
    // Zaman damgasına bakan bir sürüm YANLIŞTI ve ölçüldü: pencere bitimine 1 ms kala kabul
    // edilen denemeler eski pencerede sayılıyor, iade ise argon2 döndükten sonra YENİ
    // pencerenin sayacını düşürüyordu. Böylece eski pencerenin kullanılmamış bütçesi yeniye
    // taşınıyor ve tavan pratikte iki katına çıkabiliyordu.
    refund(key: string, windowId: WindowId): void {
      const current = windows.get(key)
      if (!current || current.startedAt !== windowId) return
      current.count -= 1
      if (current.count <= 0) windows.delete(key)
    },

    // Bir anahtarın penceresini tümüyle siler: sayaç sıfırlanır, pencere yeniden başlar.
    // Başarılı giriş bunu çağırıyor — üç kez yanılıp dördüncüde giren kullanıcı, aynı
    // pencerede iki kez daha yanıldığında kilitlenmemeli (Görev 3'te gözden kaçmıştı).
    // Yalnız KENDİ anahtarını sıfırlayan çağıranlar için güvenli: paylaşılan bir anahtarı
    // sıfırlamak (ör. küresel bütçe) sınırın tümünü etkisizleştirirdi.
    reset(key: string): void {
      windows.delete(key)
    },

    // Bir denemeyi kaydeder; sınır içinde olup olmadığını ve sayıldığı pencerenin kimliğini
    // döner. Kimlik, iadenin doğru pencereye gitmesi için gerekli (bkz. refund).
    record(key: string, now: number = Date.now()): RecordResult {
      sweepExpired(now)
      const current = windows.get(key)
      if (!current || now - current.startedAt >= options.windowMs) {
        windows.set(key, { count: 1, startedAt: now })
        return { allowed: true, retryAfterMs: 0, windowId: now }
      }
      if (current.count >= options.limit) {
        return {
          allowed: false,
          retryAfterMs: options.windowMs - (now - current.startedAt),
          windowId: current.startedAt,
        }
      }
      current.count += 1
      return { allowed: true, retryAfterMs: 0, windowId: current.startedAt }
    },
  }
}
