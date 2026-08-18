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
// `#articles a` yerine `#articles ul a` seçilir: "Tümünü gör" zaten .textLink ile
// --gold-ink renginde metin taşıyor; outline-color bildirilmediğinde currentcolor'a
// çözülüp halka hiç çizilmese bile testi yanıltıcı biçimde geçirirdi (denetim turu 1).
// Madde bağlantısının metin rengi --text-paper (farklı), halka ise ayrı --focus-ring
// token'ından geliyor; outline-style/width de iddia edilerek halkanın GERÇEKTEN var
// olduğu kanıtlanır.
test('makale bandındaki bağlantıya odaklanınca halka altın-ink olur', async ({ page }) => {
  await page.goto('/')
  const link = page.locator('#articles ul a').first()
  await link.focus()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await expect(link).toHaveCSS('outline-width', '2px')
  await expect(link).toHaveCSS('outline-color', 'rgb(125, 95, 38)')
})

test('makale kartındaki <time>, ISO tarihi dateTime özniteliğinde taşır', async ({ page }) => {
  await page.goto('/')
  const time = page.locator('#articles ul time').first()
  await expect(time).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
})

// Biçim testi yalnızca desenin doğruluğunu kanıtlar, "hangi gün" gösterildiğini kanıtlamaz.
// formatDate'teki `timeZone: 'UTC'` kaldırılırsa negatif ofsetli bir makinede görünen gün
// dateTime özniteliğinden bir gün geriye kayar; bu test string karşılaştırmasıyla (Date
// nesnesi kullanmadan) tam olarak bu kaymayı yakalamak için var. toContain değil toBe:
// gün rakamı yıl basamaklarıyla rastlantısal eşleşip kaymayı gizleyebilirdi (ör. gün '20'
// yıl '2026' içinde geçer), tam dize eşitliği bu riski taşımaz.
test('makale kartındaki <time>, dateTime özniteliğiyle aynı günü gösterir', async ({ page }) => {
  await page.goto('/')
  const time = page.locator('#articles ul time').first()
  const isoDate = await time.getAttribute('datetime')
  expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const [year, month, day] = isoDate!.split('-')
  const visibleText = await time.textContent()
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ]
  expect(visibleText).toBe(`${day} ${months[Number(month) - 1]} ${Number(year)}`)
})

test('çalışma alanı ve kadro kartları doğru rotalara bağlanır', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href^="/calisma-alanlari/"]').first()).toBeVisible()
  await expect(page.locator('a[href^="/kadro/"]').first()).toBeVisible()
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
