import { randomBytes } from 'node:crypto'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adimiAc } from './helpers/editor'
import { girisYap, EDITOR } from './helpers/auth'
import { benzersizGorsel, medyaTemizle } from './helpers/test-media'
import { testIcerigiHazirla, type TestIcerigi } from './helpers/test-content'

// Her test kendi damgasını taşır; temizlik hem veritabanı satırını hem DİSKTEKİ dosyayı
// siler. Arayüzden silinen görseller için de çağrılıyor: test yarıda kalırsa artık kalmasın.
let damga = ''

test.beforeEach(() => {
  damga = `e2e${randomBytes(5).toString('hex')}`
})

test.afterEach(async () => {
  await medyaTemizle(damga)
})

test('alt metin olmadan yükleme reddedilir', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
  await page.getByRole('button', { name: 'Yükle' }).click()

  // Zorunluluk SUNUCUDA: form noValidate, yani tarayıcı balonu gönderimi durdurmuyor ve
  // görünen metin sunucunun kararı. İstemcideki `required` yalnız kolaylık.
  await expect(page.getByText('Alt metin zorunlu — görselin ne gösterdiğini yazın.')).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('alt metinle yüklenen görsel listede ve servis adresinde erişilebilir', async ({ page }) => {
  // Bu test yeni yüklenen bir dosyayı next/image iyileştiricisinden geçiriyor: geliştirme
  // sunucusunda hem rota derlemesi hem sharp dönüşümü ilk istekte yapılıyor. Ölçüldü
  // (Görev 8): dosya tek başına 19 saniyede geçiyor, tam süit altında (argon2 girişleri +
  // istek başına derleme) 30 saniyelik varsayılan bütçeyi aşıyordu. Üretim derlemesinde
  // (CI=1) sorun yok. İddialar değişmedi, yalnız bütçe gerçeğe uyduruldu.
  test.slow()
  const alt = `Kırmızı nokta ${damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
  await page.getByLabel('Alt metin').fill(alt)
  await page.getByRole('button', { name: 'Yükle' }).click()

  // Yükleme bildirimi ve silme bildirimi TEK canlı bölgeyi paylaşıyor; ikisi aynı anda
  // görünürse kullanıcı hangi işlemin sonucuna baktığını anlayamaz (ölçüldü, düzeltildi).
  const bildirim = page.getByRole('status')
  await expect(bildirim).toHaveText('Görsel yüklendi.')
  await expect(bildirim).toBeFocused()

  const gorsel = page.getByRole('img', { name: alt })
  await expect(gorsel).toBeVisible()
  const src = await gorsel.getAttribute('src')
  expect(src).toBeTruthy()

  // Servis rotası gerçekten dosya döndürmeli; kırık görsel testten kaçmasın.
  const yanit = await page.request.get(src as string)
  expect(yanit.status()).toBe(200)
  expect(yanit.headers()['content-type']).toContain('image/')

  // Yukarıdaki adres next/image iyileştiricisine ait. Ham servis rotası da ayrıca
  // ölçülüyor: iyileştirici arada durduğu için /medya/... bozuk olsa bile test geçebilirdi.
  const hamAdres = new URL(src as string, 'http://localhost:3000').searchParams.get('url')
  expect(hamAdres).toMatch(/^\/medya\//)
  const hamYanit = await page.request.get(hamAdres as string)
  expect(hamYanit.status()).toBe(200)
  expect(hamYanit.headers()['content-type']).toBe('image/webp')
  // Dosya adı içerik özeti olduğu için değişmez önbellekleme güvenli; başlık da bunu demeli.
  expect(hamYanit.headers()['cache-control']).toContain('immutable')

  await page.getByRole('button', { name: `${alt} görselini sil` }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('img', { name: alt })).toHaveCount(0)

  // Silme sessiz olmamalı: kart kalkınca tetikleyen düğme de gittiği için odak <body>'ye
  // düşerdi ve ekran okuyucu kullanıcısı sonucu hiç öğrenemezdi (WCAG 4.1.3).
  await expect(bildirim).toHaveText('Görsel silindi.')
  await expect(bildirim).toBeFocused()

  // Kayıt gittiyse dosya da gitmeli; aksi hâlde disk sessizce dolar.
  const silmeSonrasi = await page.request.get(hamAdres as string)
  expect(silmeSonrasi.status()).toBe(404)
})

test('dizin dışına çıkmaya çalışan servis isteği dosya sızdırmaz', async ({ page }) => {
  for (const adres of [
    '/medya/..%2f..%2fpackage.json',
    '/medya/%2e%2e/%2e%2e/package.json',
    '/medya/..%5c..%5cpackage.json',
    '/medya/2026/../../../package.json',
  ]) {
    const yanit = await page.request.get(adres)
    expect([400, 404], `${adres} durumu`).toContain(yanit.status())
    expect(await yanit.text(), `${adres} gövdesi`).not.toContain('"name": "tolga-akil-hukuk"')
  }
})

test('var olmayan görsel 404 döner, uzantısız istek 400', async ({ page }) => {
  expect((await page.request.get('/medya/2026/08/0000000000000000.webp')).status()).toBe(404)
  expect((await page.request.get('/medya/2026')).status()).toBe(400)
})

// React 19 form action'dan SONRA denetimsiz alanları sıfırlıyor ve <input type="file">
// denetimli yazılamıyor. Ölçüldü: düzeltme olmadan başarısız gönderimde seçilen dosya
// sessizce kayboluyor, kullanıcı alt metni düzeltip yeniden gönderince bu kez
// "Yüklenecek bir dosya seçin." hatası alıyor ve neyi yanlış yaptığını anlamıyordu.
test('başarısız gönderimden sonra seçilen dosya korunur', async ({ page }) => {
  const alt = `Korunan dosya ${damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
  // Üç karakterden kısa: alan hatası döner, dosya işlenmez.
  await page.getByLabel('Alt metin').fill('ab')
  await page.getByRole('button', { name: 'Yükle' }).click()
  await expect(page.getByText('Alt metin zorunlu — görselin ne gösterdiğini yazın.')).toBeVisible()

  // Girdi boşaldı ama seçim korunuyor; kullanıcıya hangi dosyanın gönderileceği söyleniyor.
  await expect(page.getByText(/^Seçili dosya: nokta\.png/)).toBeVisible()

  // Dosya YENİDEN seçilmiyor: yalnız alt metin düzeltilip gönderiliyor.
  await page.getByLabel('Alt metin').fill(alt)
  await page.getByRole('button', { name: 'Yükle' }).click()
  await expect(page.getByRole('img', { name: alt })).toBeVisible()
})

// İstemcinin bildirdiği MIME tipine değil dosyanın gerçek içeriğine bakılıyor: metin
// dosyasına "image/png" yazmak tek satırlık iş.
test('görsel olmayan dosya Türkçe alan hatası verir', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'sahte.png', mimeType: 'image/png', buffer: Buffer.from('bu bir metin dosyası') })
  await page.getByLabel('Alt metin').fill(`Sahte görsel ${damga}`)
  await page.getByRole('button', { name: 'Yükle' }).click()

  await expect(page.getByText('Yüklenen dosya geçerli bir görsel değil.')).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

// Next'in server action gövde sınırı ölçüldü: aşılırsa istek action'a HİÇ ulaşmıyor ve
// kullanıcı alan hatası değil "Bir hata oluştu" sayfası görüyor. Sınırın altında kalan
// büyük dosyalar sunucuda, üstündekiler daha gönderilmeden istemcide durduruluyor.
test('sınırı aşan dosya hata sayfası değil Türkçe uyarı verir', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page.getByLabel('Görsel dosyası').setInputFiles({
    name: 'devasa.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(9 * 1024 * 1024),
  })

  await expect(page.getByText('Görsel çok büyük: en fazla 8 MB yükleyebilirsiniz.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yükle' })).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'Bir hata oluştu' })).toHaveCount(0)
})

test('yüklenen görsel makaleye kapak olarak bağlanır ve seçim korunur', async ({ page }) => {
  const alt = `Kapak görseli ${damga}`
  let icerik: TestIcerigi | null = null

  try {
    icerik = await testIcerigiHazirla()
    // Başlık, temizliğin kullandığı damgayı taşımak ZORUNDA: testIcerigiHazirla kendi
    // damgasıyla `DELETE FROM articles WHERE title LIKE ?` çalıştırıyor. Medya damgası
    // kullanıldığında hiçbir satır eşleşmiyordu ve her koşu veritabanına bir makale
    // bırakıyordu — sessizce, çünkü silme sıfır satır etkilemek de "başarılı" sayılır.
    const baslik = `Kapaklı makale ${icerik.damga}`
    await girisYap(page, EDITOR)
    await page.goto('/panel/medya')
    await page
      .getByLabel('Görsel dosyası')
      .setInputFiles({ name: 'kapak.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
    await page.getByLabel('Alt metin').fill(alt)
    await page.getByRole('button', { name: 'Yükle' }).click()
    await expect(page.getByRole('img', { name: alt })).toBeVisible()

    await page.goto('/panel/makaleler/yeni')
    await page.getByLabel('Başlık').fill(baslik)
    await page.getByLabel('Özet').fill('Kapak görseli seçiminin kaydedildiğini ölçen taslak özeti.')
    await page.locator('[contenteditable="true"]').fill('Gövde metni.')
    await adimiAc(page, 'Görsel')
    await page.getByRole('radio', { name: alt }).check()
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    await expect(page.getByRole('status')).toBeVisible()

    // Yeni kayıt düzenleme adresine yönlendiriyor ve bildirimi ADRESTE taşıyor
    // (?kaydedildi=draft). Sorgusuz adrese geçiliyor: bildirim orada kalsaydı ikinci
    // kaydetmenin bildirimi "zaten görünür" sayılır ve sonraki reload kaydın bitmesini
    // beklemeden koşardı. Ölçüldü: iki proje birlikte koşarken test böyle kırılıyordu.
    await page.goto(new URL(page.url()).pathname)
    await expect(page.getByRole('status')).toHaveCount(0)

    // Seçim veritabanından geliyor; yalnız istemci durumu olsaydı kapak sessizce kaybolur
    // ve kimse fark etmezdi.
    await adimiAc(page, 'Görsel')
    await expect(page.getByRole('radio', { name: alt })).toBeChecked()

    // GÜNCELLEME yolu ayrıca ölçülüyor: kapak alanı yalnız insert'e konsaydı buradaki
    // "Kapak yok" seçimi sessizce yok sayılır, alan yalnız update'e konsaydı yukarıdaki
    // ilk kayıt kapaksız kalırdı.
    await adimiAc(page, 'Görsel')
    await page.getByRole('radio', { name: 'Kapak yok' }).check()
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
    await page.reload()
    await adimiAc(page, 'Görsel')
    await expect(page.getByRole('radio', { name: 'Kapak yok' })).toBeChecked()
    await expect(page.getByRole('radio', { name: alt })).not.toBeChecked()
  } finally {
    // Makale kapağı NULL'a düşsün diye önce makale siliniyor; medya temizliği afterEach'te.
    await icerik?.temizle()
  }
})

// İkinci silmede adres değişmezse form yeniden kurulmaz, odaklama effect'i bir daha
// koşmaz ve bildirim metni de aynı kaldığı için canlı bölge duyuru yapmaz: tetikleyen
// düğme kartla birlikte kalktığından odak <body>'ye düşer ve kullanıcı ikinci silmenin
// olup olmadığını hiç öğrenemez (WCAG 4.1.3).
test('arka arkaya iki silmede de bildirim duyurulur', async ({ page }) => {
  const altMetinler = [`Birinci nokta ${damga}`, `İkinci nokta ${damga}`]
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')

  for (const alt of altMetinler) {
    await page
      .getByLabel('Görsel dosyası')
      .setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
    await page.getByLabel('Alt metin').fill(alt)
    await page.getByRole('button', { name: 'Yükle' }).click()
    await expect(page.getByRole('img', { name: alt })).toBeVisible()
  }

  for (const alt of altMetinler) {
    await page.getByRole('button', { name: `${alt} görselini sil` }).click()
    await page.getByRole('button', { name: 'Evet, sil' }).click()
    await expect(page.getByRole('img', { name: alt })).toHaveCount(0)

    const bildirim = page.getByRole('status')
    await expect(bildirim).toHaveText('Görsel silindi.')
    await expect(bildirim).toBeFocused()
  }
})

// Kapak görseli SET NULL kısıtıyla bağlı, yani hedefi gerçekten kaybolabiliyor
// (categoryId/authorId'de RESTRICT var, o açık yok). Doğrulanmazsa karşılıksız yabancı
// anahtar veritabanından yukarı çıkar, hata sınırı formu değiştirir ve yazarın metni gider.
test('silinmiş kapak görseliyle kaydetme yazıyı kaybettirmez', async ({ page, context }) => {
  const alt = `Silinecek kapak ${damga}`
  const govde = 'Kapağı başka bir oturumda silinen makalenin gövdesi.'
  let icerik: TestIcerigi | null = null

  try {
    icerik = await testIcerigiHazirla()
    const baslik = `Kapağı silinen makale ${icerik.damga}`
    await girisYap(page, EDITOR)

    await page.goto('/panel/medya')
    await page
      .getByLabel('Görsel dosyası')
      .setInputFiles({ name: 'kapak.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
    await page.getByLabel('Alt metin').fill(alt)
    await page.getByRole('button', { name: 'Yükle' }).click()
    await expect(page.getByRole('img', { name: alt })).toBeVisible()

    // Editör A formu açıyor, kapağı seçiyor ama HENÜZ kaydetmiyor.
    await page.goto('/panel/makaleler/yeni')
    await page.getByLabel('Başlık').fill(baslik)
    await page.getByLabel('Özet').fill('Kapağı silinen makalenin kaydedilişini ölçen özet metni.')
    await page.locator('[contenteditable="true"]').fill(govde)
    await adimiAc(page, 'Görsel')
    await page.getByRole('radio', { name: alt }).check()

    // Editör B aynı oturumda görseli siliyor.
    const digerSekme = await context.newPage()
    await digerSekme.goto('/panel/medya')
    await digerSekme.getByRole('button', { name: `${alt} görselini sil` }).click()
    await digerSekme.getByRole('button', { name: 'Evet, sil' }).click()
    await expect(digerSekme.getByRole('img', { name: alt })).toHaveCount(0)
    await digerSekme.close()

    // A kaydediyor: hata SAYFASI değil alan hatası dönmeli ve yazdıkları durmalı.
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    await expect(page.getByText('Seçilen kapak görseli artık kitaplıkta yok; yeniden seçin.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bir hata oluştu' })).toHaveCount(0)
    await expect(page.getByLabel('Başlık')).toHaveValue(baslik)
    await expect(page.locator('[contenteditable="true"]')).toContainText(govde)

    // Kapağı kaldırıp kaydetmek çalışmalı: kullanıcı çıkmaza sokulmuyor.
    await adimiAc(page, 'Görsel')
    await page.getByRole('radio', { name: 'Kapak yok' }).check()
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    await expect(page.getByRole('status')).toBeVisible()
  } finally {
    await icerik?.temizle()
  }
})

test('medya sayfasında ve silme onayında erişilebilirlik ihlali yok', async ({ page }) => {
  const alt = `Erişim görseli ${damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'erisim.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
  await page.getByLabel('Alt metin').fill(alt)
  await page.getByRole('button', { name: 'Yükle' }).click()
  await expect(page.getByRole('img', { name: alt })).toBeVisible()

  const sayfaSonucu = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sayfaSonucu.violations).toEqual([])

  await page.getByRole('button', { name: `${alt} görselini sil` }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const kipSonucu = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(kipSonucu.violations).toEqual([])
})

// Editör A kapak seçicisini açıkken B aynı görseli kitaplıktan siliyor: dosya gitti ama
// seçenek A'nın sayfasında duruyor. Yedek olmadan kırık bir görsel simgesi çiziliyordu ve
// kullanıcı neyi seçtiğini anlamıyordu (Görev 8'e devreden borç).
//
// Kayıt gerçekten silinmiyor, YALNIZ bu görselin isteği 404'e çevriliyor: aynı sonucu
// üretir, veritabanına eş zamanlı koşan başka testlerin göreceği kırık bir satır bırakmaz
// ve sayfadaki diğer görselleri (başka koşumların kitaplık kayıtları) etkilemez.
test('yüklenemeyen küçük resmin yerine anlamlı bir yedek çizilir', async ({ page }) => {
  const alt = `Kaybolan görsel ${damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'kayip.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
  await page.getByLabel('Alt metin').fill(alt)
  await page.getByRole('button', { name: 'Yükle' }).click()
  const yuklenen = page.getByRole('img', { name: alt })
  await expect(yuklenen).toBeVisible()

  // İyileştirici adresi ham yolu `url` parametresinde taşıyor; süzgeç ona bakıyor.
  const hamYol = new URL(await yuklenen.getAttribute('src') ?? '', 'http://localhost:3000')
    .searchParams.get('url')
  if (hamYol === null) throw new Error('Yüklenen görselin ham yolu okunamadı.')

  await page.route('**/_next/image**', async (route) => {
    if (route.request().url().includes(encodeURIComponent(hamYol))) {
      await route.fulfill({ status: 404, body: '' })
      return
    }
    await route.continue()
  })
  await page.goto('/panel/makaleler/yeni')
  // Kapak seçimi mobilde ikinci adımda (üç adımlı sihirbaz); masaüstünde bu çağrı
  // sessizce hiçbir şey yapmıyor.
  await adimiAc(page, 'Görsel')

  // Seçenek hâlâ seçilebilir olmalı: kullanıcı çıkmaza sokulmuyor, yalnız durumu görüyor.
  const secenek = page.getByRole('radio', { name: alt })
  await expect(secenek).toBeVisible()
  await expect(page.locator('label').filter({ has: secenek })).toContainText('Görsel yok')
})

// Alt metin düzeltme "tüm planlar" turunda eklendi ve YENİ BİR SUNUCU EYLEMİ gerektirdi
// (updateMediaAlt). Daha önce metin yalnız YÜKLEME anında giriliyordu; yanlış yazılmış
// bir metni düzeltmenin tek yolu görseli silip yeniden yüklemekti — kapak olarak bağlı
// olduğu makaleler de o sırada bağlantısını kaybediyordu (FK SET NULL).
test('kitaplıktaki görselin alt metni detay panelinden düzeltilir', async ({ page }) => {
  test.slow()
  const alt = `Ilk metin ${damga}`
  const yeni = `Duzeltilmis metin ${damga}`

  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page
    .getByLabel('Görsel dosyası')
    .setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: await benzersizGorsel() })
  await page.getByLabel('Alt metin').fill(alt)
  await page.getByRole('button', { name: 'Yükle' }).click()
  await expect(page.getByRole('status')).toHaveText('Görsel yüklendi.')

  // Yüklenen kayıt seçili gelmiyorsa kartından seçiliyor.
  const detay = page.getByRole('complementary', { name: 'Seçili görselin ayrıntısı' })
  await expect(detay).toBeVisible()
  const secim = page.getByRole('link', { name: `Seç: ${alt}` })
  if (await secim.isVisible()) await secim.click()

  // Boş metin SUNUCUDA reddediliyor; alan zorunlu (mediaSchema, yükleme ile aynı şema).
  await detay.getByLabel('Alt metni düzenle').fill('')
  await detay.getByRole('button', { name: 'Alt metni kaydet' }).click()
  await expect(page.getByText('Alt metin zorunlu — görselin ne gösterdiğini yazın.')).toBeVisible()

  await detay.getByLabel('Alt metni düzenle').fill(yeni)
  await detay.getByRole('button', { name: 'Alt metni kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Alt metin kaydedildi.')

  // Kitaplıktaki görselin erişilebilir adı gerçekten değişti — alt metin veritabanına
  // yazıldı, yalnız ekranda değil.
  await expect(page.getByRole('img', { name: yeni })).toBeVisible()
  await expect(page.getByRole('img', { name: alt })).toHaveCount(0)
})
