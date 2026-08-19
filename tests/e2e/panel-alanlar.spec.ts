import { test, expect } from '@playwright/test'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// practice_areas.slug UNIQUE ve iki Playwright projesi eş zamanlı koşuyor; her koşum
// kendi damgasını kullanıyor, aksi hâlde ikinci proje "bu adres kullanılıyor" alırdı.
let temizlik: Temizlikci | null = null
let damga = ''

test.beforeEach(async () => {
  temizlik = await temizlikciAc()
  damga = `${Date.now()}${Math.floor(Math.random() * 1000)}`
})

// Referans önce boşaltılıyor: beforeEach fırlarsa afterEach bir ÖNCEKİ testin kapatılmış
// bağlantısını temizlemeye çalışır ve asıl hatayı örter (panel-makale.spec.ts ölçümü).
test.afterEach(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  // silmeyeCalis: kayıt testin kendi akışında arayüzden silindiyse sıfır satır normal.
  await mevcut.silmeyeCalis('DELETE FROM practice_areas WHERE name LIKE ?', [`%${damga}%`])
  await mevcut.kapat()
})

test('admin çalışma alanı ekler, düzenler ve siler', async ({ page }) => {
  const ad = `Deneme Alanı ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari')
  await page.getByRole('link', { name: 'Yeni çalışma alanı' }).click()

  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Bu alanda yürütülen süreçleri anlatan yeterince uzun bir özet metni.')
  await page.locator('[contenteditable="true"]').fill('Alanın ayrıntılı tanıtım metni.')
  await page.getByLabel('Sıra').fill('12')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')
  // Slug alan adından üretilmeli; yönlendirmeden sonra sunucu onu geri okuyor.
  await expect(page.getByLabel('Adres (slug)')).toHaveValue(new RegExp(`^deneme-alani-${damga}$`))

  await page.goto('/panel/calisma-alanlari')
  const satir = page.getByRole('row', { name: new RegExp(ad) })
  await expect(satir.getByText('Yayında')).toBeVisible()
  await expect(satir).toContainText('12')

  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)

  const bildirim = page.getByRole('status')
  await expect(bildirim).toHaveText('Çalışma alanı silindi.')
  await expect(bildirim).toBeFocused()
})

test('kısa özet alan hatası verir ve kayıt yapılmaz', async ({ page }) => {
  const ad = `Kısa Özet ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Kısa')
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByText('Özet en az 20 karakter olmalı.')).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/calisma-alanlari\/yeni$/)
})
