// Hangi .env dosyasının okunacağını çağıran belirler: üretimde yanlışlıkla geliştirme
// veritabanına migration çalıştırmayı zorlaştırır.
process.loadEnvFile(process.argv[2] ?? '.env.local')

// Dinamik import bilinçli: loadEnvFile çağrısı client.ts'in modül seviyesindeki
// DATABASE_URL okumasından ÖNCE çalışmalı, statik import bunu garanti etmiyor.
const { migrate } = await import('drizzle-orm/mysql2/migrator')
const { closeDb, db } = await import('../src/db/client.ts')

await migrate(db, { migrationsFolder: './drizzle' })
console.log("Migration'lar uygulandı.")
await closeDb()
