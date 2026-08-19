import { test, expect } from '@playwright/test'
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
test('mesaj gövdesi açılır bölümde metin olarak gösterilir', async ({ page }) => {
  const konu = `Betikli konu ${damga}`
  await hazirTemizlik().calistir(
    'INSERT INTO messages (name, email, subject, body, is_read) VALUES (?, ?, ?, ?, ?)',
    [`Gönderen ${damga}`, `gonderen-${damga}@ornek.test`, konu, '<script>alert(1)</script> Merhaba', false],
  )

  await girisYap(page, ADMIN)
  await page.goto('/panel/mesajlar')
  // Konu metni satırda iki kez geçiyor (açılır bölüm başlığı ve silme onayının gövdesi);
  // seçici doğrudan açılır bölümün başlığını hedefliyor.
  await page.getByRole('row', { name: new RegExp(damga) }).locator('summary').click()

  // React kaçışı sayesinde etiket metin olarak görünüyor; çalıştırılmış olsaydı görünmezdi.
  await expect(page.getByText('<script>alert(1)</script> Merhaba')).toBeVisible()
  // KVKK onayı kaydedilmemişse bu açıkça yazılmalı; boş bırakmak "onay var" izlenimi verirdi.
  await expect(page.getByText('KVKK onayı kaydedilmemiş.')).toBeVisible()
})
