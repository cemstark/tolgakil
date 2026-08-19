import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { expect, type Page } from '@playwright/test'

// process.loadEnvFile KULLANILMIYOR: ölçüldü, ortamda zaten tanımlı bir değişkeni EZMİYOR
// (Görev 1-2 sözleşmesi). Dosyadan okunan değer açıkça alınıyor. Yalnız SEED_* anahtarları
// alınıyor; DATABASE_URL'i Playwright sürecine taşımanın bir faydası yok, zararı olabilir.
const dosyaOrtami = existsSync('.env.local')
  ? parseEnv(readFileSync('.env.local', 'utf8'))
  : {}

function seedDegeri(key: string): string {
  const value = dosyaOrtami[key]
  // Eksik değeri sessizce undefined bırakmak, formu "undefined" ile doldurup testi
  // anlaşılmaz bir "parola hatalı" hatasıyla düşürürdü.
  if (typeof value !== 'string' || value === '') {
    throw new Error(`.env.local içinde ${key} yok; giriş testleri tohum kullanıcısını bulamaz.`)
  }
  return value
}

// Adlar src/db/seed.ts içindeki tohum kullanıcılarıyla birebir aynı olmak zorunda.
export const ADMIN = {
  email: seedDegeri('SEED_ADMIN_EMAIL'),
  password: seedDegeri('SEED_ADMIN_PASSWORD'),
  name: 'Büro Yöneticisi',
}

export const EDITOR = {
  email: seedDegeri('SEED_EDITOR_EMAIL'),
  password: seedDegeri('SEED_EDITOR_PASSWORD'),
  name: 'Yazar Avukat',
}

/**
 * Oturumu kapatır.
 *
 * Çerez temizleniyor, "Çıkış yap" düğmesine BASILMIYOR: düğme yalnız panel gezinmesinde
 * var, yani çağıran o an panelin neresinde olduğunu bilmek zorunda kalırdı. Asıl gerekçe
 * ise girisYap'ın kendisi: /panel/giris oturumu açık kullanıcıyı /panel'e yolluyor, yani
 * çerez durmadan ikinci bir giriş denemesi form alanlarını hiç bulamaz.
 */
export async function cikisYap(page: Page) {
  await page.context().clearCookies()
}

export async function girisYap(page: Page, kullanici: { email: string; password: string }) {
  await page.goto('/panel/giris')
  await page.getByLabel('E-posta').fill(kullanici.email)
  await page.getByLabel('Parola').fill(kullanici.password)
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  // Giriş sayfası deseni DIŞARIDA bırakılmak zorunda: /\/panel(\/|$)/ yazılırsa desen
  // /panel/giris ile de eşleşir, yani başarısız girişte bile anında geçer ve yardımcı
  // hiçbir şey doğrulamaz (ölçüldü: sessizce geçip sonraki adımda 30 sn zaman aşımı).
  await expect(page).toHaveURL(/\/panel(?!\/giris)(\/|$)/)
}
