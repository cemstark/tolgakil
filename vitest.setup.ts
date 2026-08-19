import { existsSync } from 'node:fs'

// Testler taklit değil gerçek MariaDB üzerinde koşar. .env.test yoksa sessizce geliştirme
// veritabanına düşüp veri silmektense gürültülü şekilde duruyoruz.
if (!existsSync('.env.test')) {
  throw new Error('.env.test bulunamadı; veritabanı testleri tolga_akil_hukuk_test üzerinde koşar.')
}
process.loadEnvFile('.env.test')
