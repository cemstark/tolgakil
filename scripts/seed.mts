// Hangi .env dosyasının okunacağını çağıran belirler: üretimde yanlışlıkla geliştirme
// veritabanına tohum atmayı zorlaştırır.
process.loadEnvFile(process.argv[2] ?? '.env.local')

// Dinamik import bilinçli: loadEnvFile çağrısı client.ts'in modül seviyesindeki
// DATABASE_URL okumasından ÖNCE çalışmalı, statik import bunu garanti etmiyor.
const { seed } = await import('../src/db/seed.ts')
const { closeDb } = await import('../src/db/client.ts')

await seed()
console.log('Tohum verisi yüklendi.')
await closeDb()
