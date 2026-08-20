import { randomBytes } from 'node:crypto'
import { hashPassword } from '../../../src/lib/password'
import { temizlikciAc } from './db-cleanup'

export type GeciciKullanici = {
  username: string
  password: string
  temizle: () => Promise<void>
}

// Hız sınırı kullanıcı adı başına sayıyor ve sayaç sunucu sürecinde 15 dakika yaşıyor;
// playwright.config.ts ise yerelde reuseExistingServer kullanıyor. Ayrı bir `npm run dev`
// açıkken süit art arda koşturulduğunda tohum kullanıcısını başarısız denemede kullanan her
// test, ikinci veya üçüncü koşumda yanlış kırmızı verir (ölçüldü: ADMIN üçüncü koşumda kilitlendi).
// Bu yüzden bütçe tüketen testler kendi kullanıcısını kuruyor.
//
// Kullanıcı adı her koşumda rastgele: temizlik yapılamasa bile bir sonraki koşum taze
// kovayla başlar. Parola da rastgele: geride kalan bir hesap tahmin edilebilir parola
// taşımasın. Onek ve hex basamakları kullanıcı adı kümesinde (küçük ASCII + tire) kalıyor;
// aksi hâlde hesap oluşur ama giriş formu onu biçim hatasıyla reddederdi.
export async function geciciKullaniciOlustur(onEk: string): Promise<GeciciKullanici> {
  const username = `${onEk}-${randomBytes(6).toString('hex')}`
  const password = randomBytes(24).toString('hex')
  // Bağlantı ve DATABASE_URL okuması ortak sözleşmede (db-cleanup.ts): ham execute
  // kullanan bir temizlik, hiçbir satır silmediğinde bunu sessizce yutuyordu.
  const temizlikci = await temizlikciAc()

  await temizlikci.calistir(
    'INSERT INTO users (username, password_hash, role, name, is_active) VALUES (?, ?, ?, ?, 1)',
    [username, await hashPassword(password), 'editor', 'Geçici Test Kullanıcısı'],
  )

  return {
    username,
    password,
    async temizle() {
      try {
        // `sil`: bu hesabı yalnız bu yardımcı kuruyor ve panelde kullanıcı silme yolu yok,
        // yani sıfır satır sorgunun bayatladığı anlamına gelir — sessizce geçilmemeli.
        await temizlikci.sil('DELETE FROM users WHERE username = ?', [username])
      } finally {
        // Bağlantı her durumda kapanmalı: silme fırlatırsa açık kalan bağlantı süiti
        // çıkışta askıda bırakır ve asıl hatayı örter.
        await temizlikci.kapat()
      }
    },
  }
}
