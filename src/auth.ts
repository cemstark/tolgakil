import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import argon2 from 'argon2'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import { loginRateLimiter, loginRateLimitKey } from '@/lib/login-rate-limit'
import { dummyPasswordHash } from '@/lib/password'
import { loginSchema } from '@/lib/validation'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        // Hız sınırı buraya konmak zorunda: giriş formunun server action'ı tek giriş yolu
        // değil, saldırgan bu uca doğrudan POST atabiliyor. Formdaki kontrol yalnız Türkçe
        // mesaj üretmek için var; gerçek kapı burası.
        const rateLimitKey = loginRateLimitKey(parsed.data.email)
        if (!loginRateLimiter.peek(rateLimitKey).allowed) return null

        const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email))
        const passwordHash = user?.passwordHash ?? (await dummyPasswordHash())
        const ok = await argon2.verify(passwordHash, parsed.data.password).catch((error: unknown) => {
          // Bozuk bir özet dizesi kimlik doğrulama başarısızlığıdır. Ama argon2'nin yerel
          // ikilisi yüklenemezse de buraya düşülür ve o bir altyapı hatasıdır: hiçbir iz
          // bırakmadan "parola hatalı" demek arızayı görünmez kılardı.
          console.error('argon2.verify başarısız oldu:', error)
          return false
        })

        // Pasifleştirilmiş kullanıcı parolası doğru olsa da giremez (Görev 7).
        if (!user || !user.isActive || !ok) {
          // Yalnız başarısız denemeler sayılıyor. Brute-force'un her denemesi başarısızdır,
          // yani savunma zayıflamıyor; buna karşılık 15 dakikada altı kez giriş yapan meşru
          // bir kullanıcı kendi hesabını kilitlemiyor.
          loginRateLimiter.record(rateLimitKey)
          return null
        }

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
        // Parola özeti oturuma sızmasın diye yalnız gereken alanlar dönüyor.
        return { id: String(user.id), email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
