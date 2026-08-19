import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import mysql from 'mysql2/promise'
import { hashPassword } from '../../../src/lib/password'

export type GeciciKullanici = {
  email: string
  password: string
  temizle: () => Promise<void>
}

// Hız sınırı e-posta başına sayıyor ve sayaç sunucu sürecinde 15 dakika yaşıyor;
// playwright.config.ts ise yerelde reuseExistingServer kullanıyor. Ayrı bir `npm run dev`
// açıkken süit art arda koşturulduğunda tohum kullanıcısını başarısız denemede kullanan her
// test, ikinci veya üçüncü koşumda yanlış kırmızı verir (ölçüldü: ADMIN üçüncü koşumda kilitlendi).
// Bu yüzden bütçe tüketen testler kendi kullanıcısını kuruyor.
//
// E-posta her koşumda rastgele: temizlik yapılamasa bile bir sonraki koşum taze kovayla başlar.
// Parola da rastgele: geride kalan bir hesap tahmin edilebilir parola taşımasın.
export async function geciciKullaniciOlustur(onEk: string): Promise<GeciciKullanici> {
  const databaseUrl = parseEnv(readFileSync('.env.local', 'utf8')).DATABASE_URL
  if (typeof databaseUrl !== 'string' || databaseUrl === '') {
    throw new Error('.env.local içinde DATABASE_URL yok; geçici test kullanıcısı kurulamıyor.')
  }

  const email = `${onEk}-${randomBytes(6).toString('hex')}@ornek.test`
  const password = randomBytes(24).toString('hex')
  const conn = await mysql.createConnection({ uri: databaseUrl })

  await conn.execute(
    'INSERT INTO users (email, password_hash, role, name, is_active) VALUES (?, ?, ?, ?, 1)',
    [email, await hashPassword(password), 'editor', 'Geçici Test Kullanıcısı'],
  )

  return {
    email,
    password,
    async temizle() {
      await conn.execute('DELETE FROM users WHERE email = ?', [email])
      await conn.end()
    },
  }
}
