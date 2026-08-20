import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN, EDITOR } from './helpers/auth'
import { panelGezinmesiniAc } from './helpers/panel-nav'

test('panelde genel site başlığı ve alt bilgisi görünmez', async ({ page }) => {
  await girisYap(page, ADMIN)
  await expect(page.getByRole('navigation', { name: 'Ana gezinme' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Alt bilgi gezinmesi' })).toHaveCount(0)
  // SiteFooter'ın tamamı: "Yasal" gezinmesi olmayan bir sızıntıyı da yakalar.
  await expect(page.getByRole('contentinfo')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Panel gezinmesi' })).toBeVisible()
})

// Giriş sayfası da panel layout'unun altında; koruma layout'a konulamadığı için (sonsuz
// yönlendirme) gezinmenin oturumsuz istekte çizilmediği ayrıca doğrulanıyor.
test('giriş sayfasında panel gezinmesi çizilmez', async ({ page }) => {
  await page.goto('/panel/giris')
  await expect(page.getByRole('heading', { name: 'Panel Girişi' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Panel gezinmesi' })).toHaveCount(0)
})

// Görev 8'de gezinme mobilde açılır panele döndü; bağlantı ölçen testler önce paneli
// açıyor. İddialar değişmedi — yalnız ölçüm mobilde de mümkün hâle getirildi.
test('admin panel gezinmesinde bütün bölümleri görür', async ({ page }) => {
  await girisYap(page, ADMIN)
  await panelGezinmesiniAc(page)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  for (const ad of ['Makaleler', 'Medya', 'Kadro', 'Çalışma Alanları', 'Kategoriler', 'Mesajlar', 'Kullanıcılar', 'Ayarlar']) {
    await expect(nav.getByRole('link', { name: ad })).toBeVisible()
  }
})

test('editor panel gezinmesinde yalnız makale ve medya görür', async ({ page }) => {
  await girisYap(page, EDITOR)
  await panelGezinmesiniAc(page)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  await expect(nav.getByRole('link', { name: 'Makaleler' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Medya' })).toBeVisible()
  for (const ad of ['Kadro', 'Çalışma Alanları', 'Kategoriler', 'Mesajlar', 'Kullanıcılar', 'Ayarlar']) {
    await expect(nav.getByRole('link', { name: ad })).toHaveCount(0)
  }
})

// Gösterge sayfasındaki olumlu iddia marka bağlantısını ölçüyor, o da PANEL_LINKS
// döngüsünden değil AYRI bir kod yolundan geliyor. Önek eşleşmesi yükleminin kendisi
// navigation.test.ts'te; buradaki iş bağlanışın gerçekten kurulduğunu göstermek.
test('bulunulan panel bölümü aria-current ile işaretlenir', async ({ page }) => {
  await girisYap(page, ADMIN)
  await panelGezinmesiniAc(page)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  await expect(nav.getByRole('link', { name: 'Panel' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Makaleler' })).not.toHaveAttribute('aria-current', 'page')
})

// Görev 4'ten devreden kapsam boşluğu burada kapanıyor: PANEL_LINKS döngüsündeki
// `aria-current={isCurrent(l.href) ...}` bağlanışı artık gerçek bir bölümle ölçülüyor.
// O bağlanış silinirse bu test kırılır, önceki test kırılmazdı.
test('makaleler bölümünde yalnız Makaleler bağlantısı aria-current taşır', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/makaleler')
  await panelGezinmesiniAc(page)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  await expect(nav.getByRole('link', { name: 'Makaleler' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Medya' })).not.toHaveAttribute('aria-current', 'page')
  // Marka bağlantısı tam eşleşme kullanıyor; /panel öneki her rotada etkin görünmemeli.
  await expect(nav.getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current', 'page')
})

// Alt rota da üst bölümü işaretli tutar (isCurrentPath önek yüklemi).
test('yeni makale sayfasında Makaleler bölümü işaretli kalır', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/makaleler/yeni')
  await panelGezinmesiniAc(page)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  await expect(nav.getByRole('link', { name: 'Makaleler' })).toHaveAttribute('aria-current', 'page')
})

test('panel göstergesi sayı kartlarını gösterir', async ({ page }) => {
  await girisYap(page, ADMIN)
  await expect(page.getByRole('heading', { level: 1, name: 'Panel' })).toBeVisible()
  // Sayının kendisi tohum verisine bağlı; kartın etiketiyle birlikte bir SAYI bastığı
  // doğrulanıyor — boş bir kart iskeleti bu iddiayı geçemez.
  for (const etiket of ['Taslak makale', 'Yayımlanmış makale', 'Okunmamış mesaj']) {
    const kart = page.getByRole('listitem').filter({ hasText: etiket })
    await expect(kart).toBeVisible()
    await expect(kart).toContainText(/\d/)
  }
})

test('editor okunmamış mesaj kartını görmez', async ({ page }) => {
  await girisYap(page, EDITOR)
  await expect(page.getByText('Taslak makale')).toBeVisible()
  await expect(page.getByText('Okunmamış mesaj')).toHaveCount(0)
})

test('panelin kendi atlama bağlantısı klavyeyle çalışır', async ({ page }) => {
  await girisYap(page, ADMIN)
  // Giriş formundan gelen odak taşınmasın; sekme sırası temiz bir yüklemeden ölçülüyor.
  await page.goto('/panel')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'İçeriğe atla' })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page.locator('#panel-content')).toBeFocused()
})

test('panelde erişilebilirlik ihlali yok', async ({ page }) => {
  await girisYap(page, ADMIN)
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('genel sayfalar kabuğu ve 404 kabuğu taşımaya devam eder', async ({ page }) => {
  const res = await page.goto('/olmayan-sayfa')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible()
  // Rota grubu taşımasının kabuğu 404'te düşürmediğinin kanıtı:
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('link', { name: 'İçeriğe atla' })).toHaveCount(1)
})
