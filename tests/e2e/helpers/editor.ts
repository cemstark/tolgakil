import type { Page } from '@playwright/test'

/**
 * Makale editörünün adımını açar.
 *
 * Editör ≤1100px'te üç adımlı bir sihirbaz (devir tasarımı 4a): Metin / Görsel / Yayın.
 * Alanlar her adımda DOM'da kalıyor ama `display: none` ile gizlendiği için Playwright
 * onlara ancak adım açıkken erişebiliyor — gerçek kullanıcının yaşadığı akışın aynısı.
 *
 * Masaüstünde adım çubuğu HİÇ çizilmiyor; yardımcı orada sessizce hiçbir şey yapmıyor,
 * yani her iki projede de aynı test kodu koşabiliyor.
 */
export async function adimiAc(page: Page, ad: 'Metin' | 'Görsel' | 'Yayın'): Promise<void> {
  const adim = page.getByRole('button', { name: ad })
  if (await adim.isVisible()) await adim.click()
}
