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
  const olusturulanAdlar: string[] = []

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'masaustu',
      'Etkin yönetici sayısı paylaşılan durum; projeler arası yarışı önlemek için tek projede koşar.',
    )
    temizlik = await temizlikciAc()
    // Yarıda kalmış bir önceki koşumun bıraktığı yönetici, "son etkin admin" kuralını
    // sessizce devre dışı bırakırdı. Artıklar önce pasifleştiriliyor.
    await temizlik.silmeyeCalis(
      "UPDATE users SET is_active = 0 WHERE role = 'admin' AND (username LIKE 'deneme-%' OR username LIKE 'pasif-%')",
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
      for (const kullaniciAdi of olusturulanAdlar.splice(0)) {
        // sil (gevşek değil): bu adların oluşturulduğu testte doğrulandı, dolayısıyla
        // sıfır satır silmek temizliğin sessizce çalışmadığı anlamına gelir (Görev 6 ölçümü).
        await kapatici.sil('DELETE FROM users WHERE username = ?', [kullaniciAdi])
      }
      // Güvenlik ağı: bir test yarıda kalıp tohum yöneticisini bozduysa süit tümden
      // kullanılamaz hâle gelirdi. İddialar bundan ÖNCE koşuyor, yani bu satır hiçbir
      // başarısızlığı örtmüyor — yalnız sonraki koşumları kurtarıyor.
      await kapatici.calistir("UPDATE users SET role = 'admin', is_active = 1 WHERE username = ?", [ADMIN.username])
    } finally {
      await kapatici.kapat()
    }
  })

  function hazirTemizlik(): Temizlikci {
    if (temizlik === null) throw new Error('Temizlik bağlantısı kurulmadı; beforeEach düşmüş olmalı.')
    return temizlik
  }

  // Üretilen ad kullanıcı adı kümesinde kalmak zorunda (küçük harf, rakam, tire): kümenin
  // dışına çıkan bir ad formda biçim hatası alır ve test "kaydedildi" beklerken düşerdi.
  async function kullaniciOlustur(page: import('@playwright/test').Page, onEk: string): Promise<string> {
    const kullaniciAdi = `${onEk}-${Date.now()}${Math.floor(Math.random() * 1000)}`
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('Kullanıcı adı').fill(kullaniciAdi)
    await page.getByLabel('Ad soyad').fill('Deneme Kullanıcı')
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByLabel('Rol', { exact: true }).selectOption('editor')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')
    olusturulanAdlar.push(kullaniciAdi)
    return kullaniciAdi
  }

  test('admin kullanıcı ekler, rolünü değiştirir ve pasifleştirir', async ({ page }) => {
    await girisYap(page, ADMIN)
    const kullaniciAdi = await kullaniciOlustur(page, 'deneme')

    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(kullaniciAdi) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Rol', { exact: true }).selectOption('admin')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

    // İki kaydetme arasında listeye dönülüyor ve GÖZLENEBİLİR değişiklik doğrulanıyor.
    // Aynı formda art arda kaydedilseydi ikinci iddia bir öncekinden kalan aynı metinle
    // anında geçerdi; ardından gelen page.goto uçuştaki action ile yarışır ve liste
    // güncellenmemiş okunurdu (ölçüldü: test bu yüzden rastgele kırılıyordu).
    await page.goto('/panel/kullanicilar')
    await expect(page.getByRole('row', { name: new RegExp(kullaniciAdi) })).toContainText('Yönetici')

    await page.getByRole('row', { name: new RegExp(kullaniciAdi) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Etkin').uncheck()
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

    await page.goto('/panel/kullanicilar')
    await expect(page.getByRole('row', { name: new RegExp(kullaniciAdi) }).getByText('Pasif')).toBeVisible()

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
    const adminler = await hazirTemizlik().sorgu<{ username: string }>(
      "SELECT username FROM users WHERE role = 'admin' AND is_active = 1",
      [],
    )
    expect(adminler.map((a) => a.username)).toEqual([ADMIN.username])

    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(ADMIN.username) }).getByRole('link', { name: 'Düzenle' }).click()
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
      'SELECT role, is_active FROM users WHERE username = ?',
      [ADMIN.username],
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
    await page.getByRole('row', { name: new RegExp(ADMIN.username) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Etkin').uncheck()
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Son etkin yönetici rolü düşürülemez veya pasifleştirilemez.',
    )

    const [satir] = await hazirTemizlik().sorgu<{ is_active: number }>(
      'SELECT is_active FROM users WHERE username = ?',
      [ADMIN.username],
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
    const kullaniciAdi = await kullaniciOlustur(page, 'pasif')

    await page.goto('/panel/kullanicilar')
    await page.getByRole('row', { name: new RegExp(kullaniciAdi) }).getByRole('link', { name: 'Düzenle' }).click()
    await page.getByLabel('Etkin').uncheck()
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

    await cikisYap(page)
    await page.goto('/panel/giris')
    await page.getByLabel('Kullanıcı adı').fill(kullaniciAdi)
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByRole('button', { name: 'Giriş yap' }).click()

    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Kullanıcı adı veya parola hatalı.')
    // Giriş sayfasında kalmalı: yönlendirme olsaydı mesaj doğru ama oturum açılmış olurdu.
    await expect(page).toHaveURL(/\/panel\/giris/)
  })

  // Aynı kullanıcı adıyla ikinci hesap açılamaz; users.username UNIQUE ve kısıt hatası
  // kullanıcıya 500 olarak değil alan hatası olarak dönmeli.
  test('kayıtlı kullanıcı adıyla ikinci kullanıcı açılamaz', async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('Kullanıcı adı').fill(ADMIN.username)
    await page.getByLabel('Ad soyad').fill('Çakışan Kullanıcı')
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByLabel('Rol', { exact: true }).selectOption('editor')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByText('Bu kullanıcı adı zaten kayıtlı.')).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('kısa parola alan hatası verir ve hesap açılmaz', async ({ page }) => {
    const kullaniciAdi = `kisa-${Date.now()}`
    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('Kullanıcı adı').fill(kullaniciAdi)
    await page.getByLabel('Ad soyad').fill('Kısa Parola')
    await page.getByLabel('Parola').fill('kisa')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByText('Parola en az 12 karakter olmalı.')).toBeVisible()
    const satirlar = await hazirTemizlik().sorgu<{ id: number }>('SELECT id FROM users WHERE username = ?', [
      kullaniciAdi,
    ])
    expect(satirlar).toHaveLength(0)
  })

  // Panel formu da giriş formuyla AYNI kuralı uyguluyor: kümenin dışındaki bir ad kaydedilip
  // sonra girişte reddedilseydi, yönetici hiç giremeyen bir hesap açardı ve bunu ancak
  // kullanıcı şikâyet edince öğrenirdi.
  test('geçersiz biçimli kullanıcı adı alan hatası verir ve hesap açılmaz', async ({ page }) => {
    const gecersiz = `Şükrü Bey-${Date.now()}`
    await girisYap(page, ADMIN)
    await page.goto('/panel/kullanicilar/yeni')
    await page.getByLabel('Kullanıcı adı').fill(gecersiz)
    await page.getByLabel('Ad soyad').fill('Geçersiz Ad')
    await page.getByLabel('Parola').fill(PAROLA)
    await page.getByLabel('Rol', { exact: true }).selectOption('editor')
    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page.getByText('küçük İngiliz harfleri (a-z)')).toBeVisible()
    const satirlar = await hazirTemizlik().sorgu<{ id: number }>('SELECT id FROM users WHERE username = ?', [
      gecersiz,
    ])
    expect(satirlar).toHaveLength(0)
  })
})
