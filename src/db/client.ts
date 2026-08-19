import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
// Uzantı bilinçli: scripts/migrate.mts bu dosyayı doğrudan Node ESM ile yüklüyor ve Node
// tam dosya adı istiyor (allowImportingTsExtensions bunun için açık).
import * as schema from './schema.ts'

const url = process.env.DATABASE_URL
if (!url) {
  // Sessiz bir undefined bağlantı yerine kurulum hatasını erken ve açıkça bildiriyoruz.
  throw new Error('DATABASE_URL tanımlı değil.')
}

const pool = mysql.createPool({ uri: url, connectionLimit: 10, timezone: 'Z' })

// mode: 'default' zorunlu — şema verilince drizzle mysql2 sürücüsü ilişkisel sorgu kipini
// istiyor (MySql2DrizzleConfig, drizzle-orm 0.45.2).
export const db = drizzle(pool, { schema, mode: 'default' })

// Vitest havuz açık kalırsa çıkmıyor; her veritabanı test dosyası afterAll içinde çağırır.
export async function closeDb(): Promise<void> {
  await pool.end()
}
