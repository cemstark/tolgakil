// Ortam değişkenlerinin nereden geldiğini ve neden platform değişkenlerine düşülebildiğini
// scripts/load-env.mts açıklıyor. Hedef veritabanının adı ekrana basılır.
import { loadEnvForScript } from './load-env.mts'

loadEnvForScript(process.argv[2])

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { migrate } = await import('drizzle-orm/mysql2/migrator')
const { closeDb, db } = await import('../src/db/client.ts')

await migrate(db, { migrationsFolder: './drizzle' })
console.log("Migration'lar uygulandı.")
await closeDb()
