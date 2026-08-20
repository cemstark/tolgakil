import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

/**
 * `npm run build` çağrıldığında npm bu betiği KENDİLİĞİNDEN önce çalıştırır (prebuild
 * yaşam döngüsü). Amaç: barındırıcının derleme komutu `npm run build` olarak kalsa bile
 * migration ve tohumun derlemeden ÖNCE çalışması.
 *
 * **Neden gerekli:** Hostinger hPanel'indeki "Derleme komutu" alanı kilitli bir açılır
 * liste; `npm run build:deploy` seçilemiyor, elle de yazılamıyor. Migration çalışmayınca
 * derleme boş veritabanını sorgulayıp `ER_NO_SUCH_TABLE` ile düşüyor — ana sayfa ve
 * `generateStaticParams` üretim derlemesinde veritabanını gerçekten okuduğu için.
 *
 * **Neden koşullu:** yerelde her `npm run build` çağrısında tohum çalıştırmak istemiyoruz;
 * geliştirme veritabanını kurcalar ve SEED_* değişkenlerini zorunlu kılardı.
 * Ayrım için `.env.local` varlığına bakılıyor — `scripts/load-env.mts` ile aynı sinyal:
 * yerel makinede o dosya vardır, barındırıcıda yoktur (değişkenler sürece enjekte edilir).
 *
 * Karar her hâlükârda ekrana basılıyor: sessizce atlanan bir migration, saatler süren
 * teşhislere yol açar.
 */
const YEREL_ORTAM_DOSYASI = '.env.local'

if (existsSync(YEREL_ORTAM_DOSYASI)) {
  console.log(
    `[prebuild] ${YEREL_ORTAM_DOSYASI} bulundu → yerel geliştirme kabul edildi, ` +
      'veritabanı adımları ATLANDI. (Elle çalıştırmak için: npm run db:deploy)',
  )
} else {
  console.log('[prebuild] Yerel ortam dosyası yok → dağıtım kabul edildi, npm run db:deploy çalışıyor.')
  // stdio: 'inherit' — çıktı dağıtım günlüğünde görünsün; hedef veritabanının adı
  // her adımda basılıyor ve yanlış yere yazıldığı sessiz kalmamalı.
  //
  // execSync sabit bir dize ile çağrılıyor: hiçbir değişken, argüman veya kullanıcı girdisi
  // birleştirilmiyor, dolayısıyla kabuk enjeksiyonu yüzeyi yok. Buraya bir gün değişken
  // eklenecekse execFileSync('npm', [...]) biçimine geçilmelidir. (Windows'ta npm bir .cmd
  // olduğu için execFile kabuk olmadan çalışmaz; bu yüzden bugün execSync tercih edildi.)
  // Hata yutulmuyor: db:deploy düşerse derleme de düşer. Yarım kurulmuş bir veritabanının
  // üstüne başarılı görünen bir derleme çıkmasındansa dağıtımın durması yeğdir.
  execSync('npm run db:deploy', { stdio: 'inherit' })
}
