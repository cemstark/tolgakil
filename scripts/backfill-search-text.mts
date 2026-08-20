import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Hangi .env dosyasının okunacağını çağıran belirler.
const envPath = process.argv[2] ?? '.env.local'

// process.loadEnvFile KULLANILMIYOR: ortamda zaten tanımlı bir değişkeni EZMİYOR ve bu
// betik satır GÜNCELLİYOR — hedefi daima argüman belirlemeli (bkz. scripts/seed.mts).
Object.assign(process.env, parseEnv(readFileSync(envPath, 'utf8')))

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error(`${envPath} içinde DATABASE_URL yok; geri doldurmanın hedefi belirsiz.`)

// Yalnız veritabanı adı yazdırılıyor — URL'de parola var.
console.log(`Hedef veritabanı: ${new URL(databaseUrl).pathname.replace(/^\//, '')} (${envPath})`)

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { eq, isNull } = await import('drizzle-orm')
const { db, closeDb } = await import('../src/db/client.ts')
const { articles } = await import('../src/db/schema.ts')
const { htmlToPlainText } = await import('../src/lib/sanitize.ts')

// Yalnız NULL satırlar: betik yeniden koşturulduğunda hiçbir şey yapmaz ve panelden
// kaydedilmiş taze bir search_text'i eski içerikle ezmez.
const rows = await db
  .select({ id: articles.id, content: articles.content })
  .from(articles)
  .where(isNull(articles.searchText))

console.log(`Geri doldurulacak makale: ${rows.length}`)

for (const row of rows) {
  await db.update(articles).set({ searchText: htmlToPlainText(row.content) }).where(eq(articles.id, row.id))
}

console.log('search_text geri doldurma tamamlandı.')
await closeDb()
