import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { panelGezinmesiniAc } from './helpers/panel-nav'
import { geciciKullaniciOlustur } from './helpers/test-user'

// Hız sınırı sayacı sunucu SÜRECİNDE yaşıyor, kullanıcı adı başına sayıyor ve playwright.config.ts
// yerelde reuseExistingServer kullanıyor: ayrı bir `npm run dev` açıkken süit art arda
// koşturulursa sayaçlar koşumlar arasında taşınır. Bu yüzden başarısız deneme üreten her test
// kendi geçici kullanıcısını kuruyor. Tohum kullanıcıları yalnız BAŞARILI girişlerde
// kullanılıyor; başarılı girişler sayaca işlemediği için bütçe biriktirmiyorlar.

test('oturumsuz kullanıcı panele giremez, giriş sayfasına yönlenir', async ({ page }) => {
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/giris/)
  await expect(page.getByRole('heading', { level: 1, name: 'Panel Girişi' })).toBeVisible()
})

test('yanlış parola alan bazında Türkçe hata gösterir ve oturum açmaz', async ({ page }) => {
  // Var olan bir hesap gerekiyor: sınanan şey "kayıtlı kullanıcı yanlış parolayla giremez".
  const kullanici = await geciciKullaniciOlustur('yanlis-parola')
  try {
    await page.goto('/panel/giris')
    await page.getByLabel('Kullanıcı adı').fill(kullanici.username)
    await page.getByLabel('Parola').fill('kesinlikle-yanlis-parola')
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    // Lokatör forma daraltıldı: Next kendi rota duyurucusunu (#__next-route-announcer__) da
    // role="alert" ile basıyor, sayfa genelinde arayınca iki eşleşme çıkıyor (ölçüldü).
    await expect(page.locator('form').getByRole('alert')).toHaveText('Kullanıcı adı veya parola hatalı.')
    await expect(page).toHaveURL(/\/panel\/giris/)
  } finally {
    await kullanici.temizle()
  }
})

// Ölçüldü: React 19 form action tamamlanınca DENETİMSİZ alanları sıfırlıyor. Bu yüzden
// LoginForm alanları denetimli. İki sonucu var: (1) parolayı yanlış giren kullanıcı
// yazdığı kullanıcı adını kaybetmiyor, (2) gönderim yanıtından sonra düşen sıfırlama, araya
// giren bir yazmayı silip formu boş göndermiyor — "art arda başarısız denemeler hız
// sınırına takılır" testi bu yüzden rastgele kırmızı veriyordu.
test('başarısız girişten sonra yazılan kullanıcı adı alanda kalır', async ({ page }) => {
  const kullanici = await geciciKullaniciOlustur('alan-korunur')
  try {
    await page.goto('/panel/giris')
    await page.getByLabel('Kullanıcı adı').fill(kullanici.username)
    await page.getByLabel('Parola').fill('kesinlikle-yanlis-parola')
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    await expect(page.locator('form').getByRole('alert')).toHaveText('Kullanıcı adı veya parola hatalı.')

    await expect(page.getByLabel('Kullanıcı adı')).toHaveValue(kullanici.username)
    await expect(page.getByLabel('Parola')).toHaveValue('kesinlikle-yanlis-parola')
  } finally {
    await kullanici.temizle()
  }
})

// Alan hatası yalnız aria-describedby ile bağlansaydı, formu gönderip odağı düğmede bırakan
// ekran okuyucu kullanıcısı hiçbir şey duymazdı: açıklama ancak girdiye odaklanınca okunur.
test('boş parola hatası canlı bölgede duyurulur ve girdiye bağlanır', async ({ page }) => {
  await page.goto('/panel/giris')
  await page.getByLabel('Kullanıcı adı').fill(ADMIN.username)
  await page.getByRole('button', { name: 'Giriş yap' }).click()

  await expect(page.locator('form').getByRole('alert')).toHaveText('Parola zorunlu.')
  await expect(page.getByLabel('Parola')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Parola')).toHaveAttribute('aria-describedby', 'password-error')
})

// Kullanıcı adı ve çıkış düğmesi gezinmenin açılır bölümünde; mobilde önce panel açılıyor
// (Görev 8). İddialar değişmedi.
test('doğru bilgiyle giriş panele düşürür ve kullanıcı adını gösterir', async ({ page }) => {
  await girisYap(page, ADMIN)
  await expect(page).toHaveURL(/\/panel$/)
  await panelGezinmesiniAc(page)
  await expect(page.getByText(ADMIN.name)).toBeVisible()
})

test('çıkış yapınca panel yeniden korumaya girer', async ({ page }) => {
  await girisYap(page, ADMIN)
  await panelGezinmesiniAc(page)
  await page.getByRole('button', { name: 'Çıkış yap' }).click()
  // Yönlendirmenin TAMAMLANMASI bekleniyor; giriş başlığının çizilmesi çıkış yanıtının
  // işlendiğinin kanıtı (panel-kullanicilar.spec.ts'te aynı ölçüm).
  //
  // Bu iddia üretim derlemesinde tam süit altında kırmızı veriyordu ve nedeni ölçüldü:
  // giriş sayfası çizildikten SONRA bile authjs.session-token çerezi duruyordu. Uçuştaki
  // bir panel ön yüklemesi çıkıştan sonra dönüp çerezi geri yazıyordu (next-auth JWT'yi
  // her istekte tazeliyor). PanelNav artık prefetch={false} kullanıyor; hata HEAD'de de
  // vardı, yani bu testin kendisi değil ürün tarafı düzeldi.
  await expect(page.getByRole('heading', { name: 'Panel Girişi' })).toBeVisible()
  await expect(page).toHaveURL(/\/panel\/giris/)
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/giris/)
})

// Bu yönlendirmeyi giriş sayfası kendisi yapıyor: next-auth proxy'si giriş sayfasında
// yönlendirmeyi atladığı için authorized callback'i oturumu açık kullanıcıyı geri göndermiyor.
test('oturumu açık kullanıcı giriş sayfasını görmez, panele döner', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/giris')
  await expect(page).toHaveURL(/\/panel$/)
})

// Sayaç sunucu süreci boyunca yaşıyor; bu yüzden test sabit bir deneme sayısına değil,
// "sınır mesajı çıkana kadar dene" kuralına dayanıyor: sunucu yeniden kullanılırsa da geçerli.
// Kayıtlı olmayan bir kullanıcı adı kullanılıyor — anahtar kullanıcı adı olduğu için tohum
// kullanıcılarının bütçesi harcanmasın.
test('art arda başarısız denemeler hız sınırına takılır', async ({ page }) => {
  await page.goto('/panel/giris')
  const uyari = page.locator('form').getByRole('alert')

  for (let deneme = 0; deneme < 6; deneme += 1) {
    await page.getByLabel('Kullanıcı adı').fill('hiz-siniri-hesabi')
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

  // TANI NOTU (iddia değil): bu iddia KULLANICI ADI tavanının mesajını arıyor. Sınırın ikinci bir
  // tavanı daha var — pencere başına toplam başarısız deneme (src/lib/login-rate-limit.ts).
  // Bir süit turu ~21 başarısız giriş üretiyor ve yerelde reuseExistingServer açık olduğu
  // için sayaç turlar arasında taşınıyor; yalnız bu dosya aynı 15 dakikada onlarca kez
  // koşturulursa küresel tavan devreye girer ve buradaki metin
  // "Giriş servisi şu anda çok fazla başarısız deneme alıyor…" olur. O durumda kırılan şey
  // uygulama değil, koşum düzenidir: sunucuyu yeniden başlatmak sayacı sıfırlar.
  await expect(uyari).toHaveText(/^Çok fazla deneme yapıldı\. \d+ dakika sonra tekrar deneyin\.$/)
})

// Denetim bulgusu Ö1 + Ö2'nin kanıtı. Saldırgan giriş formunu hiç kullanmak zorunda değil:
// CSRF token'ını alıp doğrudan Auth.js callback ucuna POST atabiliyor. Sınır yalnız server
// action'da dursaydı bu yol tamamen sınırsız olurdu.
test('kimlik doğrulama ucuna doğrudan POST da hız sınırına takılır', async ({ request }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'masaustu',
    'HTTP düzeyinde kanıt, tarayıcıdan bağımsız. İki projede koşarsa aynı kovayı paylaşıp birbirinin ilk adımını bozar.',
  )

  // Bu test bir hesabı bilerek kilitliyor; tohum kullanıcısı kullanılsaydı aynı 15 dakika
  // içinde ikinci kez koşan süitte diğer testler yanlış kırmızı verirdi.
  const { username, password, temizle } = await geciciKullaniciOlustur('kilit-kaniti')

  try {
    const { csrfToken } = await (await request.get('/api/auth/csrf')).json()

    // Her istek FARKLI bir x-forwarded-for taşıyor. Anahtar IP olsaydı her deneme yeni kova
    // alır ve sınır hiç devreye girmezdi; kilitlenmesi anahtarın kullanıcı adı olduğunun kanıtı.
    const dogrudanGiris = (deneneParola: string, sahteIpSonEki: number) =>
      request.post('/api/auth/callback/credentials', {
        headers: { 'x-forwarded-for': `203.0.113.${sahteIpSonEki}` },
        form: { csrfToken, username, password: deneneParola, callbackUrl: '/panel' },
        maxRedirects: 0,
      })

    // 1) Doğru parola: uç gerçekten açık ve form olmadan oturum açılabiliyor.
    const ilk = await dogrudanGiris(password, 1)
    expect(ilk.headers()['location']).not.toContain('error=')

    // 2) Beş başarısız deneme kovayı doldurur.
    for (let sira = 0; sira < 5; sira += 1) {
      await dogrudanGiris('kesinlikle-yanlis-parola', 10 + sira)
    }

    // 3) Aynı doğru parola artık reddediliyor: sınır bu yolda da devrede.
    const son = await dogrudanGiris(password, 100)
    expect(son.headers()['location']).toContain('error=')
  } finally {
    await temizle()
  }
})

// Görev sözleşmesi: giriş kimliği kullanıcı adı, e-posta DEĞİL. Eski kimlikler e-posta
// biçimindeydi ve migration onları oldukları gibi taşıdı; o değerlerle giriş denemesi
// veritabanına hiç ulaşmadan biçim kuralında durmalı. Alanın type="email" olarak kalması
// da bu testte yakalanır: tarayıcı o durumda kendi doğrulamasını dayatır ve gönderim
// hiç yapılmadığı için beklenen Türkçe hata çıkmaz.
test('e-posta biçimli bir değerle giriş yapılamaz', async ({ page }) => {
  await page.goto('/panel/giris')
  await expect(page.getByLabel('Kullanıcı adı')).toHaveAttribute('type', 'text')

  await page.getByLabel('Kullanıcı adı').fill('admin@ornek.test')
  await page.getByLabel('Parola').fill('kesinlikle-yanlis-parola')
  await page.getByRole('button', { name: 'Giriş yap' }).click()

  await expect(page.locator('form').getByRole('alert')).toContainText('küçük İngiliz harfleri (a-z)')
  await expect(page).toHaveURL(/\/panel\/giris/)
})

// Tohum kullanıcı adı gerçekten kullanıcı adı biçiminde: e-posta biçimli bir tohum değeri
// kalsaydı yukarıdaki testler yeşil kalır ama panele hiç girilemezdi.
test('tohum kullanıcı adı kullanıcı adı biçiminde', async () => {
  expect(ADMIN.username).toMatch(/^[a-z0-9._-]{3,60}$/)
})

test('giriş sayfasında erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/panel/giris')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

// "Göster" düğmesi mobil için eklenen bir kolaylık (devir tasarımı 2.1). Tümüyle istemci
// tarafı: alanın yalnız `type`ı değişiyor, gönderilen FormData ve sunucu sözleşmesi aynı.
test('parola alanı Göster düğmesiyle görünür olur ve durum aria ile taşınır', async ({ page }) => {
  await page.goto('/panel/giris')
  const parola = page.getByLabel('Parola')
  const dugme = page.getByRole('button', { name: 'Göster' })

  await expect(parola).toHaveAttribute('type', 'password')
  await expect(dugme).toHaveAttribute('aria-pressed', 'false')

  await dugme.click()
  await expect(parola).toHaveAttribute('type', 'text')
  // Etiket de durumla birlikte değişiyor: yalnız aria'ya bakmayan yardımcı teknolojide
  // de anlam kaybolmasın.
  await expect(page.getByRole('button', { name: 'Gizle' })).toHaveAttribute('aria-pressed', 'true')

  // Düğme form GÖNDERMEMELİ: göndermiş olsaydı parolayı görmek bir giriş denemesi sayılır
  // ve hız sınırını tüketirdi.
  await expect(page).toHaveURL(/\/panel\/giris/)
})
