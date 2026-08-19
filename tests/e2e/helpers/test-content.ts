import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import mysql from 'mysql2/promise'

export type TestIcerigi = {
  /** Başlıklara eklenen benzersiz ek; temizlik bu ekle eşleşen makaleleri siler. */
  damga: string
  /** Kategori seçicisinde aranacak görünen ad. */
  kategoriAdi: string
  temizle: () => Promise<void>
}

// Makale testleri kendi kategorisini üretir; tohumlanmış kategorilerin durduğu VARSAYILMIYOR.
// Ölçüldü: src/db/schema.test.ts her testten önce categories tablosunu boşaltıyor. Aynı
// boşaltma yarın geliştirme veritabanına da uygulanırsa, tohuma bel bağlayan bir e2e testi
// "Kira Hukuku seçeneği yok" diye anlaşılmaz biçimde kırılırdı.
export async function testIcerigiHazirla(): Promise<TestIcerigi> {
  // process.loadEnvFile KULLANILMIYOR: ortamda tanımlı değişkeni ezmiyor (Görev 1-2 sözleşmesi).
  const databaseUrl = parseEnv(readFileSync('.env.local', 'utf8')).DATABASE_URL
  if (typeof databaseUrl !== 'string' || databaseUrl === '') {
    throw new Error('.env.local içinde DATABASE_URL yok; makale testi kendi kategorisini kuramıyor.')
  }

  const damga = `e2e${randomBytes(5).toString('hex')}`
  const kategoriAdi = `E2E Kategori ${damga}`
  const kategoriSlug = `e2e-kategori-${damga}`
  const conn = await mysql.createConnection({ uri: databaseUrl })

  await conn.execute('INSERT INTO categories (slug, name) VALUES (?, ?)', [kategoriSlug, kategoriAdi])

  return {
    damga,
    kategoriAdi,
    async temizle() {
      // Sıra zorunlu: articles.category_id kısıtı ON DELETE RESTRICT, önce makaleler gider.
      await conn.execute('DELETE FROM articles WHERE title LIKE ?', [`%${damga}%`])
      await conn.execute('DELETE FROM categories WHERE slug = ?', [kategoriSlug])
      await conn.end()
    },
  }
}
