import argon2 from 'argon2'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users, type UserRole } from '@/db/schema'
import { loginGate } from '@/lib/login-rate-limit'
import { dummyPasswordHash } from '@/lib/password'
import { loginSchema } from '@/lib/validation'

export type AuthorizedUser = { id: string; name: string; role: UserRole }

/**
 * Kimlik bilgisi doğrulamasının tamamı; auth.ts'teki Credentials sağlayıcısı bunu
 * doğrudan `authorize` olarak veriyor.
 *
 * AYRI MODÜLDE olmasının nedeni sınanabilirlik: buradaki asıl sözleşme "yanlış parola" ile
 * "olmayan kullanıcı" arasında AYRIM YAPMAMAK ve o sözleşme gözle okunarak korunamaz.
 * auth.ts ise `next-auth` üzerinden `next/server`'ı çekiyor ve Vitest'in node ortamında
 * yüklenemiyor (ölçüldü: ERR_MODULE_NOT_FOUND). Mantık burada olduğunda test onu NextAuth
 * kabuğu olmadan çağırabiliyor (bkz. src/lib/authorize.test.ts).
 */
export async function authorizeCredentials(credentials: unknown): Promise<AuthorizedUser | null> {
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
  // login-rate-limit.ts). Güvence kimliği doğrulanmamış denemeler için geçerli;
  // başarılı giriş kendi birimini geri veriyor.
  const admission = loginGate.admit(parsed.data.username)
  if (!admission.allowed) return null

  const [user] = await db.select().from(users).where(eq(users.username, parsed.data.username))
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
    loginGate.recordFailure(parsed.data.username)
    return null
  }

  // Başarı hesabın penceresini temizliyor ve küresel bütçeye kendi birimini iade
  // ediyor. İade, kabul makbuzundaki PENCERE KİMLİĞİYLE yapılıyor: argon2 çalışırken
  // pencere dönmüş olabilir ve o zaman iade yeni pencereye gitmemeli (gerekçesi
  // login-rate-limit.ts'te).
  loginGate.clear(parsed.data.username, admission.budgetWindow)

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  // Parola özeti oturuma sızmasın diye yalnız gereken alanlar dönüyor.
  // `email` alanı BİLİNÇLİ olarak yok: next-auth'un varsayılan User tipinde isteğe
  // bağlı ve artık böyle bir sütun da yok. Oturumdan okunan tek kimlik `id`
  // (auth.config.ts), rol ve isActive her panel isteğinde satırdan tazeleniyor.
  return { id: String(user.id), name: user.name, role: user.role }
}
