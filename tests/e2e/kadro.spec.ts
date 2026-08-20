import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// Kayıtlar PANELDEN üretiliyor: üretim derlemesinde /kadro önbellekli ve yalnız server
// action'ların revalidateTag çağrısı onu tazeliyor (bkz. anasayfa-veri.spec.ts).
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
    await mevcut.silmeyeCalis('DELETE FROM lawyers WHERE full_name LIKE ?', [`%${ad}%`])
  }
  await mevcut.kapat()
})

function yeniAd(onEk: string): string {
  // İki Playwright projesi (masaustu/mobil) aynı anda koşuyor ve lawyers.slug UNIQUE.
  const ad = `${onEk} ${Date.now()}${Math.floor(Math.random() * 1000)}`
  adlar.push(ad)
  return ad
}

test('yayımlanan avukat listede ve özgeçmiş sayfasında mevzuatın alanlarıyla görünür', async ({ page }) => {
  const ad = yeniAd('Deneme Avukat')

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.getByLabel('Baro', { exact: true }).fill('İstanbul Barosu')
  await page.getByLabel('Baro sicil no').fill('12345')
  await page.getByLabel('Mesleğe başlama tarihi').fill('2010-03-15')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  await page.goto('/kadro')
  const kart = page.getByRole('link', { name: new RegExp(ad) })
  await expect(kart).toBeVisible()
  await kart.click()

  await expect(page.getByRole('heading', { level: 1, name: ad })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByText('İstanbul Barosu')).toBeVisible()
  await expect(page.getByText('12345')).toBeVisible()
  // Gün kaymıyor: sütun mode:'string', formatDate UTC'ye sabitli.
  await expect(page.getByText('15 Mart 2010')).toBeVisible()
  // Girilmeyen alan hiç çizilmiyor — etiketi bile yok.
  await expect(page.getByText('TBB sicil no')).toHaveCount(0)

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('yayımlanmamış avukatın adresi 404 verir', async ({ page }) => {
  const ad = yeniAd('Taslak Avukat')

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  // "Yayında" İŞARETLENMİYOR.
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  // Slug'ı panel üretiyor; adresi bilmek için veritabanından okunuyor.
  const [satir] = await temizlik!.sorgu<{ slug: string }>(
    'SELECT slug FROM lawyers WHERE full_name = ?', [ad]
  )
  expect(satir).toBeDefined()

  const yanit = await page.goto(`/kadro/${satir.slug}`)
  expect(yanit?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible()
})

test('olmayan avukat adresi 404 verir', async ({ page }) => {
  const yanit = await page.goto('/kadro/hic-boyle-bir-avukat-yok')
  expect(yanit?.status()).toBe(404)
})
