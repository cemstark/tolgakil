import { test, expect } from '@playwright/test'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// practice_areas.slug UNIQUE ve iki Playwright projesi eş zamanlı koşuyor; her koşum
// kendi damgasını kullanıyor, aksi hâlde ikinci proje "bu adres kullanılıyor" alırdı.
let temizlik: Temizlikci | null = null
let damga = ''

test.beforeEach(async () => {
  temizlik = await temizlikciAc()
  damga = `${Date.now()}${Math.floor(Math.random() * 1000)}`
})

// Referans önce boşaltılıyor: beforeEach fırlarsa afterEach bir ÖNCEKİ testin kapatılmış
// bağlantısını temizlemeye çalışır ve asıl hatayı örter (panel-makale.spec.ts ölçümü).
test.afterEach(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  // silmeyeCalis: kayıt testin kendi akışında arayüzden silindiyse sıfır satır normal.
  await mevcut.silmeyeCalis('DELETE FROM practice_areas WHERE name LIKE ?', [`%${damga}%`])
  await mevcut.kapat()
})

test('admin çalışma alanı ekler, düzenler ve siler', async ({ page }) => {
  const ad = `Deneme Alanı ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari')
  await page.getByRole('link', { name: 'Yeni çalışma alanı' }).click()

  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Bu alanda yürütülen süreçleri anlatan yeterince uzun bir özet metni.')
  await page.locator('[contenteditable="true"]').fill('Alanın ayrıntılı tanıtım metni.')
  await page.getByLabel('Sıra').fill('12')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')
  // Slug alan adından üretilmeli; yönlendirmeden sonra sunucu onu geri okuyor.
  await expect(page.getByLabel('Adres (slug)')).toHaveValue(new RegExp(`^deneme-alani-${damga}$`))

  await page.goto('/panel/calisma-alanlari')
  const satir = page.getByRole('row', { name: new RegExp(ad) })
  await expect(satir.getByText('Yayında')).toBeVisible()
  await expect(satir).toContainText('12')

  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)

  const bildirim = page.getByRole('status')
  await expect(bildirim).toHaveText('Çalışma alanı silindi.')
  await expect(bildirim).toBeFocused()
})

// Reklam yasağı taraması makale ve özgeçmişte vardı, çalışma alanında YOKTU (Görev 8'e
// devreden borç). Oysa "en yüksek başarı oranı" cümlesinin gireceği en olası kutu burası.
// Sözleşme diğer ikisiyle aynı: engel değil sürtünme, ilk gönderimde kayıt YAPILMAZ.
test('yayına alınan çalışma alanında yasaklı ifade önce uyarı üretir', async ({ page }) => {
  const ad = `Boşanma Alanı ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Boşanma davalarında en yüksek başarı oranına sahibiz.')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  // Panel içeriğine daraltıldı: Next kendi rota duyurucusunu body seviyesinde role="alert"
  // ile çiziyor (panel-makale.spec.ts ölçümü).
  const uyari = page.getByRole('main').getByRole('alert')
  await expect(uyari).toContainText('Reklam yasağı')
  await expect(uyari).toContainText('başarı oran')
  // Konum bilgisi de gösterilmeli; yalnız kelime listesi yeterli değil.
  await expect(uyari).toContainText('karakter')
  // Uyarı aşamasında kayıt YAPILMAMIŞ olmalı.
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/calisma-alanlari\/yeni$/)

  await page.getByLabel(/okudum, sorumluluk bende/i).check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')
})

// Yayına alınmayan kayıt taranmıyor: taslak sitede görünmüyor, yazarı taslak aşamasında
// durdurmak sürtünmeyi yanlış yere koyardı.
test('taslak çalışma alanı taramaya takılmadan kaydedilir', async ({ page }) => {
  const ad = `Taslak Alan ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Boşanma davalarında en yüksek başarı oranına sahibiz.')
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')
})

// Görev 8'de ölçülen SESSİZ hata: React 19 form action'dan sonra formu sıfırlıyor ve
// denetimli onay kutusunun işareti geri gelmiyordu. Kullanıcı "Yayında"yı işaretleyip alan
// hatası alıyor, hatayı düzeltip kaydediyor ve yayımladığını sandığı kayıt TASLAK olarak
// yazılıyordu. Hiçbir uyarı yoktu; kayıt sitede görünmediğinde bile nedeni anlaşılmıyordu.
test('başarısız gönderimden sonra "Yayında" işareti düşmez', async ({ page }) => {
  const ad = `İşaret Alanı ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Kısa')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Özet en az 20 karakter olmalı.')).toBeVisible()

  await expect(page.getByLabel('Yayında')).toBeChecked()

  // Asıl iddia kutunun görüntüsü değil SONUCU: düzeltilen form gerçekten yayında kaydetmeli.
  await page.getByLabel('Özet').fill('Bu alanda yürütülen süreçleri anlatan yeterince uzun bir özet metni.')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')

  await page.goto('/panel/calisma-alanlari')
  await expect(page.getByRole('row', { name: new RegExp(ad) }).getByText('Yayında')).toBeVisible()
})

test('kısa özet alan hatası verir ve kayıt yapılmaz', async ({ page }) => {
  const ad = `Kısa Özet ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  await page.getByLabel('Alan adı').fill(ad)
  await page.getByLabel('Özet').fill('Kısa')
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByText('Özet en az 20 karakter olmalı.')).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/calisma-alanlari\/yeni$/)
})
