import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('tek h1 ve beklenen bölümler var', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  // `exact` ŞART: makale bölümünün yeni başlığı da "Çalışma alanlarına ilişkin
  // bilgilendirme yazıları" ve varsayılan (substring) eşleşmede ikisi birden bulunup
  // strict mode ihlali veriyordu.
  await expect(
    page.getByRole('heading', { name: 'Çalışma alanları', exact: true }),
  ).toBeVisible()
  // Makale bölümünün başlığı artık "Makaleler" DEĞİL (devir tasarımı 5b): o sözcük
  // bölümün kaşına, <p> olarak indi; başlık bölümün ne anlattığını söylüyor. Bölüm
  // kimliği #articles ile ayrıca sabit ve krem zemin testi onu zaten doğruluyor.
  await expect(
    page.getByRole('heading', { name: /bilgilendirme yazıları/ }),
  ).toBeVisible()
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

// Ölçüler sinematik hero ile büyüdü (devir tasarımı 5b: masaüstü tavanı 76px). clamp'in
// vw katsayısı, masaüstü projesinin 1280px genişliğinde tam tavana oturacak şekilde
// seçildi — tasarımın verdiği sayı çoğu masaüstü ekranda gerçekten görünsün diye.
test('h1 masaüstünde 76px çizilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'yalnızca masaüstü projede')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '76px')
})

// Mobilde clamp'in ALT ucu geçerli (412px × .0594 ≈ 24px, tabana kırpılıyor).
test('h1 mobilde 34px çizilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '34px')
})

test('erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/')
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations).toEqual([])
})
