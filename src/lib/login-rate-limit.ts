import { createRateLimiter } from '@/lib/rate-limit'

type LoginRateLimiter = ReturnType<typeof createRateLimiter>

// Sınır iki yerden görülüyor: giriş sayfasının server action'ı (yalnız Türkçe mesaj üretmek
// için, peek) ve auth.ts'teki authorize (gerçek kapı, record). Gerçek kapının orada olması
// şart: /api/auth/callback/credentials'a CSRF token'ıyla doğrudan POST atan bir saldırgan
// action'dan hiç geçmiyor, yani sınır yalnız formda dursaydı hiç devreye girmezdi.
//
// Örnek globalThis üzerinde önbelleğe alınıyor. İki tüketici farklı rota paketlerine
// derlenebiliyor (action /panel/giris, authorize ayrıca /api/auth/[...nextauth]) ve her paket
// modülü yeniden değerlendirirse her birinin kendi sayacı olur — sınır sessizce ikiye katlanır.
// db/client.ts havuzu da aynı nedenle böyle tutuluyor.
const globalCache = globalThis as typeof globalThis & { __loginRateLimiter?: LoginRateLimiter }

export const loginRateLimiter =
  globalCache.__loginRateLimiter ?? createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 })
globalCache.__loginRateLimiter = loginRateLimiter

// Anahtar e-posta, IP değil. x-forwarded-for'un ilk girdisi istemcinin gönderdiği değerdir:
// her istekte farklı bir başlık yazan saldırgan her seferinde yeni kova alır ve sınırı
// tamamen atlar (bu atlatma repoda ölçüldü). Ters vekil başlığı zincire eklediğinde de
// split(',')[0] yanlış ucu seçer; yani iki durumda da yanlış.
//
// Takas açık: e-posta anahtarıyla bir saldırgan bilinen bir hesabı 15 dakika kilitleyebilir.
// Küçük bir büro paneli için bu, brute-force savunmasının hiç olmamasından iyidir. Hostinger
// ters vekilinin başlığı ezip ezmediği Plan 3'te ölçülünce IP anahtarı yeniden değerlendirilir.
export function loginRateLimitKey(email: string): string {
  return `login:${email.trim().toLowerCase()}`
}
