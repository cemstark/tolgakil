import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// Her koşu kendi kayıtlarını üretip siler. Ad damgası benzersiz: iki Playwright projesi
// (masaustu/mobil) aynı anda koşuyor ve lawyers.slug UNIQUE — sabit bir ad ikinci projede
// "bu adres kullanılıyor" hatası verirdi.
let temizlik: Temizlikci | null = null
const damgalar: string[] = []

function yeniAd(onEk: string): string {
  const damga = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  damgalar.push(damga)
  return `${onEk} ${damga}`
}

test.beforeAll(async () => {
  temizlik = await temizlikciAc()
})

test.afterAll(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  for (const damga of damgalar) {
    // silmeyeCalis: kayıtların çoğu testin kendi akışında arayüzden siliniyor, bu yüzden
    // sıfır satır normal. Buradaki iş yarıda kalan koşumların artığını toplamak.
    await mevcut.silmeyeCalis('DELETE FROM lawyers WHERE full_name LIKE ?', [`%${damga}%`])
  }
  await mevcut.kapat()
})

test('admin avukat ekler, yayına alır ve siler', async ({ page }) => {
  const ad = yeniAd('Deneme Avukat')
  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro')
  await page.getByRole('link', { name: 'Yeni avukat' }).click()

  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  // exact zorunlu: "Baro" alt dize olarak "Baro sicil no" etiketiyle de eşleşir ve
  // Playwright iki öğe bulup katı kip ihlali verir.
  await page.getByLabel('Baro', { exact: true }).fill('İstanbul Barosu')
  await page.getByLabel('Baro sicil no').fill('12345')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  await page.goto('/panel/kadro')
  const satir = page.getByRole('row', { name: new RegExp(ad) })
  await expect(satir.getByText('Yayında')).toBeVisible()

  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)

  // Silme sessiz olmamalı: satır kalkınca tetikleyen düğme de gittiği için odak
  // <body>'ye düşerdi ve ekran okuyucu kullanıcısı sonucu hiç öğrenemezdi (WCAG 4.1.3).
  const bildirim = page.getByRole('status')
  await expect(bildirim).toHaveText('Kadro kaydı silindi.')
  await expect(bildirim).toBeFocused()
})

/**
 * `lawyers.practice_start_date` bir `date` sütunu ve gün kaymasının ölçüldüğü tek yer burası.
 *
 * Ölçüm (Görev 7): drizzle'ın varsayılan 'date' kipinde sürücü "2010-03-15" değerini UTC
 * gece yarısına oturan bir Date'e çeviriyor; TZ=America/New_York altında o nesnenin
 * getDate()'i 14 döndürüyor. Sütun mode: 'string' yapıldı — değer hiç Date'e çevrilmiyor.
 * Bu test uçtan uca kanıt: kaydedilen gün hem form alanında hem başlıkta aynı kalmalı.
 */
test('mesleğe başlama tarihi kaydedilip geri okunduğunda gün kaymaz', async ({ page }) => {
  const ad = yeniAd('Tarih Denemesi')
  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.getByLabel('Mesleğe başlama tarihi').fill('2010-03-15')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  // Yönlendirme sonrası sunucu değeri veritabanından okuyor.
  await expect(page.getByLabel('Mesleğe başlama tarihi')).toHaveValue('2010-03-15')
  await expect(page.getByText('Mesleğe başlama: 15 Mart 2010')).toBeVisible()

  // Yeniden yükleme: ilk çizimdeki değer formdan değil gerçekten sütundan geliyor.
  await page.reload()
  await expect(page.getByLabel('Mesleğe başlama tarihi')).toHaveValue('2010-03-15')

  await page.goto('/panel/kadro')
  await page.getByRole('row', { name: new RegExp(ad) }).getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)
})

// Reklam yasağı taraması kadro formunda da çalışıyor: avukat özgeçmişi bu yasağın en
// hassas alanı. ENGEL DEĞİL, onaylı uyarı — ilk gönderimde kayıt YAPILMAZ.
test('kadro formunda yasaklı ifade önce uyarı üretir, onaylanınca kaydeder', async ({ page }) => {
  const ad = yeniAd('Uyari Denemesi')
  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.locator('[contenteditable="true"]').fill('Ceza hukuku alanında uzman görüşü verir.')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  // Panel içeriğine daraltıldı: Next kendi rota duyurucusunu body seviyesinde role="alert"
  // ile çiziyor, daraltılmamış seçici ona da takılır.
  const uyari = page.getByRole('main').getByRole('alert')
  await expect(uyari).toContainText('Reklam yasağı')
  await expect(uyari).toContainText('uzman')
  await expect(uyari).toContainText('karakter')
  // Uyarı aşamasında kayıt YAPILMAMIŞ olmalı.
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/kadro\/yeni$/)

  await page.getByLabel(/okudum, sorumluluk bende/i).check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  await page.goto('/panel/kadro')
  await page.getByRole('row', { name: new RegExp(ad) }).getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)
})

test('kadro listesinde ve formunda erişilebilirlik ihlali yok', async ({ page }) => {
  await girisYap(page, ADMIN)

  for (const adres of ['/panel/kadro', '/panel/kadro/yeni', '/panel/ayarlar', '/panel/kategoriler']) {
    await page.goto(adres)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations, `${adres} ihlalleri`).toEqual([])
  }
})

/**
 * Ayarlar TEK SATIRLIK bir tabloyu güncelliyor, yani bu testler paylaşılan durumu yazıyor.
 * İki Playwright projesi eş zamanlı koşuyor; ikisi de yazsaydı biri diğerinin değerini
 * ezer ve geri okuma iddiası rastgele kırılırdı. Bu yüzden yalnız tek projede koşuyorlar.
 * Kaybedilen kapsam yok: ölçülen şey sunucu davranışı, tarayıcı genişliği değil.
 */
test('ayarlar formu kaydedip geri okuduğunda değeri korur', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'Ayarlar tek satırlık tablo; projeler arası yarışı önlemek için tek projede koşar.')

  const temizlikci = await temizlikciAc()
  try {
    const [oncekiSatir] = await temizlikci.sorgu<{ phone: string }>('SELECT phone FROM settings WHERE id = 1', [])
    if (oncekiSatir === undefined) throw new Error('settings satırı yok; `npm run db:seed` çalıştırılmalı.')

    const telefon = `+90 216 000 ${String(Date.now()).slice(-4)}`
    await girisYap(page, ADMIN)
    await page.goto('/panel/ayarlar')
    await page.getByLabel('Telefon', { exact: true }).fill(telefon)
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Ayarlar kaydedildi.')

    // reload: değerin formda değil GERÇEKTEN sütunda durduğunun kanıtı.
    await page.reload()
    await expect(page.getByLabel('Telefon', { exact: true })).toHaveValue(telefon)

    // Tohum değeri geri konuyor; test geliştirme veritabanına kalıcı iz bırakmasın.
    await temizlikci.sil('UPDATE settings SET phone = ? WHERE id = 1', [oncekiSatir.phone])
  } finally {
    await temizlikci.kapat()
  }
})

test('geçersiz e-posta ayarları kaydettirmez', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'Ayarlar tek satırlık tablo; projeler arası yarışı önlemek için tek projede koşar.')

  await girisYap(page, ADMIN)
  await page.goto('/panel/ayarlar')
  await page.getByLabel('E-posta', { exact: true }).fill('bu-bir-eposta-degil')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Geçerli bir e-posta adresi girin.')).toBeVisible()
  // Kayıt yapılmadıysa başarı bildirimi de olmamalı.
  await expect(page.getByRole('status')).toHaveCount(0)
})

// Harita koordinatları settingsSchema'da ZORUNLU bir anahtar. Forma konmasalardı kullanıcı
// hiç görmediği bir alan için "Beklenen dize" hatası alırdı (Görev 1-2 sözleşmesi).
test('harita koordinatları formda çizilir ve boş bırakılabilir', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'Ayarlar tek satırlık tablo; projeler arası yarışı önlemek için tek projede koşar.')

  await girisYap(page, ADMIN)
  await page.goto('/panel/ayarlar')
  await expect(page.getByLabel('Harita enlemi')).toBeVisible()
  await page.getByLabel('Harita enlemi').fill('')
  await page.getByLabel('Harita boylamı').fill('')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Ayarlar kaydedildi.')

  await page.getByLabel('Harita enlemi').fill('kuzey')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Koordinat sayı olmalı.')).toBeVisible()
})
