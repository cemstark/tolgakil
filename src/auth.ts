import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import argon2 from 'argon2'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import { loginGate } from '@/lib/login-rate-limit'
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
        //
        // Kapı, aşağıdaki veritabanı sorgusu ve argon2.verify'dan ÖNCE: iki tavandan biri
        // kapalıysa maliyetin hiçbiri ödenmiyor. `admit`, `check` DEĞİL — küresel bütçe
        // kabul ANINDA sayılıyor. Sayım denemenin sonucuna bırakılsaydı eşzamanlı bin istek
        // bayat sayacı görüp hep birlikte argon2 kuyruğuna girerdi (bkz.
        // login-rate-limit.ts).
        if (!loginGate.admit(parsed.data.email).allowed) return null

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
        // Hesabın kovası burada sayılıyor: eşzamanlı BAŞARILI girişler birbirinin hakkını
        // yemesin (ölçüm ve gerekçe login-rate-limit.ts'te).
        if (!user || !user.isActive || !ok) {
          loginGate.recordFailure(parsed.data.email)
          return null
        }

        // Başarı hesabın penceresini temizliyor ve küresel bütçeye kendi birimini iade
        // ediyor (gerekçesi login-rate-limit.ts'te).
        loginGate.clear(parsed.data.email)

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
        // Parola özeti oturuma sızmasın diye yalnız gereken alanlar dönüyor.
        return { id: String(user.id), email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
