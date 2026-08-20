import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

let temizlik: Temizlikci | null = null
const adlar: string[] = []

test.beforeAll(async () => {
  temizlik = await temizlikciAc()
})

test.afterAll(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  for (const ad of adlar) {
    await mevcut.silmeyeCalis('DELETE FROM practice_areas WHERE name LIKE ?', [`%${ad}%`])
  }
  await mevcut.kapat()
})

function yeniAd(): string {
  // slug UNIQUE ve iki Playwright projesi aynı anda koşuyor.
  const ad = `Deneme Alanı ${Date.now()}${Math.floor(Math.random() * 1000)}`
  adlar.push(ad)
  return ad
}

test('tohumdaki çalışma alanları listede ve tekil sayfada görünür', async ({ page }) => {
  await page.goto('/calisma-alanlari')
  const kart = page.getByRole('link', { name: /Aile Hukuku/ })
  await expect(kart).toBeVisible()
  await kart.click()

  await expect(page.getByRole('heading', { level: 1, name: 'Aile Hukuku' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page).toHaveTitle('Aile Hukuku | Akıl Hukuk Bürosu')

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('yayımlanmamış çalışma alanının adresi 404 verir', async ({ page }) => {
  const ad = yeniAd()

  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  // Panel form etiketi 'Alan adı' — tests/e2e/panel-alanlar.spec.ts içinde doğrulandı.
  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Yalnız test için oluşturulmuş kayıt.')
  // "Yayında" İŞARETLENMİYOR.
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')

  const [satir] = await temizlik!.sorgu<{ slug: string }>(
    'SELECT slug FROM practice_areas WHERE name = ?', [ad]
  )
  expect(satir).toBeDefined()

  const yanit = await page.goto(`/calisma-alanlari/${satir.slug}`)
  expect(yanit?.status()).toBe(404)
})

test('olmayan çalışma alanı adresi 404 verir', async ({ page }) => {
  const yanit = await page.goto('/calisma-alanlari/hic-boyle-bir-alan-yok')
  expect(yanit?.status()).toBe(404)
})
