import { test, expect } from '@playwright/test'
import { cikisYap, girisYap, ADMIN, EDITOR } from './helpers/auth'
import { temizlikciAc } from './helpers/db-cleanup'

const ADMIN_YOLLARI = [
  '/panel/kadro',
  '/panel/calisma-alanlari',
  '/panel/kategoriler',
  '/panel/ayarlar',
  '/panel/mesajlar',
  '/panel/kullanicilar',
]

// Yetki kararı `requireAccess` ile SUNUCUDA veriliyor; tarayıcı genişliği onu değiştiremez.
// Aynı 12 iddiayı ikinci bir projede tekrarlamak hiçbir bilgi eklemiyor, buna karşılık
// geliştirme sunucusunun yükünü ikiye katlıyor. Panel yerleşimini ölçen testler (kadro,
// çalışma alanları, kategoriler, mesajlar) iki projede de koşmaya devam ediyor.
const TEK_PROJE = 'masaustu'

for (const yol of ADMIN_YOLLARI) {
  test(`editor ${yol} adresine erişemez`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== TEK_PROJE, 'Yetki kararı sunucuda verilir; görünüm alanından bağımsız.')
    await girisYap(page, EDITOR)
    const yanit = await page.goto(yol)
    expect(yanit?.status()).toBe(404)
  })

  test(`admin ${yol} adresini görür`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== TEK_PROJE, 'Yetki kararı sunucuda verilir; görünüm alanından bağımsız.')
    await girisYap(page, ADMIN)
    const yanit = await page.goto(yol)
    expect(yanit?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

/**
 * Gezinmeyi gizlemek koruma değil ve rota koruması da tek hat değil: server function
 * bulunduğu rotaya POST olarak gider. `proxy.ts` matcher'ı değişirse ilk hat sessizce
 * kalkar; ikinci hat her action'ın içindeki `requireAccess`'tir.
 *
 * Bu test o ikinci hattı GERÇEKTEN çalıştırıyor. Elle kurulmuş bir form POST'u yetmez:
 * Next bir server function'ı yalnız `Next-Action` başlığıyla (ya da gövdedeki geçerli
 * `$ACTION_ID_<id>` alanıyla) dispatch ediyor; başlıksız bir POST action'a hiç ulaşmadan
 * sayfa katmanında reddedilir ve `requireAccess` silinse bile test yeşil kalırdı.
 *
 * Bu yüzden istek YÖNETİCİ oturumunda yakalanıyor (gerçek dispatch, gerçek gövde), oluşan
 * kayıt siliniyor — slug serbest kalsın ki koruma kaldırıldığında ekleme gerçekten
 * yapılabilsin, yoksa testi `isSlugTaken` yeşil tutardı — ve aynı istek EDİTÖR çerezleriyle
 * yeniden gönderiliyor.
 */
test('editor, yöneticiden yakalanan gerçek kadro action isteğini tekrar oynatamaz', async ({ page }) => {
  const ad = `Sızma Denemesi ${Date.now()}${Math.floor(Math.random() * 1000)}`
  const temizlik = await temizlikciAc()

  type YakalananIstek = { url: string; headers: Record<string, string>; body: Buffer }
  let yakalanan: YakalananIstek | null = null

  // Değişken bir geri çağrımda dolduğu için doğrudan okunmuyor: TypeScript o atamayı
  // göremiyor ve null denetiminden sonra tipi `never`'a daraltıyor.
  function hazirIstek(): YakalananIstek {
    if (yakalanan === null) throw new Error('Kadro action isteği yakalanamadı; dispatch biçimi değişmiş olabilir.')
    return yakalanan
  }

  try {
    await girisYap(page, ADMIN)
    await page.goto('/panel/kadro/yeni')

    page.on('request', (istek) => {
      if (istek.method() !== 'POST' || !istek.url().includes('/panel/kadro/yeni')) return
      const govde = istek.postDataBuffer()
      if (govde === null) return
      yakalanan = { url: istek.url(), headers: istek.headers(), body: govde }
    })

    await page.getByLabel('Ad soyad').fill(ad)
    await page.getByLabel('Unvan').fill('Avukat')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

    const istek = hazirIstek()
    // Yakalanan şeyin gerçekten bir server function dispatch'i olduğunun kanıtı.
    expect(istek.headers['next-action'], 'Next-Action başlığı yok; bu bir action isteği değil').toBeTruthy()

    // Yöneticinin oluşturduğu kayıt siliniyor: slug serbest kalmalı.
    await temizlik.sil('DELETE FROM lawyers WHERE full_name = ?', [ad])

    await cikisYap(page)
    await girisYap(page, EDITOR)

    // cookie ÇIKARILIYOR: page.request tarayıcı bağlamının çerezlerini kullanıyor, yani
    // istek artık editörün oturumuyla gidiyor. content-length ve host'u Playwright kendisi
    // yeniden hesaplıyor.
    const ATILAN_BASLIKLAR = ['cookie', 'content-length', 'host']
    const basliklar: Record<string, string> = {}
    for (const [anahtar, deger] of Object.entries(istek.headers)) {
      if (!ATILAN_BASLIKLAR.includes(anahtar)) basliklar[anahtar] = deger
    }
    const yanit = await page.request.post(istek.url, { headers: basliklar, data: istek.body })

    // Asıl güvence: action koşsa bile kayıt OLUŞMAMALI. `requireAccess('lawyers')` satırı
    // silinirse burada bir satır belirir ve test kırılır.
    const satirlar = await temizlik.sorgu<{ id: number }>('SELECT id FROM lawyers WHERE full_name = ?', [ad])
    expect(satirlar, `Editör kaydı oluşturabildi (yanıt ${yanit.status()})`).toHaveLength(0)

    // Yanıt da başarıyı bildirmemeli.
    expect(yanit.status()).not.toBe(303)
    expect(await yanit.text()).not.toContain('Avukat kaydedildi.')

    await cikisYap(page)
    await girisYap(page, ADMIN)
    await page.goto('/panel/kadro')
    await expect(page.getByText(ad)).toHaveCount(0)
  } finally {
    // Yönetici kaydı yukarıda silindi; buradaki iş yarıda kalan koşumun artığını toplamak.
    await temizlik.silmeyeCalis('DELETE FROM lawyers WHERE full_name = ?', [ad])
    await temizlik.kapat()
  }
})

// Yetkisiz erişimde notFound() kullanılıyor; kaynağın varlığını ele vermemesi gereken
// davranış, admin'in gördüğü sayfayla editor'ün gördüğü 404'ün AYNI kabuğu taşıması.
test('editor için yetkisiz panel adresi olmayan sayfayla aynı görünür', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/kullanicilar')
  await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible()
  // Kullanıcı listesinden hiçbir iz sızmamalı.
  await expect(page.getByRole('heading', { name: 'Kullanıcılar', level: 1 })).toHaveCount(0)
})
