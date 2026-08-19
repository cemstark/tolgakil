import { test, expect } from '@playwright/test'
import { cikisYap, girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

const PAROLA = 'cok-uzun-bir-parola'

/**
 * Bu dosya PAYLAŞILAN durumu yazıyor: etkin yönetici sayısı.
 *
 * "Son etkin admin" kuralının testi, tohum yöneticisinin GERÇEKTEN tek etkin yönetici
 * olmasına dayanıyor. Başka bir test aynı anda ikinci bir yönetici oluşturursa kural
 * uygulanmaz, tohum yöneticisi editöre düşer ve o andan sonra bütün admin testleri kırılır.
 * İki savunma var: testler sıralı koşuyor ve yalnız tek Playwright projesinde koşuyor.
 */
test.describe('panel kullanıcı yönetimi', () => {
  test.describe.configure({ mode: 'serial' })

  let temizlik: Temizlikci | null = null
  const olusturulanEpostalar: string[] = []

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'masaustu',
      'Etkin yönetici sayısı paylaşılan durum; projeler arası yarışı önlemek için tek projede koşar.',
    )
    temizlik = await temizlikciAc()
    // Yarıda kalmış bir önceki koşumun bıraktığı yönetici, "son etkin admin" kuralını
    // sessizce devre dışı bırakırdı. Artıklar önce pasifleştiriliyor.
    await temizlik.silmeyeCalis(
      "UPDATE users SET is_active = 0 WHERE role = 'admin' AND (email LIKE 'deneme-%@ornek.test' OR email LIKE 'pasif-%@ornek.test')",
      [],
    )
  })

  test.afterEach(async () => {
    const mevcut = temizlik
    temizlik = null
    await mevcut?.kapat()
  })

  test.afterAll(async () => {
    const kapatici = await temizlikciAc()
    try {
      for (const eposta of olusturulanEpostalar.splice(0)) {
        // sil (gevşek değil): bu e-postaların oluşturulduğu testte doğrulandı, dolayısıyla
        // sıfır satır silmek temizliğin sessizce çalışmadığı anlamına gelir (Görev 6 ölçümü).
        await kapatici.sil('DELETE FROM users WHERE email = ?', [eposta])
      }
      // Güvenlik ağı: bir test yarıda kalıp tohum yöneticisini bozduysa süit tümden
      // kullanılamaz hâle gelirdi. İddialar bundan ÖNCE koşuyor, yani bu satır hiçbir
      // başarısızlığı örtmüyor — yalnız sonraki koşumları kurtarıyor.
      await kapatici.calistir("UPDATE users SET role = 'admin', is_active = 1 WHERE email = ?", [ADMIN.email])
    } finally {
      await kapatici.kapat()
    }
  })

  function hazirTemizlik(): Temizlikci {
    if (temizlik === null) throw new Error('Temizlik bağlantısı kurulmadı; beforeEach düşmüş olmalı.')
    return temizlik
  }

  async function kullaniciOlustur(page: import('@playwright/test').Page, onEk: string): Promise<string> {
    const eposta = `${onEk}-${Date.now()}${Math.floor(Math.random() * 1000)}@ornek.test`
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('E-posta').fill(eposta)
    await page.getByLabel('Ad soyad').fill('Deneme Kullanıcı')
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByLabel('Rol', { exact: true }).selectOption('editor')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')
    olusturulanEpostalar.push(eposta)
    return eposta
  }

  test('admin kullanıcı ekler, rolünü değiştirir ve pasifleştirir', async ({ page }) => {
    await girisYap(page, ADMIN)
    const eposta = await kullaniciOlustur(page, 'deneme')

    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(eposta) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Rol', { exact: true }).selectOption('admin')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

    // İki kaydetme arasında listeye dönülüyor ve GÖZLENEBİLİR değişiklik doğrulanıyor.
    // Aynı formda art arda kaydedilseydi ikinci iddia bir öncekinden kalan aynı metinle
    // anında geçerdi; ardından gelen page.goto uçuştaki action ile yarışır ve liste
    // güncellenmemiş okunurdu (ölçüldü: test bu yüzden rastgele kırılıyordu).
    await page.goto('/panel/kullanicilar')
    await expect(page.getByRole('row', { name: new RegExp(eposta) })).toContainText('Yönetici')

    await page.getByRole('row', { name: new RegExp(eposta) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Etkin').uncheck()
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

    await page.goto('/panel/kullanicilar')
    await expect(page.getByRole('row', { name: new RegExp(eposta) }).getByText('Pasif')).toBeVisible()

    // Kural gerçekten uygulanmalı: pasif yönetici etkin yönetici sayılmaz, yani tohum
    // yöneticisi yeniden tek başına kalmış olmalı.
    const adminler = await hazirTemizlik().sorgu<{ id: number }>(
      "SELECT id FROM users WHERE role = 'admin' AND is_active = 1",
      [],
    )
    expect(adminler).toHaveLength(1)
  })

  test('son admin kendi rolünü düşüremez', async ({ page }) => {
    // Önkoşul açıkça doğrulanıyor: iki etkin yönetici varsa bu test kuralı hiç ölçmez ve
    // sessizce yeşile döner.
    const adminler = await hazirTemizlik().sorgu<{ email: string }>(
      "SELECT email FROM users WHERE role = 'admin' AND is_active = 1",
      [],
    )
    expect(adminler.map((a) => a.email)).toEqual([ADMIN.email])

    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(ADMIN.email) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Rol', { exact: true }).selectOption('editor')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    // Panel içeriğine daraltıldı: Next kendi rota duyurucusunu body seviyesinde
    // role="alert" ile çiziyor.
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Son etkin yönetici rolü düşürülemez veya pasifleştirilemez.',
    )

    // Kural gerçekten uygulanmış olmalı: rol sütunu değişmemeli ve panele yeniden
    // girilebilmeli. Yalnız mesaja bakan bir iddia, kaydın yine de yazıldığı bir
    // gerçeklemede yeşil kalırdı.
    const [satir] = await hazirTemizlik().sorgu<{ role: string; is_active: number }>(
      'SELECT role, is_active FROM users WHERE email = ?',
      [ADMIN.email],
    )
    expect(satir.role).toBe('admin')
    expect(satir.is_active).toBe(1)

    // Çıkış GERÇEK düğmeyle yapılıyor (çerez temizlemeyle değil): panelin hâlâ çalıştığını
    // gösteren şey de bu. Yönlendirmenin tamamlanması BEKLENİYOR — beklenmezse girisYap'ın
    // page.goto'su uçuştaki çıkış gezinmesiyle yarışıyor ve giriş formunu hiç bulamıyor.
    await page.getByRole('button', { name: 'Çıkış yap' }).click()
    await expect(page.getByRole('heading', { name: 'Panel Girişi' })).toBeVisible()

    await girisYap(page, ADMIN)
    await expect(page).toHaveURL(/\/panel$/)
  })

  test('son admin kendini pasifleştiremez', async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(ADMIN.email) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Etkin').uncheck()
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Son etkin yönetici rolü düşürülemez veya pasifleştirilemez.',
    )

    const [satir] = await hazirTemizlik().sorgu<{ is_active: number }>(
      'SELECT is_active FROM users WHERE email = ?',
      [ADMIN.email],
    )
    expect(satir.is_active).toBe(1)
  })

  /**
   * `src/auth.ts` içindeki `!user.isActive` kontrolünün TEK testi.
   *
   * O satır silinirse pasifleştirilen kullanıcı doğru parolayla panele girer ve
   * pasifleştirme özelliği tümüyle işlevsiz kalır — ama başka hiçbir test kırılmaz.
   */
  test('pasifleştirilen kullanıcı doğru parolayla da giriş yapamaz', async ({ page }) => {
    await girisYap(page, ADMIN)
    const eposta = await kullaniciOlustur(page, 'pasif')

    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(eposta) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Etkin').uncheck()
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

    await cikisYap(page)
    await page.goto('/panel/giris')
    await page.getByLabel('E-posta').fill(eposta)
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByRole('button', { name: 'Giriş yap' }).click()

    await expect(page.getByRole('main').getByRole('alert')).toHaveText('E-posta veya parola hatalı.')
    // Giriş sayfasında kalmalı: yönlendirme olsaydı mesaj doğru ama oturum açılmış olurdu.
    await expect(page).toHaveURL(/\/panel\/giris/)
  })

  // Aynı e-posta ile ikinci hesap açılamaz; users.email UNIQUE ve kısıt hatası kullanıcıya
  // 500 olarak değil alan hatası olarak dönmeli.
  test('kayıtlı e-posta ile ikinci kullanıcı açılamaz', async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('E-posta').fill(ADMIN.email)
    await page.getByLabel('Ad soyad').fill('Çakışan Kullanıcı')
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByLabel('Rol', { exact: true }).selectOption('editor')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByText('Bu e-posta zaten kayıtlı.')).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('kısa parola alan hatası verir ve hesap açılmaz', async ({ page }) => {
    const eposta = `kisa-${Date.now()}@ornek.test`
    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('E-posta').fill(eposta)
    await page.getByLabel('Ad soyad').fill('Kısa Parola')
    await page.getByLabel('Parola').fill('kisa')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByText('Parola en az 12 karakter olmalı.')).toBeVisible()
    const satirlar = await hazirTemizlik().sorgu<{ id: number }>('SELECT id FROM users WHERE email = ?', [eposta])
    expect(satirlar).toHaveLength(0)
  })
})
