import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { panelGezinmesiniAc } from './helpers/panel-nav'

const PANEL_YOLLARI = [
  '/panel', '/panel/makaleler', '/panel/makaleler/yeni', '/panel/medya',
  '/panel/kadro', '/panel/kadro/yeni', '/panel/calisma-alanlari',
  '/panel/kategoriler', '/panel/mesajlar', '/panel/kullanicilar',
  '/panel/kullanicilar/yeni', '/panel/ayarlar',
]

for (const yol of PANEL_YOLLARI) {
  test(`${yol} erişilebilirlik denetiminden geçer`, async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto(yol)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations).toEqual([])
  })

  test(`${yol} tek h1 taşır`, async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto(yol)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })
}

test('panelde mobilde yatay kaydırma yok', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await girisYap(page, ADMIN)
  for (const yol of ['/panel', '/panel/makaleler/yeni', '/panel/ayarlar', '/panel/kullanicilar']) {
    await page.goto(yol)
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(tasma, `${yol} yatay taşıyor`).toBe(false)
  }
})

test('panel formlarında atlama bağlantısı gerçekten içeriğe götürür', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/ayarlar')
  await page.keyboard.press('Tab')
  const atla = page.getByRole('link', { name: 'İçeriğe atla' })
  await expect(atla).toBeFocused()
  await atla.press('Enter')
  await expect(page.locator('#panel-content')).toBeFocused()
})

test('gösterge panelinde reklam yasağı hatırlatması görünür', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel')
  const uyari = page.getByRole('region', { name: 'Yayın öncesi kontrol listesi' })
  await expect(uyari).toBeVisible()
  await expect(uyari).toContainText('başarı oranı')
  await expect(uyari).toContainText('müvekkil referansı')
  await expect(uyari).toContainText('ücret')
})

// Kontrol listesi yalnız gösterge panelinde değil, metnin YAZILDIĞI yerde de duruyor;
// makaleyi yazarken hatırlatmayı görmek, yazdıktan sonra görmekten farklı bir şey.
test('yeni makale sayfasında da kontrol listesi bulunur', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/makaleler/yeni')
  await expect(page.getByRole('region', { name: 'Yayın öncesi kontrol listesi' })).toBeVisible()
})

// Kaydırılabilir tablo sarmalayıcısı klavyeyle de gezilebilmeli (WCAG 2.1.1): fare veya
// dokunma olmadan kaydırmanın tek yolu sarmalayıcıya odaklanmak. Ada sahip bir bölge
// olması da şart, aksi hâlde ekran okuyucu kullanıcısı odağın nereye düştüğünü bilemez.
test('panel tablosunun kaydırma sarmalayıcısı adlandırılmış ve odaklanabilir', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/kullanicilar')
  const bolge = page.getByRole('region', { name: 'Kullanıcı listesi' })
  await expect(bolge).toBeVisible()
  await expect(bolge).toHaveAttribute('tabindex', '0')
  await bolge.focus()
  await expect(bolge).toBeFocused()
})

/** Görünen etkileşim öğelerinin en küçük kenarını ölçer; gizli olanlar sayılmaz. */
async function dokunmaHedefleri(page: Page, secici: string) {
  return page.evaluate((s) => {
    const kucukler: Array<{ ad: string; genislik: number; yukseklik: number }> = []
    for (const oge of document.querySelectorAll<HTMLElement>(s)) {
      const kutu = oge.getBoundingClientRect()
      if (kutu.width === 0 || kutu.height === 0) continue
      if (kutu.width < 44 || kutu.height < 44) {
        kucukler.push({
          ad: (oge.textContent ?? '').trim().slice(0, 40) || oge.tagName,
          genislik: Math.round(kutu.width),
          yukseklik: Math.round(kutu.height),
        })
      }
    }
    return kucukler
  }, secici)
}

// WCAG 2.5.5 (AAA) 44×44 istiyor; AA'nın 2.5.8'i 24 piksele iniyor. Panel bir dokunmatik
// ekranda da kullanılacak (spec §8), bu yüzden düğmelerde sıkı olan ölçü seçildi.
// Metin içi bağlantılar KAPSAM DIŞI: 2.5.8 onları açıkça muaf tutuyor ve tablo hücresindeki
// e-posta/telefon bağlantılarını 44 pikselе şişirmek satırı okunmaz hâle getirirdi.
test('panel düğmeleri en az 44×44 piksel', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'dokunma hedefi ölçüsü mobil görünüm alanında anlamlı')
  await girisYap(page, ADMIN)
  for (const yol of ['/panel', '/panel/makaleler', '/panel/makaleler/yeni', '/panel/medya']) {
    await page.goto(yol)
    // Panel açılıyor ki içindeki "Çıkış yap" düğmesi de ölçüme girsin.
    await panelGezinmesiniAc(page)
    const kucukler = await dokunmaHedefleri(page, 'button')
    expect(kucukler, `${yol} sayfasında küçük düğme`).toEqual([])
  }
})

test('mobilde panel menüsü düğmeyle açılır ve Escape ile kapanır', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await girisYap(page, ADMIN)
  await page.goto('/panel')
  // İsim yerine ilişkiye bağlanır: düğme metni açık/kapalıya göre değişiyor (SiteHeader deseni).
  const dugme = page.locator('[aria-controls="panel-menu"]')
  const panel = page.locator('#panel-menu')

  await expect(dugme).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveCSS('display', 'none')

  await dugme.click()
  await expect(dugme).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.locator('a', { hasText: 'Makaleler' })).toBeVisible()

  // Odak panel İÇİNE taşınmadan Escape'e basılırsa test hiçbir şey kanıtlamaz: click()
  // zaten düğmeyi odaklamış olur (shell.spec.ts'teki aynı ölçüm).
  await page.keyboard.press('Tab')
  const iceride = await page.evaluate(() => !!document.activeElement?.closest('#panel-menu'))
  expect(iceride).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dugme).toHaveAttribute('aria-expanded', 'false')
  await expect(dugme).toBeFocused()
})

test('mobilde panel menüsü kapalıyken bağlantılar klavye ile odaklanamaz', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await girisYap(page, ADMIN)
  await page.goto('/panel')
  // Aktif öğe document.activeElement üzerinden ölçülüyor: kapalı panelde getByRole sıfır
  // eşleşmeye düşer ve iddiayı anlamsız biçimde yeşil tutardı (shell.spec.ts denetim Ö1).
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const iceride = await page.evaluate(() => !!document.activeElement?.closest('#panel-menu'))
    expect(iceride).toBe(false)
  }
})
