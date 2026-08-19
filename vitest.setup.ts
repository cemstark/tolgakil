import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Testler taklit değil gerçek MariaDB üzerinde koşar. .env.test yoksa sessizce geliştirme
// veritabanına düşüp veri silmektense gürültülü şekilde duruyoruz.
if (!existsSync('.env.test')) {
  throw new Error('.env.test bulunamadı; veritabanı testleri tolga_akil_hukuk_test üzerinde koşar.')
}

// process.loadEnvFile KULLANILMIYOR: ölçüldü, ortamda zaten tanımlı bir değişkeni EZMİYOR.
// Kabukta DATABASE_URL geliştirme veritabanını gösterirken `npm test` koşulsaydı
// schema.test.ts'in temizle() fonksiyonu GERÇEK verideki articles/lawyers/categories/messages
// satırlarını silerdi. Dosyadaki değerler açıkça atanıyor.
Object.assign(process.env, parseEnv(readFileSync('.env.test', 'utf8')))

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('.env.test içinde DATABASE_URL yok; testlerin hedefi belirsiz.')
}

// İkinci bariyer: testler satır siliyor, bu yüzden adı "_test" ile bitmeyen hiçbir
// veritabanına bağlanmıyoruz. Kazayla veri kaybının önündeki tek gerçek engel bu.
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
if (!databaseName.endsWith('_test')) {
  throw new Error(`Test veritabanının adı "_test" ile bitmeli; bulunan: "${databaseName}".`)
}
