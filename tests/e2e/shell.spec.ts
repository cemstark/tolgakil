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
  // Metin içi bağlantı yalnızca renkle değil, alt çizgiyle de ayrılmalı (WCAG 1.4.1).
  const link = page.getByRole('link', { name: 'Ana sayfaya dön' })
  await expect(link).toHaveCSS('text-decoration-line', 'underline')
})

test('mobilde menü düğmesi aria-expanded değerini günceller', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  // İsim yerine ilişkiye bağlanır: düğme metni açık/kapalıya göre değişir ve
  // Görev 4-5'te ikinci bir düğme eklenirse isimle eşleşme strict-mode'u ihlal eder.
  const btn = page.locator('[aria-controls="main-menu"]')
  await expect(btn).toHaveAttribute('aria-expanded', 'false')
  await btn.click()
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
})

test('mobilde menü açılınca bağlantılar görünür, kapanınca gizlenir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  const toggle = page.locator('[aria-controls="main-menu"]')
  const panel = page.locator('#main-menu')
  // CSS locator kullanılır: panel hidden iken getByRole erişilebilirlik ağacından
  // düşer ve sıfır eşleşme toBeHidden()'ı yanıltıcı biçimde geçirir (bkz. denetim K3).
  const link = panel.locator('a', { hasText: 'Makaleler' })

  await expect(panel).toHaveAttribute('data-open', 'false')
  await expect(panel).toHaveCSS('display', 'none')
  await expect(link).toBeHidden()

  await toggle.click()
  await expect(panel).toHaveAttribute('data-open', 'true')
  await expect(panel).not.toHaveCSS('display', 'none')
  await expect(link).toBeVisible()

  await toggle.click()
  await expect(panel).toHaveAttribute('data-open', 'false')
  await expect(panel).toHaveCSS('display', 'none')
  await expect(link).toBeHidden()
})

test('mobilde Escape paneli kapatır ve odağı menü düğmesine döndürür', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  const toggle = page.locator('[aria-controls="main-menu"]')
  await toggle.click()
  await expect(page.locator('#main-menu')).toHaveAttribute('data-open', 'true')
  // Odak panel içine taşınmadan Escape'e basılırsa test hiçbir şey kanıtlamaz: click()
  // zaten düğmeyi odaklamış olur, toBeFocused() odağın hiç AYRILMADIĞINI da geçirir.
  // Tab ile odağı gerçekten panele taşıyıp DÖNÜŞÜ kanıtlıyoruz.
  await page.keyboard.press('Tab')
  const insidePanel = await page.evaluate(() => !!document.activeElement?.closest('#main-menu'))
  expect(insidePanel).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.locator('#main-menu')).toHaveAttribute('data-open', 'false')
  await expect(toggle).toBeFocused()
})

test('mobilde panel kapalıyken bağlantılar klavye ile odaklanamaz', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await page.goto('/')
  // Aktif öğenin panel içinde olup olmadığı document.activeElement üzerinden ölçülür;
  // önceki sürüm belirli bir bağlantı locator'ına bakıyordu ve bu locator kapanık
  // panelde sıfır eşleşmeye düşüp testi anlamsız biçimde yeşil tutuyordu (bkz. denetim Ö1).
  // Tab sayısı, sayfadaki tüm odaklanabilir öğeleri (skip link, marka, düğme, footer
  // bağlantıları) güvenle kapsayacak şekilde yükseltildi.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const insidePanel = await page.evaluate(() => !!document.activeElement?.closest('#main-menu'))
    expect(insidePanel).toBe(false)
  }
})
