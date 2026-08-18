import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('tek h1 ve beklenen bölümler var', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Çalışma Alanları' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Makaleler' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kadro' })).toBeVisible()
})

test('makale bandı krem zeminde çizilir', async ({ page }) => {
  await page.goto('/')
  const bg = await page.locator('#articles').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgb(239, 236, 227)')
})

// Görev 2'den beri testsiz bekleyen sözleşme: [data-surface="paper"] --focus-ring'i
// --gold-ink'e çevirir, makale bandı bunu tüketen ilk krem yüzey.
test('makale bandındaki bağlantıya odaklanınca halka altın-ink olur', async ({ page }) => {
  await page.goto('/')
  const link = page.locator('#articles a').first()
  await link.focus()
  await expect(link).toHaveCSS('outline-color', 'rgb(138, 106, 44)')
})

test('h1 masaüstünde 56px çizilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'yalnızca masaüstü projede')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '56px')
})

test('h1 mobilde 36px çizilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '36px')
})

test('erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})
