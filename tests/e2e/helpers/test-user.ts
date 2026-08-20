import { randomBytes } from 'node:crypto'
import { hashPassword } from '../../../src/lib/password'
import { temizlikciAc } from './db-cleanup'

export type GeciciKullanici = {
  email: string
  password: string
  temizle: () => Promise<void>
}

// Hız sınırı e-posta başına sayıyor ve sayaç sunucu sürecinde 15 dakika yaşıyor;
// playwright.config.ts ise yerelde reuseExistingServer kullanıyor. Ayrı bir `npm run dev`
// açıkken süit art arda koşturulduğunda tohum kullanıcısını başarısız denemede kullanan her
// test, ikinci veya üçüncü koşumda yanlış kırmızı verir (ölçüldü: ADMIN üçüncü koşumda kilitlendi).
// Bu yüzden bütçe tüketen testler kendi kullanıcısını kuruyor.
//
// E-posta her koşumda rastgele: temizlik yapılamasa bile bir sonraki koşum taze kovayla başlar.
// Parola da rastgele: geride kalan bir hesap tahmin edilebilir parola taşımasın.
export async function geciciKullaniciOlustur(onEk: string): Promise<GeciciKullanici> {
  const email = `${onEk}-${randomBytes(6).toString('hex')}@ornek.test`
  const password = randomBytes(24).toString('hex')
  // Bağlantı ve DATABASE_URL okuması ortak sözleşmede (db-cleanup.ts): ham execute
  // kullanan bir temizlik, hiçbir satır silmediğinde bunu sessizce yutuyordu.
  const temizlikci = await temizlikciAc()

  await temizlikci.calistir(
    'INSERT INTO users (email, password_hash, role, name, is_active) VALUES (?, ?, ?, ?, 1)',
    [email, await hashPassword(password), 'editor', 'Geçici Test Kullanıcısı'],
  )

  return {
    email,
    password,
    async temizle() {
      try {
        // `sil`: bu hesabı yalnız bu yardımcı kuruyor ve panelde kullanıcı silme yolu yok,
        // yani sıfır satır sorgunun bayatladığı anlamına gelir — sessizce geçilmemeli.
        await temizlikci.sil('DELETE FROM users WHERE email = ?', [email])
      } finally {
        // Bağlantı her durumda kapanmalı: silme fırlatırsa açık kalan bağlantı süiti
        // çıkışta askıda bırakır ve asıl hatayı örter.
        await temizlikci.kapat()
      }
    },
  }
}
