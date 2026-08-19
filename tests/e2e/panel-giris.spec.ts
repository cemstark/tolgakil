import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN, EDITOR } from './helpers/auth'

// Hız sınırı IP başına 15 dakikada 5 deneme veriyor ve Next dev sunucusu her isteğe
// x-forwarded-for: ::1 koyuyor (ölçüldü) — yani başlık verilmezse dosyadaki bütün testler
// tek bir bütçeyi paylaşır ve iki proje birlikte koşarken sekizinci deneme kilitlenir.
// Her test kendi istemcisiymiş gibi davranıyor; sınırın kendisi ayrı bir testte ölçülüyor.
test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `test-${testInfo.testId}` })
})

test('oturumsuz kullanıcı panele giremez, giriş sayfasına yönlenir', async ({ page }) => {
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/giris/)
  await expect(page.getByRole('heading', { level: 1, name: 'Panel Girişi' })).toBeVisible()
})

test('yanlış parola alan bazında Türkçe hata gösterir ve oturum açmaz', async ({ page }) => {
  await page.goto('/panel/giris')
  await page.getByLabel('E-posta').fill(ADMIN.email)
  await page.getByLabel('Parola').fill('kesinlikle-yanlis-parola')
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  // Lokatör forma daraltıldı: Next kendi rota duyurucusunu (#__next-route-announcer__) da
  // role="alert" ile basıyor, sayfa genelinde arayınca iki eşleşme çıkıyor (ölçüldü).
  await expect(page.locator('form').getByRole('alert')).toHaveText('E-posta veya parola hatalı.')
  await expect(page).toHaveURL(/\/panel\/giris/)
})

test('doğru bilgiyle giriş panele düşürür ve kullanıcı adını gösterir', async ({ page }) => {
  await girisYap(page, ADMIN)
  await expect(page).toHaveURL(/\/panel$/)
  await expect(page.getByText(ADMIN.name)).toBeVisible()
})

test('çıkış yapınca panel yeniden korumaya girer', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.getByRole('button', { name: 'Çıkış yap' }).click()
  await expect(page).toHaveURL(/\/panel\/giris/)
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/giris/)
})

// Bu yönlendirmeyi giriş sayfası kendisi yapıyor: next-auth proxy'si giriş sayfasında
// yönlendirmeyi atladığı için authorized callback'i oturumu açık kullanıcıyı geri göndermiyor.
test('oturumu açık kullanıcı giriş sayfasını görmez, panele döner', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/giris')
  await expect(page).toHaveURL(/\/panel$/)
})

// Sayaç sunucu süreci boyunca yaşıyor; bu yüzden test sabit bir deneme sayısına değil,
// "sınır mesajı çıkana kadar dene" kuralına dayanıyor: sunucu yeniden kullanılırsa da geçerli.
// beforeEach bu teste kendi x-forwarded-for anahtarını verdiği için tükettiği bütçe
// diğer testleri etkilemiyor; kayıtlı olmayan e-posta kullanılıyor ki tohum kullanıcılarının
// lastLoginAt kaydı gereksizce dolmasın.
test('art arda başarısız denemeler hız sınırına takılır', async ({ page }) => {
  await page.goto('/panel/giris')
  const uyari = page.locator('form').getByRole('alert')

  for (let deneme = 0; deneme < 6; deneme += 1) {
    await page.getByLabel('E-posta').fill('hiz-siniri@ornek.test')
    await page.getByLabel('Parola').fill('kesinlikle-yanlis-parola')
    // Gönderim yanıtı beklenir: iki deneme arasında mesaj metni aynı kaldığı için
    // metne bakarak beklemek yarış koşulu olurdu.
    const yanit = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/panel/giris'),
    )
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    await yanit
    await expect(uyari).toBeVisible()
    if ((await uyari.textContent())?.startsWith('Çok fazla deneme')) break
  }

  await expect(uyari).toHaveText(/^Çok fazla deneme yapıldı\. \d+ dakika sonra tekrar deneyin\.$/)
})

test('giriş sayfasında erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/panel/giris')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})
