import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Hangi .env dosyasının okunacağını çağıran belirler.
const envPath = process.argv[2] ?? '.env.local'

// process.loadEnvFile KULLANILMIYOR: ölçüldü, ortamda zaten tanımlı bir değişkeni EZMİYOR.
// Kabukta DATABASE_URL varken `npm run db:seed -- .env.test` çalıştırılsaydı dosya yok
// sayılır, tohum hedeflenmeyen veritabanına yazılır ve orada .env'deki BİLİNEN parolayla
// bir admin hesabı açılırdı — üstelik komut "başarılı" derdi. Dosya elle okunup değerler
// açıkça atanıyor ki hedefi daima argüman belirlesin.
Object.assign(process.env, parseEnv(readFileSync(envPath, 'utf8')))

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error(`${envPath} içinde DATABASE_URL yok; tohumun hedefi belirsiz.`)

// Hedef ekrana basılıyor: yanlış veritabanına yazıldığı sessizce fark edilmesin. Yalnız
// veritabanı adı yazdırılıyor — URL'de parola var.
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
console.log(`Hedef veritabanı: ${databaseName} (${envPath})`)

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { seed } = await import('../src/db/seed.ts')
const { closeDb } = await import('../src/db/client.ts')

await seed()
console.log('Tohum verisi yüklendi.')
await closeDb()
