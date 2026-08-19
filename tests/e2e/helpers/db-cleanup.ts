import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import mysql from 'mysql2/promise'
import type { Connection } from 'mysql2/promise'

// process.loadEnvFile KULLANILMIYOR: ortamda tanımlı değişkeni ezmiyor (Görev 1-2 sözleşmesi).
function veritabaniAdresi(): string {
  const deger = parseEnv(readFileSync('.env.local', 'utf8')).DATABASE_URL
  if (typeof deger !== 'string' || deger === '') {
    throw new Error('.env.local içinde DATABASE_URL yok; e2e temizliği çalışamaz.')
  }
  return deger
}

/** mysql2'nin hazır ifade yer tutucusuna koyabildiği değerler. */
type SorguDegeri = string | number | boolean | null

export type Temizlikci = {
  /**
   * Satır siler ve HİÇBİR satır etkilenmezse fırlatır.
   *
   * Görev 6'da ölçüldü: temizlik 14 koşum boyunca sessizce başarısız oldu ve kimse fark
   * etmedi — geliştirme veritabanında artık kayıtlar birikti. Sessiz temizlik, temizlik
   * değildir; bu yüzden `affectedRows === 0` bir hatadır.
   */
  sil: (sql: string, params: SorguDegeri[]) => Promise<number>
  /** Satır silmemesi normal olan temizlikler için (kayıt zaten arayüzden silinmiş olabilir). */
  silmeyeCalis: (sql: string, params: SorguDegeri[]) => Promise<number>
  sorgu: <T>(sql: string, params: SorguDegeri[]) => Promise<T[]>
  calistir: (sql: string, params: SorguDegeri[]) => Promise<number>
  kapat: () => Promise<void>
}

export async function temizlikciAc(): Promise<Temizlikci> {
  const conn: Connection = await mysql.createConnection({ uri: veritabaniAdresi() })

  async function calistir(sql: string, params: SorguDegeri[]): Promise<number> {
    const [sonuc] = await conn.execute(sql, params)
    return (sonuc as { affectedRows?: number }).affectedRows ?? 0
  }

  return {
    calistir,
    silmeyeCalis: calistir,
    async sil(sql, params) {
      const etkilenen = await calistir(sql, params)
      if (etkilenen === 0) {
        throw new Error(`Temizlik hiçbir satır silmedi; sorgu artık eşleşmiyor: ${sql}`)
      }
      return etkilenen
    },
    async sorgu<T>(sql: string, params: SorguDegeri[]): Promise<T[]> {
      const [satirlar] = await conn.execute(sql, params)
      return satirlar as T[]
    },
    async kapat() {
      await conn.end()
    },
  }
}
