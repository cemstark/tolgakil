import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import argon2 from 'argon2'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import { loginSchema } from '@/lib/validation'

// Kullanıcı yoksa da özet doğrulama maliyetini ödemek için kullanılan sabit; "bu e-posta
// kayıtlı mı" sorusunun yanıt süresinden okunmasını zorlaştırır. Geçerli bir argon2id
// dizesidir — ölçüldü: verify bunu gerçek bir özetle aynı sürede (~32 ms) reddediyor,
// bozuk bir dize olsaydı anında fırlatır ve zaman farkını kapatmazdı.
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email))
        // Bozuk bir özet dizesi kimlik doğrulama başarısızlığıdır, uygulama hatası değil —
        // bu plandaki tek "hatayı false'a çevir" istisnası.
        const ok = await argon2
          .verify(user?.passwordHash ?? DUMMY_HASH, parsed.data.password)
          .catch(() => false)

        // Pasifleştirilmiş kullanıcı parolası doğru olsa da giremez (Görev 7).
        if (!user || !user.isActive || !ok) return null

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
        // Parola özeti oturuma sızmasın diye yalnız gereken alanlar dönüyor.
        return { id: String(user.id), email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
