import 'server-only'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'
import type { PoolConnection as HamPoolConnection } from 'mysql2'
// Uzantı bilinçli: scripts/migrate.mts bu dosyayı doğrudan Node ESM ile yüklüyor ve Node
// tam dosya adı istiyor (allowImportingTsExtensions bunun için açık).
import * as schema from './schema.ts'

const url = process.env.DATABASE_URL
if (!url) {
  // Sessiz bir undefined bağlantı yerine kurulum hatasını erken ve açıkça bildiriyoruz.
  throw new Error('DATABASE_URL tanımlı değil.')
}

function havuzKur(baglantiUrl: string): Pool {
  const yeniHavuz = mysql.createPool({ uri: baglantiUrl, connectionLimit: 10 })

  // Oturumu gerçekten UTC'ye sabitliyoruz. mysql2'nin `timezone` seçeneği oturumun dilimini
  // ayarlamaz, yalnızca sürücüye "gelen değerler şu dilimde" diye beyan eder; üstelik drizzle
  // mysql2 sürücüsü TIMESTAMP/DATETIME için typeCast'i ezip ham dizeyi okuyor ve
  // mapFromDriverValue onu koşulsuz UTC sayıyor. Sunucunun SYSTEM dilimi +03:00 olduğu için
  // her zaman damgası 3 saat ileri okunuyordu (ölçüldü: 180 dakika).
  yeniHavuz.on('connection', (baglanti) => {
    // Dönüştürme ölçüme dayanıyor: mysql2/promise havuzunun 'connection' olayı, tipi promise
    // API'si vaat etse de çalışma zamanında ham (callback tabanlı) PoolConnection iletiyor —
    // query() burada Promise döndürmüyor.
    const hamBaglanti = baglanti as unknown as HamPoolConnection
    hamBaglanti.query("SET time_zone = '+00:00'", (hata) => {
      // Yutmuyoruz: oturum UTC'ye sabitlenemezse bütün zaman damgaları sessizce kayar,
      // bu da gürültülü bir çökmeden çok daha pahalıdır.
      if (hata) throw hata
    })
  })

  return yeniHavuz
}

// Havuz globalThis üzerinde önbelleğe alınıyor: `npm run dev` sıcak yeniden yüklemede bu
// modülü yeniden değerlendiriyor ve her değerlendirmede yeni bir havuz açılırsa eskisi
// end() çağrılmadığı için bağlantılarını tutuyor (wait_timeout 8 saat, max_connections 151).
const kuresel = globalThis as typeof globalThis & { __dbPool?: Pool }
const pool = kuresel.__dbPool ?? havuzKur(url)
kuresel.__dbPool = pool

// mode: 'default' zorunlu — şema verilince drizzle mysql2 sürücüsü ilişkisel sorgu kipini
// istiyor (MySql2DrizzleConfig, drizzle-orm 0.45.2).
export const db = drizzle(pool, { schema, mode: 'default' })

// Vitest havuz açık kalırsa çıkmıyor; her veritabanı test dosyası afterAll içinde çağırır.
export async function closeDb(): Promise<void> {
  await pool.end()
  // Kapalı havuz önbellekte kalırsa sonraki import onu yeniden kullanmaya çalışır.
  delete kuresel.__dbPool
}
