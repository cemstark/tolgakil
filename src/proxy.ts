import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// Yalnız oturum çerezini doğrular; veritabanına ve argon2'ye dokunmaz.
// Dışa aktarım biçimi zorunlu: Next 16'nın statik çözümleyicisi (get-page-static-info)
// `export const <ad> = ...` içinde yalnız düz tanımlayıcı arıyor. `export const { auth: proxy }`
// yazılırsa ObjectPattern'de ad bulamayıp "must export a function" ile derlemeyi kırar.
export const proxy = NextAuth(authConfig).auth

export const config = {
  // /panel/giris de eşleşiyor ve bu güvenli: next-auth oturumsuz isteği giriş sayfasına
  // yönlendirirken zaten giriş sayfasındaysa yönlendirmeyi atlıyor (ölçüldü, lib/index.js),
  // yani döngü oluşmuyor. Tek desen tutmak matcher'ı okunur bırakıyor.
  matcher: ['/panel/:path*'],
}
