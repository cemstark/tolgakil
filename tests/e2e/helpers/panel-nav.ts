import type { Page } from '@playwright/test'

/**
 * Panel gezinmesini açar; zaten açıksa hiçbir şey yapmaz.
 *
 * 768 pikselin altında gezinme bir açılır panel (SiteHeader ile aynı desen) ve bağlantılar
 * `display: none` altında — erişilebilirlik ağacından da düşüyorlar. Bağlantı ölçen testler
 * bu yüzden mobil projede önce paneli açmak zorunda. Düğme masaüstünde `display: none`
 * olduğu için görünürlük denetimi iki projeyi de tek kod yolunda tutuyor; testlerin
 * proje adına bakması gerekmiyor.
 *
 * İsim yerine ilişkiye bağlanıyor: düğmenin metni açık/kapalıya göre değişiyor.
 */
export async function panelGezinmesiniAc(page: Page): Promise<void> {
  const dugme = page.locator('[aria-controls="panel-menu"]')
  if (await dugme.isVisible()) {
    if ((await dugme.getAttribute('aria-expanded')) === 'false') await dugme.click()
  }
}
