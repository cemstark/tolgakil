import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { parseEnv } from 'node:util'
import mysql from 'mysql2/promise'
import sharp from 'sharp'

// process.loadEnvFile KULLANILMIYOR: ortamda tanımlı değişkeni ezmiyor (Görev 1-2 sözleşmesi).
function yerelOrtam(anahtar: string): string {
  const deger = parseEnv(readFileSync('.env.local', 'utf8'))[anahtar]
  if (typeof deger !== 'string' || deger === '') {
    throw new Error(`.env.local içinde ${anahtar} yok; medya testi temizlik yapamaz.`)
  }
  return deger
}

/**
 * Her çağrıda BAŞKA baytlar taşıyan küçük bir PNG üretir.
 *
 * Sabit bir örnek görsel kullanılamaz: depolanan dosya adı içerik özetinden türüyor ve
 * `media.path` UNIQUE. İki Playwright projesi (masaustu/mobil) aynı anda koştuğunda aynı
 * baytlar aynı yola düşer, ikinci yükleme "zaten kitaplıkta" der ve test rastgele kırılır.
 */
export async function benzersizGorsel(): Promise<Buffer> {
  const ham = randomBytes(8 * 8 * 3)
  return sharp(ham, { raw: { width: 8, height: 8, channels: 3 } }).png().toBuffer()
}

/**
 * Damgayı alt metninde taşıyan medya kayıtlarını ve DOSYALARINI siler. Arayüzden silinen
 * görseller için de çağrılıyor: test yarıda kalırsa diskte artık dosya kalmasın.
 */
export async function medyaTemizle(damga: string): Promise<void> {
  const conn = await mysql.createConnection({ uri: yerelOrtam('DATABASE_URL') })
  try {
    const [rows] = await conn.execute('SELECT id, path FROM media WHERE alt_text LIKE ?', [`%${damga}%`])
    const kayitlar = rows as Array<{ id: number; path: string }>
    const kok = path.resolve(yerelOrtam('UPLOAD_DIR'))

    for (const kayit of kayitlar) {
      // force: true — dosya arayüzden zaten silinmiş olabilir, bu bir hata değil.
      await rm(path.resolve(kok, kayit.path), { force: true })
    }
    // Makale kapağı olarak kullanılan satırlar FK ile NULL'a düşer, silme kısıta takılmaz.
    await conn.execute('DELETE FROM media WHERE alt_text LIKE ?', [`%${damga}%`])
  } finally {
    await conn.end()
  }
}
