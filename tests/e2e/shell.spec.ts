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

test('etkin sayfanın gezinme bağlantısı aria-current=page taşır', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'mobilde panel kapalı başlar')
  await page.goto('/kadro')
  const nav = page.getByRole('navigation', { name: 'Ana gezinme' })
  await expect(nav.getByRole('link', { name: 'Kadro' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Hakkımızda' })).not.toHaveAttribute('aria-current', 'page')
})

// Bu test önce "alt sayfada üst bölümün bağlantısı aria-current taşır" diyordu ve 404
// üzerinden önek eşleşmesini ölçtüğünü varsayıyordu. Varsayım YANLIŞ çıktı: CI=1 (üretim
// derlemesi) altında ölçüldü — "Kadro" bağlantısı aria-current ALMIYOR, 5 saniye boyunca
// 14 kez bakıldı, hidrasyondan sonra da gelmiyor. Nedeni: üretimde 404 sayfası derleme
// anında statik üretiliyor ve istemci yönlendiricisi o sayfanın RSC yükünü hidre ediyor,
// yani usePathname() İSTENEN adresi değil ön-üretilmiş yolu döndürüyor. Geliştirme kipinde
// sayfa istek başına çizildiği için sorun görünmüyordu.
//
// Kapsam bu yüzden dürüstçe daraltıldı. Önek yükleminin kendisi src/lib/navigation.test.ts'te;
// GERÇEK bir alt rotayla ölçümü panel-kabuk.spec.ts'in "/panel/makaleler/yeni" testinde
// (panel rotaları dinamik olduğu için orada üretimde de doğru çalışıyor). Genel sitenin
// gerçek alt sayfaları (/kadro/[slug]) Plan 3'te gelince ölçüm oraya taşınacak.
//
// Burada kalan iddia iki kipte de doğru ve boş değil: 404 sayfasında YANLIŞ bir bölüm
// etkin işaretlenmez. Gezinmeye taşma yapan bir önek yüklemi bu testi kırar.
test('404 sayfasında yanlış bölüm etkin işaretlenmez', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'mobilde panel kapalı başlar')
  await page.goto('/kadro/olmayan-avukat')
  const nav = page.getByRole('navigation', { name: 'Ana gezinme' })
  for (const etiket of ['Hakkımızda', 'Makaleler', 'Çalışma Alanları', 'İletişim']) {
    await expect(nav.getByRole('link', { name: etiket })).not.toHaveAttribute('aria-current', 'page')
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

  // Gizleme MEKANİZMASI `display: none` değil `visibility: hidden`: `display`
  // animasyonlanamıyor ve panel açılıp kapanırken zıplıyordu. İkisi de aynı iki güvenceyi
  // verir — panel tıklanamaz VE klavye Tab sırasına girmez — ama yalnız `visibility`
  // geçişe izin verir (SiteHeader.module.css).
  // Testin asıl iddiası olan DAVRANIŞ (bağlantı görünür/gizli) toBeHidden ve toBeVisible
  // ile aynen korunuyor; değişen yalnız hangi özelliğin ölçüldüğü.
  await expect(panel).toHaveAttribute('data-open', 'false')
  await expect(panel).toHaveCSS('visibility', 'hidden')
  await expect(link).toBeHidden()

  await toggle.click()
  await expect(panel).toHaveAttribute('data-open', 'true')
  await expect(panel).toHaveCSS('visibility', 'visible')
  await expect(link).toBeVisible()

  await toggle.click()
  await expect(panel).toHaveAttribute('data-open', 'false')
  // Kapanışta gizlenme, kapanma animasyonu bittikten SONRA gerçekleşir (visibility
  // geçişi gecikmeli); toHaveCSS zaten yeniden deneyerek bekler.
  await expect(panel).toHaveCSS('visibility', 'hidden')
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
