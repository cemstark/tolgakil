import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  { path: '/hakkimizda', title: 'Hakkımızda' },
  { path: '/kadro', title: 'Kadro' },
  { path: '/calisma-alanlari', title: 'Çalışma Alanları' },
  { path: '/makaleler', title: 'Makaleler' },
  { path: '/iletisim', title: 'İletişim' },
  { path: '/kvkk', title: 'KVKK Aydınlatma Metni' },
  { path: '/cerez-politikasi', title: 'Çerez Politikası' },
] as const

for (const p of PAGES) {
  test(`${p.path} açılır, tek h1 taşır ve erişilebilir`, async ({ page }) => {
    await page.goto(p.path)
    // toBeVisible tekliği kanıtlamaz — isim eşleşmezse strict-mode hiç tetiklenmez.
    // Sayfada tam olarak bir h1 olduğu ayrıca sayılır.
    await expect(page.getByRole('heading', { level: 1, name: p.title })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page).toHaveTitle(`${p.title} | Akıl Hukuk Bürosu`)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(result.violations).toEqual([])
  })
}

// Ana sayfa dahil sekiz rotanın tamamı taranır; yalnızca '/' ölçen bir test bu görevin
// eklediği yedi sayfa hakkında hiçbir şey kanıtlamaz (mutasyon kanıtı task-5-report.md'de).
const OVERFLOW_ROUTES = ['/', ...PAGES.map((p) => p.path)]

for (const path of OVERFLOW_ROUTES) {
  test(`${path} mobilde yatay kaydırma yok`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })
}
