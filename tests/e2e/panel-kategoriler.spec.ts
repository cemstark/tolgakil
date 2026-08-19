import { test, expect } from '@playwright/test'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// Kategoriler paylaşılan bir tablo ve categories.slug UNIQUE; iki Playwright projesi
// eş zamanlı koştuğu için her koşum kendi damgasını kullanıyor.
let temizlik: Temizlikci | null = null
let damga = ''

test.beforeEach(async () => {
  temizlik = await temizlikciAc()
  damga = `e2ekat${Date.now()}${Math.floor(Math.random() * 1000)}`
})

// Referans önce boşaltılıyor: beforeEach fırlarsa afterEach bir ÖNCEKİ testin kapatılmış
// bağlantısını temizlemeye çalışır ve asıl hatayı örter (panel-makale.spec.ts ile aynı ölçüm).
test.afterEach(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  // Sıra zorunlu: articles.category_id kısıtı ON DELETE RESTRICT, önce makaleler gider.
  await mevcut.silmeyeCalis('DELETE FROM articles WHERE title LIKE ?', [`%${damga}%`])
  await mevcut.silmeyeCalis('DELETE FROM categories WHERE name LIKE ?', [`%${damga}%`])
  await mevcut.kapat()
})

function hazirTemizlik(): Temizlikci {
  if (temizlik === null) throw new Error('Temizlik bağlantısı kurulmadı; beforeEach düşmüş olmalı.')
  return temizlik
}

test('admin kategori ekler ve boş kategoriyi siler', async ({ page }) => {
  const ad = `Kategori ${damga}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/kategoriler')

  await page.getByLabel('Kategori adı').fill(ad)
  await page.getByRole('button', { name: 'Kategori ekle' }).click()
  await expect(page.getByRole('status')).toHaveText('Kategori eklendi.')

  const satir = page.getByRole('row', { name: new RegExp(ad) })
  // Makale sayısı listede gösteriliyor; yeni kategori sıfır ile açılmalı.
  await expect(satir).toContainText('0')

  await satir.getByRole('button', { name: 'Sil' }).click()
  // Erişilebilir ad doğrulanıyor: paylaşılan kip pencere her bölümde kendi başlığını
  // duyurmalı (bkz. panel-kadro.spec.ts'teki aynı iddianın gerekçesi).
  await expect(page.getByRole('dialog', { name: 'Kategoriyi sil' })).toBeVisible()

  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Kategori silindi.')
})

/**
 * Kullanımdaki kategoriyi veritabanı reddediyor (ON DELETE RESTRICT). Kullanıcının görmesi
 * gereken şey ham SQL hatası veya hata sayfası değil, ne yapması gerektiğini söyleyen
 * Türkçe bir cümle. Bu iddia kaldırılırsa `isForeignKeyRestriction` dalını hiçbir şey ölçmez.
 */
test('bağlı makalesi olan kategori silinmez ve gerekçe Türkçe okunur', async ({ page }) => {
  const ad = `Dolu Kategori ${damga}`
  const slug = `dolu-kategori-${damga}`
  const temizlikci = hazirTemizlik()

  await temizlikci.calistir('INSERT INTO categories (slug, name) VALUES (?, ?)', [slug, ad])
  const [kategori] = await temizlikci.sorgu<{ id: number }>('SELECT id FROM categories WHERE slug = ?', [slug])
  await temizlikci.calistir(
    'INSERT INTO articles (slug, title, excerpt, content, category_id, status) VALUES (?, ?, ?, ?, ?, ?)',
    [`makale-${damga}`, `Makale ${damga}`, 'Kısa özet metni.', '<p>Gövde</p>', kategori.id, 'draft'],
  )

  await girisYap(page, ADMIN)
  await page.goto('/panel/kategoriler')
  const satir = page.getByRole('row', { name: new RegExp(ad) })
  await expect(satir).toContainText('1')

  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()

  const onay = page.getByRole('dialog')
  await expect(onay.getByRole('alert')).toHaveText('Bu kategoriye bağlı makaleler var; önce onları taşıyın.')
  // Kayıt gerçekten durmalı: mesaj doğru ama satır silinmiş olsaydı iddia yanıltıcı olurdu.
  await page.goto('/panel/kategoriler')
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toBeVisible()
})
