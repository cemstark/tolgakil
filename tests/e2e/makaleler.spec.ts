import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { testIcerigiHazirla, type TestIcerigi } from './helpers/test-content'

// /makaleler arşivi ve /makaleler/[slug] ayrıntısı "masaüstü 6a" turunda kuruldu; ikisi de
// o güne kadar yer tutucuydu, yani hiç test edilmemişti. Veri PANELDEN üretiliyor,
// doğrudan SQL ile DEĞİL: üretim derlemesinde bu sayfalar önbellekli ve yalnız server
// action'ların tazeleme çağrısı onları güncelliyor (anasayfa-veri.spec.ts ile aynı
// gerekçe). Ham INSERT sessizce görünmez kalırdı.
let icerik: TestIcerigi | null = null

test.beforeEach(async () => {
  icerik = await testIcerigiHazirla()
})

test.afterEach(async () => {
  const mevcut = icerik
  icerik = null
  await mevcut?.temizle()
})

function hazir(): TestIcerigi {
  if (icerik === null) throw new Error('Test içeriği hazırlanmadı; beforeEach düşmüş olmalı.')
  return icerik
}

test('yayımlanan makale arşivde, aramada ve ayrıntı sayfasında görünür', async ({ page }) => {
  const damga = hazir().damga
  const baslik = `Kira bedeli tespiti ${damga}`
  const ozet = 'Kira bedelinin belirlenmesinde uygulanan ölçütler üzerine kısa bir not.'

  await girisYap(page, ADMIN)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill(ozet)
  await page.locator('[contenteditable="true"]').fill('Kiracının hakları, süreler ve başvuru yolları.')
  await page.getByLabel('Kategori').selectOption({ label: hazir().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  // 1) Arşivde görünüyor ve kategori çipi çizilmiş. Çip yalnız YAYIMLANMIŞ makalesi olan
  //    kategoriler için çiziliyor (listPublicCategories innerJoin), yani varlığı aynı
  //    zamanda yayımlanmışlığın kanıtı.
  await page.goto('/makaleler')
  await expect(page.getByRole('link', { name: baslik })).toBeVisible()
  await expect(page.getByRole('link', { name: hazir().kategoriAdi }).first()).toBeVisible()

  // 2) Arama sunucuda çalışıyor: form düz bir GET, sonuç adres çubuğunda taşınıyor.
  await page.goto('/makaleler?q=Kira')
  await expect(page.getByRole('link', { name: baslik })).toBeVisible()

  // 3) Eşleşmeyen arama boş durumu veriyor — 404 değil.
  await page.goto('/makaleler?q=bulunmayanbirterim')
  await expect(page.getByText('Bu arama için sonuç bulunamadı.')).toBeVisible()

  // 4) Ayrıntı sayfası: tek h1, başlık şablonu ve künye.
  await page.goto('/makaleler')
  await page.getByRole('link', { name: baslik }).click()
  // Adres değişimini bekle: client-side geçişte arşivin DOM'u kısa süre ayakta kalıyor ve
  // özet metni iki yerde birden bulunuyordu (arşiv satırının <span>'i + ayrıntının <p>'si),
  // bu da strict mode ihlali veriyordu.
  await page.waitForURL(/\/makaleler\/.+/)
  await expect(page.getByRole('heading', { level: 1, name: baslik })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page).toHaveTitle(`${baslik} | Akil Hukuk Bürosu`)
  await expect(page.getByText(ozet).first()).toBeVisible()

  // 5) Ayrıntı sayfası erişilebilir. Başlık fotoğrafın üstünde çizildiği için kontrast,
  //    yan kolondaki piller için de dokunma hedefi riski var.
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('makale arşivinde erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/makaleler')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})
