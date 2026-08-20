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

// Makale şeridine dayanan üç test (odak halkası, <time> biçimi, <time> günü) bu dosyadan
// anasayfa-veri.spec.ts'e taşındı: ana sayfa Görev 4'te veritabanına bağlandı ve tohumda
// yayımlanmış makale yok, yani burada seçiciler hiçbir öğe bulamazdı. Yeni dosya içeriği
// panelden üretip aynı iddiaları ölçüyor.

test('çalışma alanı kartları doğru rotaya bağlanır', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href^="/calisma-alanlari/"]').first()).toBeVisible()
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
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations).toEqual([])
})
