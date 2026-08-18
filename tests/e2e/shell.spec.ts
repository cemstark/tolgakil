import { test, expect } from '@playwright/test'

test('ana gezinme bağlantıları var', async ({ page }, testInfo) => {
  // Mobilde panel varsayılan kapalı (display:none) geldiği için bağlantılar başlangıçta
  // görünür değil; bu davranış aşağıdaki mobil testlerde ayrıca doğrulanıyor.
  test.skip(testInfo.project.name !== 'masaustu', 'mobilde panel kapalı başlar')
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Ana gezinme' })
  for (const label of ['Hakkımızda', 'Kadro', 'Çalışma Alanları', 'Makaleler', 'İletişim']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
})

test('atlama bağlantısı klavyeyle çalışır', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'İçeriğe atla' })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page.locator('#content')).toBeFocused()
})

test('bilinmeyen adres 404 sayfasını verir', async ({ page }) => {
  const res = await page.goto('/olmayan-sayfa')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible()
})

test('mobilde menü düğmesi aria-expanded değerini günceller', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  // Düğme metni açık/kapalı durumuna göre değiştiği için sabit isim yerine esnek regex kullanılır.
  const btn = page.getByRole('button', { name: /Menüyü/ })
  await expect(btn).toHaveAttribute('aria-expanded', 'false')
  await btn.click()
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
})

test('mobilde menü açılınca bağlantılar görünür, kapanınca gizlenir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Ana gezinme' })
  const link = nav.getByRole('link', { name: 'Makaleler' })
  await expect(link).toBeHidden()
  await page.getByRole('button', { name: 'Menüyü aç' }).click()
  await expect(link).toBeVisible()
  await page.getByRole('button', { name: 'Menüyü kapat' }).click()
  await expect(link).toBeHidden()
})

test('mobilde panel kapalıyken bağlantılar klavye ile odaklanamaz', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  const link = page.getByRole('link', { name: 'Makaleler' })
  // display:none olan öğeler tarayıcı tarafından Tab sırasından otomatik çıkarılır;
  // bu döngü panel kapalıyken bağlantının hiçbir Tab adımında odağı almadığını sabitler.
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    await expect(link).not.toBeFocused()
  }
})
