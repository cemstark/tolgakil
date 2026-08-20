import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const VARSAYILAN_DOSYA = '.env.local'

/**
 * Veritabanı betiklerinin ortam değişkenlerini nereden alacağını belirler ve hedefi ekrana
 * basar. Üç kaynak vardır, önceliği aşağıdaki sıra belirler.
 *
 * `process.loadEnvFile` KULLANILMIYOR: ölçüldü, ortamda zaten tanımlı bir değişkeni EZMİYOR.
 * Kabukta DATABASE_URL varken `npm run db:seed -- .env.test` çalıştırılsaydı dosya yok
 * sayılır, tohum hedeflenmeyen veritabanına yazılırdı — üstelik komut "başarılı" derdi.
 * Dosya elle okunup değerler açıkça atanıyor.
 *
 * **Neden platform değişkenlerine düşüş var:** Hostinger gibi barındırıcılarda `.env` dosyası
 * yoktur; değişkenler sürece doğrudan enjekte edilir. Betiğin dosya dayatması, dağıtım
 * sırasında migration çalıştırmayı tümüyle imkânsız kılıyordu.
 *
 * **Yanlış veritabanına migration koruması korunuyor:** açıkça bir yol verildiyse ve o dosya
 * yoksa betik DURUR. Sessizce platform değişkenlerine düşmez — çünkü o durumda kullanıcı
 * belirli bir hedefi kastetmiştir ve yazım hatası yapmış olabilir. Düşüş yalnızca hiç yol
 * verilmediğinde ve varsayılan dosya da bulunmadığında olur.
 */
export function loadEnvForScript(argPath: string | undefined): void {
  let kaynak: string

  if (argPath !== undefined) {
    if (!existsSync(argPath)) {
      throw new Error(
        `Ortam dosyası bulunamadı: ${argPath}\n` +
          'Yol açıkça verildiği için platform değişkenlerine düşülmüyor: yazım hatası olabilir ' +
          've yanlış veritabanına yazmak geri alınamaz. Dosyayı düzeltin ya da argümanı kaldırın.',
      )
    }
    Object.assign(process.env, parseEnv(readFileSync(argPath, 'utf8')))
    kaynak = argPath
  } else if (existsSync(VARSAYILAN_DOSYA)) {
    Object.assign(process.env, parseEnv(readFileSync(VARSAYILAN_DOSYA, 'utf8')))
    kaynak = VARSAYILAN_DOSYA
  } else {
    kaynak = 'platform ortam değişkenleri (dosya yok)'
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      `DATABASE_URL tanımlı değil (kaynak: ${kaynak}); betiğin hedefi belirsiz.`,
    )
  }

  // Hedef ekrana basılıyor: yanlış veritabanına yazıldığı sessizce fark edilmesin.
  // Yalnız veritabanı adı yazdırılıyor — URL'de parola var.
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
  console.log(`Hedef veritabanı: ${databaseName} (kaynak: ${kaynak})`)
}
