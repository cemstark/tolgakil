import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// İletişim formu Görev 8'de geliyor; mesajlar bugün yalnız doğrudan yazılabiliyor.
// Her koşum kendi damgasını kullanıyor: iki Playwright projesi eş zamanlı koşuyor.
let temizlik: Temizlikci | null = null
let damga = ''

async function mesajEkle(konu: string, okundu: boolean): Promise<void> {
  await hazirTemizlik().calistir(
    'INSERT INTO messages (name, email, phone, subject, body, is_read) VALUES (?, ?, ?, ?, ?, ?)',
    [`Gönderen ${damga}`, `gonderen-${damga}@ornek.test`, '+90 216 000 00 00', konu, 'Mesaj gövdesi.', okundu],
  )
}

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

test('admin mesajı okundu işaretler ve siler', async ({ page }) => {
  const konu = `Danışma talebi ${damga}`
  await mesajEkle(konu, false)

  await girisYap(page, ADMIN)
  await page.goto('/panel/mesajlar')
  const satir = page.getByRole('row', { name: new RegExp(damga) })
  await expect(satir.getByText('Okunmadı')).toBeVisible()

  await satir.getByRole('button', { name: `Okundu işaretle: ${konu}` }).click()
  await expect(page.getByRole('status')).toHaveText('Mesaj okundu olarak işaretlendi.')
  await expect(page.getByRole('row', { name: new RegExp(damga) }).getByText('Okundu')).toBeVisible()

  // Sütun gerçekten yazılmalı; yalnız ekrana bakan bir iddia yanıltıcı olurdu.
  const [kayit] = await hazirTemizlik().sorgu<{ is_read: number }>(
    'SELECT is_read FROM messages WHERE subject = ?',
    [konu],
  )
  expect(kayit.is_read).toBe(1)

  await page.getByRole('row', { name: new RegExp(damga) }).getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(damga) })).toHaveCount(0)

  const bildirim = page.getByRole('status')
  await expect(bildirim).toHaveText('Mesaj silindi.')
  await expect(bildirim).toBeFocused()
})

// Mesaj gövdesi kullanıcı verisi: HTML olarak DEĞİL, metin olarak basılmalı.
test('mesaj gövdesi önizleme bölmesinde metin olarak gösterilir', async ({ page }) => {
  const konu = `Betikli konu ${damga}`
  await hazirTemizlik().calistir(
    'INSERT INTO messages (name, email, subject, body, is_read) VALUES (?, ?, ?, ?, ?)',
    [`Gönderen ${damga}`, `gonderen-${damga}@ornek.test`, konu, '<script>alert(1)</script> Merhaba', false],
  )

  await girisYap(page, ADMIN)
  await page.goto('/panel/mesajlar')
  // Gövde artık satır içindeki <details>'te değil, sağdaki önizleme bölmesinde (devir
  // tasarımı 5d). Konu bağlantısı seçimi değiştiriyor.
  await page
    .getByRole('row', { name: new RegExp(damga) })
    .getByRole('link', { name: konu })
    .click()

  const onizleme = page.getByRole('complementary', { name: 'Seçili mesajın önizlemesi' })
  // React kaçışı sayesinde etiket metin olarak görünüyor; çalıştırılmış olsaydı görünmezdi.
  await expect(onizleme.getByText('<script>alert(1)</script> Merhaba')).toBeVisible()
  // KVKK onayı kaydedilmemişse bu açıkça yazılmalı; boş bırakmak "onay var" izlenimi verirdi.
  await expect(onizleme.getByText('KVKK onayı kaydedilmemiş.')).toBeVisible()
  // Panelden yanıt gönderilmediği ekranda da yazılı olmalı (repodaki davranış).
  await expect(onizleme.getByText(/Yanıtlar büro posta hesabından gönderilir/)).toBeVisible()
})

// Tarama BURADA, kadro dosyasında değil: anlamlı olması için listede gerçek bir mesaj
// satırı bulunmalı. Boş bir tabloyu taramak satır içi eylemler ("Okundu işaretle" düğmesi,
// önizleme bölmesi, silme tetikleyicisi) hakkında hiçbir şey söylemez.
test('mesajlar listesinde erişilebilirlik ihlali yok', async ({ page }) => {
  await mesajEkle(`Okunmamış ${damga}`, false)
  await mesajEkle(`Okunmuş ${damga}`, true)

  await girisYap(page, ADMIN)
  await page.goto('/panel/mesajlar')
  await expect(page.getByRole('row', { name: new RegExp(damga) }).first()).toBeVisible()

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])

  // Başka bir satır seçiliyken de taranıyor: önizleme bölmesi seçime göre yeniden
  // çiziliyor ve ilk taramada gösterilen kayıt farklıydı.
  await page
    .getByRole('row', { name: new RegExp(`Okunmuş ${damga}`) })
    .getByRole('link', { name: `Okunmuş ${damga}` })
    .click()
  const acikSonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(acikSonuc.violations).toEqual([])
})
