import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

/**
 * İletişim formu — sitenin KİMLİK DOĞRULAMASI OLMAYAN tek yazma yolu.
 *
 * Denetimde yakalandı: form eklendiğinde ne birim ne e2e testi yazılmıştı; "292 e2e temiz"
 * rakamı en riskli parçaya hiç değmiyordu. Buradaki durumlar iki gerçek hatanın regresyon
 * testi:
 *   - doğrulama hatasında ziyaretçinin yazdıklarının silinmesi (React 19 form sıfırlaması),
 *   - tuzak alan dolduğunda mesajın sessizce ATILMASI.
 *
 * Her koşum kendi damgasını kullanıyor: iki Playwright projesi (masaüstü/mobil) eş zamanlı
 * koşuyor ve aynı veritabanını paylaşıyor.
 */
let temizlik: Temizlikci | null = null
let damga = ''

function hazirTemizlik(): Temizlikci {
  if (temizlik === null) throw new Error('Temizlik bağlantısı kurulmadı; beforeEach düşmüş olmalı.')
  return temizlik
}

test.beforeEach(async () => {
  temizlik = await temizlikciAc()
  damga = `${Date.now()}${Math.floor(Math.random() * 1000)}`
})

test.afterEach(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  await mevcut.silmeyeCalis('DELETE FROM messages WHERE subject LIKE ?', [`%${damga}%`])
  await mevcut.kapat()
})

/**
 * Formu doldurur. Hız sınırı e-posta anahtarlı olduğu için e-posta da damgalı: aynı
 * koşumdaki testler birbirinin kotasını yemesin.
 */
async function formuDoldur(page: Page, konu: string, kvkkOnayla: boolean): Promise<void> {
  await page.getByLabel('Ad soyad').fill(`Ziyaretçi ${damga}`)
  await page.getByLabel('E-posta').fill(`ziyaretci-${damga}@ornek.test`)
  await page.getByLabel(/Telefon/).fill('0532 111 22 33')
  await page.getByLabel('Konu').fill(konu)
  await page
    .getByLabel('Mesajınız')
    .fill('Kiracı olduğum işyeri için kira bedelinin belirlenmesi konusunda görüşmek istiyorum.')
  if (kvkkOnayla) await page.getByRole('checkbox').check()
}

test('geçerli gönderim kaydedilir ve form temizlenir', async ({ page }) => {
  const konu = `Kira sözleşmesi ${damga}`
  await page.goto('/iletisim')
  await formuDoldur(page, konu, true)
  await page.getByRole('button', { name: /Mesajı gönder/ }).click()

  await expect(page.getByText('Mesajınız alındı')).toBeVisible()

  // Kayıt gerçekten oluştu mu — "başarılı" mesajı tek başına bunu kanıtlamaz.
  const satirlar = await hazirTemizlik().sorgu<{ subject: string; kvkk: number }>(
    'SELECT subject, kvkk_accepted_at IS NOT NULL AS kvkk FROM messages WHERE subject = ?',
    [konu],
  )
  expect(satirlar).toHaveLength(1)
  // KVKK onay ANI yazılmalı: rızanın ne zaman verildiği rızanın kendisi kadar önemli.
  expect(Number(satirlar[0].kvkk)).toBe(1)

  // Başarıdan sonra form temizlenir; aksi hâlde kullanıcı gönderdiği metni ekranda görüp
  // gönderilmediğini sanar.
  await expect(page.getByLabel('Konu')).toHaveValue('')
  await expect(page.getByLabel('Mesajınız')).toHaveValue('')
})

test('doğrulama hatasında girilen değerler KORUNUR', async ({ page }) => {
  // REGRESYON: React 19, `<form action={fn}>` gönderiminde formu eylem çalışmadan önce
  // sıfırlıyor. Form kontrolsüzken bir onay kutusu hatası, ziyaretçinin yazdığı her şeyi
  // siliyordu — uzun bir olay anlatımını kaybeden kullanıcı büyük olasılıkla vazgeçer.
  const konu = `Onaysız gönderim ${damga}`
  await page.goto('/iletisim')
  await formuDoldur(page, konu, false)
  await page.getByRole('button', { name: /Mesajı gönder/ }).click()

  await expect(page.getByText(/aydınlatma metnini onaylamalısınız/i)).toBeVisible()

  await expect(page.getByLabel('Ad soyad')).toHaveValue(`Ziyaretçi ${damga}`)
  await expect(page.getByLabel('Konu')).toHaveValue(konu)
  await expect(page.getByLabel('Mesajınız')).not.toHaveValue('')

  // Onay verilmediği için hiçbir kayıt oluşmamalı.
  const satirlar = await hazirTemizlik().sorgu('SELECT id FROM messages WHERE subject = ?', [konu])
  expect(satirlar).toHaveLength(0)
})

test('tuzak alan doluyken mesaj yine kaydedilir, yalnız işaretlenir', async ({ page }) => {
  // REGRESYON: ilk sürüm tuzak alan doluyken sessizce "başarılı" dönüp kaydı ATIYORDU.
  // Parola yöneticisi veya tarayıcı profili gizli alanı doldurursa gerçek bir başvuru
  // sessizce kaybolurdu — bir hukuk bürosunda süreye bağlı bir hak kaybı demek.
  const konu = `Tuzak denemesi ${damga}`
  await page.goto('/iletisim')
  await formuDoldur(page, konu, true)
  // Alan görsel olarak gizli; doldurmak için değeri doğrudan atıyoruz.
  await page.locator('input[name="website"]').fill('https://spam.ornek.test', { force: true })
  await page.getByRole('button', { name: /Mesajı gönder/ }).click()

  await expect(page.getByText('Mesajınız alındı')).toBeVisible()

  const satirlar = await hazirTemizlik().sorgu<{ subject: string }>(
    'SELECT subject FROM messages WHERE subject LIKE ?',
    [`%${damga}%`],
  )
  expect(satirlar).toHaveLength(1)
  expect(satirlar[0].subject).toBe(`[şüpheli] ${konu}`)
})

test('iletişim sayfasında erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/iletisim')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('doğrulama hatası ekranında da erişilebilirlik ihlali yok', async ({ page }) => {
  // Hata durumu ayrıca taranıyor: aria-invalid, aria-describedby ve canlı bölge yalnız
  // bu durumda devreye giriyor ve temiz sayfayı tarayan bir test onlar hakkında hiçbir
  // şey kanıtlamaz.
  await page.goto('/iletisim')
  await formuDoldur(page, `Erişilebilirlik ${damga}`, false)
  await page.getByRole('button', { name: /Mesajı gönder/ }).click()
  await expect(page.getByText(/aydınlatma metnini onaylamalısınız/i)).toBeVisible()

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})
