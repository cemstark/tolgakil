// Ortam değişkenlerinin nereden geldiğini ve neden platform değişkenlerine düşülebildiğini
// scripts/load-env.mts açıklıyor. Hedef veritabanının adı ekrana basılır.
import { loadEnvForScript } from './load-env.mts'

loadEnvForScript(process.argv[2])

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { seed } = await import('../src/db/seed.ts')
const { closeDb } = await import('../src/db/client.ts')

await seed()
console.log('Tohum verisi yüklendi.')
await closeDb()
