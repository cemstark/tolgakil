import type { UserRole } from '@/db/schema'

// Modül genişletme `.d.ts` gerektiriyor; Plan 1'in "ayrı tip dosyası açılmaz" kuralına
// bilinçli ve onaylı istisna.
declare module 'next-auth' {
  interface User {
    role: UserRole
  }
  // `email` KALDIRILDI: giriş kimliği artık kullanıcı adı ve authorize e-posta döndürmüyor.
  // Bildirimi bırakmak, hiçbir zaman dolmayacak bir alanı `string` diye vaat ederdi.
  interface Session {
    user: { id: string; name: string; role: UserRole }
  }
}

// Hedef bilinçli olarak '@auth/core/jwt'. next-auth/jwt yalnızca `export * from '@auth/core/jwt'`
// yapıyor; o yola yazılan genişletme JWT arayüzünün kendisine ulaşmıyor ve token alanları
// `Record<string, unknown>` üzerinden `unknown` kalıyor (ölçüldü: TS2322).
declare module '@auth/core/jwt' {
  interface JWT {
    uid: number
    role: UserRole
  }
}
