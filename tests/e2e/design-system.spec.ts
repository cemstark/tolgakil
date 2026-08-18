import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('kök token değerleri spec ile birebir aynı', async ({ page }) => {
  await page.goto('/')
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    return {
      ink: s.getPropertyValue('--ink').trim(),
      ink2: s.getPropertyValue('--ink-2').trim(),
      paper: s.getPropertyValue('--paper').trim(),
      paper2: s.getPropertyValue('--paper-2').trim(),
      gold: s.getPropertyValue('--gold').trim(),
      goldInk: s.getPropertyValue('--gold-ink').trim(),
      textInk: s.getPropertyValue('--text-ink').trim(),
      textInkMuted: s.getPropertyValue('--text-ink-muted').trim(),
      textPaper: s.getPropertyValue('--text-paper').trim(),
      textPaperMuted: s.getPropertyValue('--text-paper-muted').trim(),
      lineInk: s.getPropertyValue('--line-ink').trim(),
      linePaper: s.getPropertyValue('--line-paper').trim(),
      radiusPill: s.getPropertyValue('--radius-pill').trim(),
      radiusBlock: s.getPropertyValue('--radius-block').trim(),
      radiusCard: s.getPropertyValue('--radius-card').trim(),
    }
  })
  expect(tokens).toEqual({
    ink: '#161d27',
    ink2: '#1f2732',
    paper: '#efece3',
    paper2: '#f7f5ef',
    gold: '#c9a86a',
    goldInk: '#7d5f26',
    textInk: '#f3f1ea',
    textInkMuted: '#aab1bc',
    textPaper: '#161d27',
    textPaperMuted: '#4b535f',
    // Chromium kayıtsız (unregistered) custom property'yi yazıldığı gibi döndürür;
    // rgba(...) ifadesinin #rrggbbaa'ya dönüşümünü Next'in CSS işleme hattı yapar
    // (lightningcss). Dönüşüm dev sunucusuna özgü değil: playwright.config.ts artık
    // CI'da üretim derlemesi üzerinden çalışıyor (`npm run build && npm run start`) ve
    // bu test orada da aynı değeri doğruladı (CI=1 npm run test:e2e ile elle koşuldu).
    lineInk: '#f3f1ea1f',
    linePaper: '#d5d1c4',
    radiusPill: '999px',
    radiusBlock: '26px',
    radiusCard: '20px',
  })
})

test('güvenlik başlıkları gönderiliyor', async ({ request }) => {
  const res = await request.get('/')
  expect(res.headers()['x-frame-options']).toBe('DENY')
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
  expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(res.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
})

test('gövde koyu zemin ve Outfit ile çizilir, sayfa dili Türkçe', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  const body = await page.evaluate(() => {
    const s = getComputedStyle(document.body)
    return { bg: s.backgroundColor, font: s.fontFamily }
  })
  expect(body.bg).toBe('rgb(22, 29, 39)')
  expect(body.font).toContain('Outfit')
})

// Bildirilen font-family yığınında Cormorant'ın olduğunu doğrular — --font-display
// değişkeninin h1'e bağlandığının kanıtı budur. Tarayıcının hangi glifi FİİLEN çizdiğini
// (ör. latin-ext eksik kalıp bir harf yedek yazı tipine düşse bile) doğrulamaz; computed
// fontFamily bildirilen yığını listeler, gerçek glif seçimini değil.
test('h1 Cormorant Garamond ile çizilir', async ({ page }) => {
  await page.goto('/')
  const font = await page
    .getByRole('heading', { level: 1 })
    .evaluate((el) => getComputedStyle(el).fontFamily)
  expect(font).toContain('Cormorant')
})

test('h2 masaüstünde 40px çizilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'yalnızca masaüstü projede')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveCSS('font-size', '40px')
})

test('h2 mobilde 30px çizilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveCSS('font-size', '30px')
})

// Mevcut axe taramalarının tamamı panel kapalıyken çalışıyordu; açık panelin DOM'a
// eklediği düğme/bağlantılar ayrıca taranmamıştı.
test('mobil menü açıkken erişilebilirlik ihlali yok', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'masaüstünde panel zaten her zaman açık')
  await page.goto('/')
  await page.locator('[aria-controls="main-menu"]').click()
  await expect(page.locator('#main-menu')).toHaveAttribute('data-open', 'true')
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations).toEqual([])
})
