import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, EDITOR } from './helpers/auth'
import { panelGezinmesiniAc } from './helpers/panel-nav'
import { testIcerigiHazirla, type TestIcerigi } from './helpers/test-content'

// Her koşu kendi kategorisini ve makalelerini üretip siler; testler geliştirme veritabanına
// karşı koşsun, birbirine ve tohum verisine karışmasın.
let icerik: TestIcerigi | null = null

test.beforeEach(async () => {
  icerik = await testIcerigiHazirla()
})

// Referans önce boşaltılıyor: beforeEach fırlarsa afterEach bir ÖNCEKİ testin kapatılmış
// bağlantısını temizlemeye çalışır, "Can't add new command when connection is in closed
// state" fırlatır ve asıl hatayı örter.
test.afterEach(async () => {
  const mevcut = icerik
  icerik = null
  await mevcut?.temizle()
})

// Editör ≤1100px'te üç adımlı bir sihirbaz (devir tasarımı 4a): kategori ve yazar
// üçüncü adımda. Masaüstünde adım çubuğu hiç çizilmiyor, o yüzden yardımcı orada sessizce
// hiçbir şey yapmıyor. Alanlar DOM'da kalıyor ama display:none ile gizlendiği için
// Playwright onlara ancak adım açıkken erişebiliyor — gerçek kullanıcının yaşadığı akışın
// aynısı.
async function adimiAc(page: Page, ad: 'Metin' | 'Görsel' | 'Yayın'): Promise<void> {
  const adim = page.getByRole('button', { name: ad })
  if (await adim.isVisible()) await adim.click()
}

async function yayinAdiminiAc(page: Page): Promise<void> {
  await adimiAc(page, 'Yayın')
}

function hazirIcerik(): TestIcerigi {
  if (icerik === null) throw new Error('Test içeriği hazırlanmadı; beforeEach düşmüş olmalı.')
  return icerik
}

test('giriş → makale yaz → taslak kaydet → yayımla → listede yayında görünür', async ({ page }) => {
  const baslik = `Kira tespit notu ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  // Gezinme mobilde açılır panel (Görev 8); bağlantıya basmadan önce açılıyor.
  await panelGezinmesiniAc(page)
  await page.getByRole('link', { name: 'Makaleler' }).click()
  await page.getByRole('link', { name: 'Yeni makale' }).click()

  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Kira bedelinin belirlenmesinde uygulanan ölçütler üzerine kısa not.')
  await page.locator('[contenteditable="true"]').fill('Kiracının hakları ve süreler.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  await expect(page.getByLabel('Adres (slug)')).toHaveValue(new RegExp(`^kira-tespit-notu-${hazirIcerik().damga}$`))

  await yayinAdiminiAc(page)
  await page.getByLabel('Kategori').selectOption({ label: hazirIcerik().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  await panelGezinmesiniAc(page)
  await page.getByRole('link', { name: 'Makaleler' }).click()
  const satir = page.getByRole('row', { name: new RegExp(baslik) })
  await expect(satir.getByText('Yayında')).toBeVisible()

  // Temizlik yolu aynı zamanda silme onayının kendisini ölçüyor.
  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(baslik) })).toHaveCount(0)

  // Silme sessiz olmamalı: satır kalkınca tetikleyen düğme de gittiği için odak
  // <body>'ye düşerdi ve ekran okuyucu kullanıcısı sonucu hiç öğrenemezdi (WCAG 4.1.3).
  const bildirim = page.getByRole('status')
  await expect(bildirim).toHaveText('Makale silindi.')
  await expect(bildirim).toBeFocused()
})

// İkinci silmede adres değişmezse bildirim öğesi yeniden kurulmaz: React aynı konumdaki
// aynı tipteki öğeyi yeniden kurmuyor, odaklama effect'i bir daha koşmuyor ve metin de aynı
// kaldığı için canlı bölge duyuru yapmıyor. Tetikleyen düğme satırla birlikte kalktığından
// odak <body>'ye düşer ve kullanıcı ikinci silmenin olup olmadığını hiç öğrenemez
// (WCAG 4.1.3; aynı hata medya listesinde ölçülüp kapatılmıştı).
test('arka arkaya iki makale silmede de bildirim duyurulur', async ({ page }) => {
  const basliklar = [
    `Birinci silinecek ${hazirIcerik().damga}`,
    `İkinci silinecek ${hazirIcerik().damga}`,
  ]
  await girisYap(page, EDITOR)

  for (const baslik of basliklar) {
    await page.goto('/panel/makaleler/yeni')
    await page.getByLabel('Başlık').fill(baslik)
    await page.getByLabel('Özet').fill('Ardışık silme bildirimini ölçmek için yazılmış özet metni.')
    await page.locator('[contenteditable="true"]').fill('Silinecek makalenin gövdesi.')
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  }

  await page.goto('/panel/makaleler')

  for (const baslik of basliklar) {
    const satir = page.getByRole('row', { name: new RegExp(baslik) })
    await satir.getByRole('button', { name: 'Sil' }).click()
    await page.getByRole('button', { name: 'Evet, sil' }).click()
    await expect(satir).toHaveCount(0)

    const bildirim = page.getByRole('status')
    await expect(bildirim).toHaveText('Makale silindi.')
    await expect(bildirim).toBeFocused()
  }
})

test('kategorisiz yayımlama alan hatası verir ve kaydetmez', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(`Kategorisiz ${hazirIcerik().damga}`)
  await page.getByLabel('Özet').fill('Yayımlamayı kategori olmadan denemek için yazılmış özet metni.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByText('Yayımlamak için kategori seçin.')).toBeVisible()
  // Kayıt yapılmadıysa başarı bildirimi de olmamalı ve adres hâlâ "yeni" olmalı.
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/makaleler\/yeni$/)
})

test('çakışan slug kullanıcıya açıkça bildirilir', async ({ page }) => {
  const baslik = `Çakışan başlık ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)

  for (const sira of [1, 2]) {
    await page.goto('/panel/makaleler/yeni')
    await page.getByLabel('Başlık').fill(baslik)
    await page.getByLabel('Özet').fill('Aynı slug ile ikinci kaydın reddedildiğini gösteren özet.')
    await page.locator('[contenteditable="true"]').fill('Gövde')
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    if (sira === 1) await expect(page.getByRole('status')).toBeVisible()
  }
  await expect(page.getByText('Bu adres başka bir makalede kullanılıyor.')).toBeVisible()
})

// Reklam yasağı taraması ENGEL DEĞİL, onaylı uyarıdır: ilk gönderimde yayın durur ve
// bulgular konumuyla listelenir; onay kutusu işaretlenip yeniden gönderilince yayın geçer.
test('yasaklı ifade önce uyarı üretir, onaylanınca yayın tamamlanır', async ({ page }) => {
  const baslik = `Uyarı denemesi ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Bu alanda uzman kadromuzla hizmet veriyoruz ifadesini içeren özet.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await yayinAdiminiAc(page)
  await page.getByLabel('Kategori').selectOption({ label: hazirIcerik().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()

  // Panel içeriğine daraltıldı: Next kendi rota duyurucusunu (#__next-route-announcer__)
  // body seviyesinde role="alert" ile çiziyor, daraltılmamış seçici ona da takılıyor.
  // Kapsam yine tek bir uyarı: içerikte ikinci bir alert çıkarsa bu iddia kırılır.
  const uyari = page.getByRole('main').getByRole('alert')
  await expect(uyari).toContainText('Reklam yasağı')
  await expect(uyari).toContainText('uzman')
  // Konum bilgisi de gösterilmeli; yalnız kelime listesi yeterli değil.
  await expect(uyari).toContainText('karakter')
  // Uyarı aşamasında kayıt YAPILMAMIŞ olmalı.
  await expect(page.getByRole('status')).toHaveCount(0)

  await page.getByLabel(/okudum, sorumluluk bende/i).check()
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  await page.goto('/panel/makaleler')
  const satir = page.getByRole('row', { name: new RegExp(baslik) })
  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(baslik) })).toHaveCount(0)
})

// Onay kutusu bir kez işaretlendikten sonra İŞARETLİ KALIYORDU (Görev 8'e devreden borç):
// aynı sayfada ikinci kez yayımlayan kullanıcı, metne YENİ bir yasaklı ifade eklemiş olsa
// bile uyarıyı bir daha görmüyordu — sunucu gönderilen onayı görüp taramayı hiç
// göstermiyordu. Bu, taramayı ikinci düzenlemeden sonra sessizce devre dışı bırakıyordu.
test('ikinci düzenlemede yeni yasaklı ifade uyarıyı yeniden çıkarır', async ({ page }) => {
  const baslik = `Onay sıfırlama ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Bu alanda uzman kadromuzla hizmet veriyoruz ifadesini içeren özet.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  // Yönlendirmeden sonra DÜZENLEME sayfasındayız; buradan sonra kaydetmeler yönlendirmiyor,
  // yani form sökülmüyor. Borç tam olarak bu koşulda görünüyordu.
  await expect(page).toHaveURL(/\/panel\/makaleler\/\d+/)

  const uyari = page.getByRole('main').getByRole('alert')
  const onay = page.getByLabel(/okudum, sorumluluk bende/i)

  await yayinAdiminiAc(page)
  await page.getByLabel('Kategori').selectOption({ label: hazirIcerik().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(uyari).toContainText('uzman')
  await expect(onay).not.toBeChecked()

  await onay.check()
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  // Metne BAŞKA bir yasaklı ifade ekleniyor. Tarama yeniden çalışmalı ve onay taşınmamalı.
  // Özet BİRİNCİ adımda; uyarıdan sonra editör üçüncü adımda duruyor (hata/uyarı hangi
  // adımdaysa oraya geçiliyor), o yüzden geri dönmek gerekiyor.
  await adimiAc(page, 'Metin')
  await page.getByLabel('Özet').fill('Ücretsiz ilk görüşme sunduğumuzu duyuran yeni özet metni.')
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(uyari).toContainText('ücretsiz')
  await expect(page.getByLabel(/okudum, sorumluluk bende/i)).not.toBeChecked()

  await page.goto('/panel/makaleler')
  await page.getByRole('row', { name: new RegExp(baslik) }).getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(baslik) })).toHaveCount(0)
})

// Ardışık iki kaydetme AYNI metni üretiyor. Metin aynı DOM düğümünde değişmeden kalırsa
// canlı bölge duyuru yapmaz ve ekran okuyucu kullanıcısı ikinci kaydın olup olmadığını
// öğrenemez (WCAG 4.1.3). EntityForm'da çözülmüştü, ArticleForm kendi eski kopyasını
// taşıyordu (Görev 8'e devreden borç).
test('ardışık aynı kaydetmede bildirim düğümü yeniden kurulur', async ({ page }) => {
  const baslik = `Bildirim yenileme ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Bildirimin ikinci kayıtta yeniden duyurulduğunu ölçen özet metni.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page).toHaveURL(/\/panel\/makaleler\/\d+/)

  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')

  // Gözlemci İKİNCİ kaydetmeden sonra kuruluyor: bundan sonraki ekleme, üçüncü kaydetmenin
  // bildirimi. Metin değişmediği için tek kanıt düğümün DOM'dan çıkıp yeniden eklenmesi.
  await page.evaluate(() => {
    const pencere = window as unknown as { bildirimYenilendi?: boolean }
    pencere.bildirimYenilendi = false
    // #panel-content ile daraltılıyor: sayfadaki İLK <form> gezinmedeki "Çıkış yap"
    // formu ve gözlemci oraya bağlansaydı hiçbir şey görmezdi (ölçüldü).
    const form = document.querySelector('#panel-content form')
    if (form === null) throw new Error('Makale formu bulunamadı; gözlemci kurulamıyor.')
    new MutationObserver((kayitlar) => {
      for (const kayit of kayitlar) {
        for (const eklenen of kayit.addedNodes) {
          if (eklenen instanceof HTMLElement && eklenen.getAttribute('role') === 'status') {
            pencere.bildirimYenilendi = true
          }
        }
      }
    }).observe(form, { childList: true, subtree: true })
  })

  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { bildirimYenilendi?: boolean }).bildirimYenilendi))
    .toBe(true)

  await page.goto('/panel/makaleler')
  await page.getByRole('row', { name: new RegExp(baslik) }).getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(baslik) })).toHaveCount(0)
})

test('silme onayı Escape ile kapanır ve odak tetikleyen düğmeye döner', async ({ page }) => {
  const baslik = `Odak denemesi ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Silme onayının klavyeyle kapanışını ölçen taslak makale özeti.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.goto('/panel/makaleler')
  const satir = page.getByRole('row', { name: new RegExp(baslik) })
  const silDugmesi = satir.getByRole('button', { name: 'Sil' })
  await silDugmesi.click()
  const onay = page.getByRole('dialog')
  await expect(onay).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(onay).toBeHidden()
  await expect(silDugmesi).toBeFocused()
  // Vazgeçmek kaydı silmemiş olmalı.
  await expect(satir).toBeVisible()
})

test('makale düzenleme sayfası temizlenmiş içeriğin önizlemesini gösterir', async ({ page }) => {
  const baslik = `Önizleme denemesi ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Önizleme bölümünün temizlenmiş HTML bastığını ölçen özet metni.')
  await page.locator('[contenteditable="true"]').fill('Kiracının dava açma süresi.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()

  const onizleme = page.getByRole('region', { name: 'Önizleme' })
  await expect(onizleme).toContainText('Kiracının dava açma süresi.')
  await expect(onizleme.locator('.prose')).toHaveCount(1)

  // Önizleme veritabanından okunuyor. Kaydetmeden sonra reload OLMADAN tazelenmezse
  // kullanıcı yazdığının kaydedilmediğini sanır. reload() bilerek kullanılmıyor.
  await page.locator('[contenteditable="true"]').fill('Tamamen değiştirilmiş gövde.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  await expect(onizleme).toContainText('Tamamen değiştirilmiş gövde.')
  await expect(onizleme).not.toContainText('Kiracının dava açma süresi.')
})

// React'in hydrate uyuşmazlığı bildirimleri. Küçültülmüş üretim derlemesinde metin yerine
// "Minified React error #418/#423/#425" düşüyor, geliştirme derlemesinde açık cümle; ikisi
// de yakalanmak zorunda çünkü e2e her iki kipte de koşuyor (CI'da üretim derlemesi).
const HYDRATE_UYUSMAZLIGI = /hydrat|Minified React error|server[- ]rendered|did not match/i

// Tiptap'in useEditor'ı sunucuda çizilirse hydrate uyuşmazlığı üretiyor; immediatelyRender:
// false o yüzden veriliyor. İddia bunu ölçüyor: seçenek kaldırılırsa konsola React'in
// hydration hatası düşer ve bu test kırılır.
//
// Kova İDDİAYA DARALTILDI. Önceki hâli console kanalındaki her error/warning mesajını
// topluyordu ve geliştirme sunucusunun ilgisiz bir uyarısı testi ~%12 sıklıkla yanlış
// kırmızıya çeviriyordu. Filtre dışı kalan mesajlar YUTULMUYOR, koşum çıktısına bilgi
// olarak basılıyor: yeni bir gürültü kaynağı çıkarsa görünür kalsın.
test('editör sayfası hydrate uyuşmazlığı düşürmez', async ({ page }) => {
  const uyusmazliklar: string[] = []
  page.on('console', (mesaj) => {
    if (mesaj.type() !== 'error' && mesaj.type() !== 'warning') return
    const metin = mesaj.text()
    if (HYDRATE_UYUSMAZLIGI.test(metin)) uyusmazliklar.push(metin)
    else console.info(`[konsol/${mesaj.type()}] ${metin}`)
  })
  // Sayfa düzeyinde fırlayan hata her durumda sayılıyor: o bir gürültü değil, çizim
  // sırasında gerçekten patlamış bir kod.
  page.on('pageerror', (hata) => uyusmazliklar.push(hata.message))

  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await expect(page.locator('[contenteditable="true"]')).toBeVisible()
  await page.locator('[contenteditable="true"]').fill('Kısa bir deneme metni.')

  expect(uyusmazliklar).toEqual([])
})

// Araç çubuğu durumu useEditorState ile izleniyor; Tiptap 3'te useEditor işlem başına
// yeniden çizmiyor (shouldRerenderOnTransaction varsayılanı false). O bağ koparsa
// aria-pressed ilk değerinde donar ve ekran okuyucu kullanıcısı biçimi açtığını duymaz.
test('biçimlendirme düğmesi aria-pressed durumunu günceller', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  const govde = page.locator('[contenteditable="true"]')
  await govde.fill('Kalınlaşacak metin')

  const kalin = page.getByRole('button', { name: 'Kalın' })
  await expect(kalin).toHaveAttribute('aria-pressed', 'false')
  await kalin.click()
  await expect(kalin).toHaveAttribute('aria-pressed', 'true')
})

// İki şeyi birden ölçüyor:
// 1. publishedAt ilk yayımda atanır, taslağa geri alınınca SİLİNMEZ.
// 2. Düzenleme sayfasının SUNUCU tarafı, kaydetmeden sonra kendiliğinden tazeleniyor mu.
//    reload() bilerek kullanılmıyor — kullansaydı ikinci soru hiç sorulmamış olurdu.
test('kaydetme sonrası sayfa tazelenir ve ilk yayım tarihi korunur', async ({ page }) => {
  const baslik = `Geri alma denemesi ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Yayımdan taslağa dönüşte tarihin korunduğunu ölçen özet metni.')
  await page.locator('[contenteditable="true"]').fill('Gövde metni.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()

  // Taslak: sunucu bileşeni henüz yayımlanmadığını yazıyor.
  await expect(page.getByText('Bu makale henüz yayımlanmadı.')).toBeVisible()

  // Yayımla artık DÜZENLEME yolu (kimlik var), yani yönlendirme yok. "İlk yayım"
  // satırının belirmesi, sunucu bileşeninin action'dan sonra yeniden çizildiğinin kanıtı.
  await yayinAdiminiAc(page)
  await page.getByLabel('Kategori').selectOption({ label: hazirIcerik().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')
  await expect(page.getByText('Bu makale henüz yayımlanmadı.')).toHaveCount(0)
  const ilkYayim = await page.getByText(/^İlk yayım: /).textContent()
  expect(ilkYayim).not.toBeNull()

  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  await expect(page.getByText(/^İlk yayım: /)).toHaveText(ilkYayim as string)
})

// Sütun TEXT = 65.535 bayt. Sınır uygulanmazsa MariaDB STRICT_TRANS_TABLES altında
// "Data too long" fırlatır, kullanıcı hata sayfası görür ve yazdığı metin gider.
// Beklenen davranış: formda kalıp alan hatası okumak.
test('sütuna sığmayan içerik hata sayfası değil alan hatası verir', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(`Çok uzun ${hazirIcerik().damga}`)
  await page.getByLabel('Özet').fill('Sütun sınırının kullanıcıya nasıl bildirildiğini ölçen özet metni.')
  await page.locator('[contenteditable="true"]').fill('a'.repeat(70_000))
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()

  await expect(page.getByText(/^İçerik çok uzun/)).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page).toHaveURL(/\/panel\/makaleler\/yeni$/)
  // Hata editöre bağlanmalı; diğer beş alanda bu bağ zaten var.
  await expect(page.locator('[contenteditable="true"]')).toHaveAttribute('aria-invalid', 'true')
})

test('makale listesinde ve editör sayfasında erişilebilirlik ihlali yok', async ({ page }) => {
  await girisYap(page, EDITOR)

  for (const adres of ['/panel/makaleler', '/panel/makaleler/yeni']) {
    await page.goto(adres)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations, `${adres} ihlalleri`).toEqual([])
  }
})

test('silme onayı kip penceresi açıkken erişilebilirlik ihlali yok', async ({ page }) => {
  const baslik = `Erişim denemesi ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Kip pencerenin erişilebilirliğini ölçmek için yazılmış taslak özeti.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.goto('/panel/makaleler')
  await page.getByRole('row', { name: new RegExp(baslik) }).getByRole('button', { name: 'Sil' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

// Liste + önizleme düzeni (devir tasarımı 5d) "masaüstü panel" turunda kuruldu: başlık
// bağlantısı artık editöre değil önizlemeye gidiyor, düzenlemeye satırdaki "Düzenle" ile
// geçiliyor. Seçim adres çubuğunda (?sec=) taşındığı için sayfa sunucu bileşeni kalıyor.
test('liste satırı seçilince önizleme o kaydı gösterir ve Düzenle editöre gider', async ({ page }) => {
  const baslik = `Onizleme notu ${hazirIcerik().damga}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Önizleme bölmesinde görünmesi beklenen özet metni.')
  await page.locator('[contenteditable="true"]').fill('Gövde metni.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')

  await page.goto('/panel/makaleler')

  // Tek kayıt varken önizleme kendiliğinden ilk satıra düşüyor: bölme boş açılmamalı.
  const onizleme = page.getByRole('complementary', { name: 'Seçili makalenin önizlemesi' })
  await expect(onizleme).toBeVisible()
  await expect(onizleme.getByRole('heading', { name: baslik })).toBeVisible()
  await expect(onizleme.getByText('Önizleme bölmesinde görünmesi beklenen özet metni.')).toBeVisible()

  // Taslak kayıtta "Sitede gör" ÇIKMAZ: taslağın herkese açık adresi 404 verir.
  await expect(onizleme.getByRole('link', { name: 'Sitede gör' })).toHaveCount(0)

  // Satır seçili olarak işaretlenmeli — durum yalnız zeminle değil aria ile de taşınıyor.
  await expect(page.getByRole('row', { name: new RegExp(baslik) })).toHaveAttribute(
    'aria-current',
    'true',
  )

  // "Düzenle" editöre götürür.
  await onizleme.getByRole('link', { name: 'Düzenle' }).click()
  await expect(page.getByLabel('Başlık')).toHaveValue(baslik)
})
