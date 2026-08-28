import { test, expect } from '@playwright/test'
import { adimiAc } from './helpers/editor'
import { girisYap, ADMIN } from './helpers/auth'
import { testIcerigiHazirla, type TestIcerigi } from './helpers/test-content'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// Ana sayfa artık veritabanından besleniyor ve tohumda ne makale ne avukat var. Veri
// PANELDEN üretiliyor, doğrudan SQL ile DEĞİL: üretim derlemesinde ana sayfa önbellekli
// ve yalnız server action'ların önbellek tazeleme çağrısı onu güncelliyor. Ham INSERT
// sessizce görünmez kalır ve test nedenini anlaşılmaz biçimde kaybederdi.
let icerik: TestIcerigi | null = null
let temizlik: Temizlikci | null = null
const avukatAdlari: string[] = []

test.beforeEach(async () => {
  icerik = await testIcerigiHazirla()
  temizlik = await temizlikciAc()
})

test.afterEach(async () => {
  const mevcutIcerik = icerik
  const mevcutTemizlik = temizlik
  icerik = null
  temizlik = null
  if (mevcutTemizlik !== null) {
    try {
      for (const ad of avukatAdlari) {
        await mevcutTemizlik.silmeyeCalis('DELETE FROM lawyers WHERE full_name LIKE ?', [`%${ad}%`])
      }
    } finally {
      await mevcutTemizlik.kapat()
    }
  }
  await mevcutIcerik?.temizle()
})

function hazir(): TestIcerigi {
  if (icerik === null) throw new Error('Test içeriği hazırlanmadı; beforeEach düşmüş olmalı.')
  return icerik
}

test('yayımlanan makale ve avukat ana sayfada görünür', async ({ page }) => {
  const damga = hazir().damga
  const makaleBasligi = `Kira tespit notu ${damga}`
  const avukatAdi = `Deneme Avukat ${damga}`
  avukatAdlari.push(avukatAdi)

  await girisYap(page, ADMIN)

  // 1) Makale: yaz → kategori seç → yayımla.
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(makaleBasligi)
  await page.getByLabel('Özet').fill('Kira bedelinin belirlenmesinde uygulanan ölçütler üzerine kısa not.')
  await page.locator('[contenteditable="true"]').fill('Kiracının hakları ve süreler.')
  await adimiAc(page, 'Yayın')
  await page.getByLabel('Kategori').selectOption({ label: hazir().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  // 2) Avukat: ekle → yayına al.
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(avukatAdi)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  // 3) Ana sayfa: iki kayıt da görünüyor. Bu iddia aynı zamanda önbellek tazelemesinin
  //    ölçümü — sayfa üretimde önbellekli ve panel eylemi onu geçersizleştirmezse burada
  //    bayat HTML gelir.
  await page.goto('/')
  await expect(page.getByRole('link', { name: new RegExp(makaleBasligi) })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(avukatAdi) })).toBeVisible()
  await expect(page.locator('a[href^="/kadro/"]').first()).toBeVisible()

  // 4) <time>: öznitelik ISO gün, görünen metin aynı gün (formatDate/isoDate sözleşmesi).
  const time = page.locator('#articles ul time').first()
  const gun = await time.getAttribute('datetime')
  expect(gun).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const [yil, ay, gunRakami] = gun!.split('-')
  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ]
  await expect(time).toHaveText(`${gunRakami} ${aylar[Number(ay) - 1]} ${Number(yil)}`)

  // 5) Krem yüzeyde odak halkası --gold-ink'e döner (data-surface sözleşmesi).
  //    `#articles a` değil `#articles ul a`: "Tümünü gör" zaten .textLink ile --gold-ink
  //    renginde metin taşıyor, outline-color bildirilmezse currentcolor'a çözülüp halka
  //    hiç çizilmese bile testi yanıltıcı biçimde geçirirdi.
  const link = page.locator('#articles ul a').first()
  await link.focus()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await expect(link).toHaveCSS('outline-width', '2px')
  await expect(link).toHaveCSS('outline-color', 'rgb(125, 95, 38)')
})

test('yayımlanmamış avukat ana sayfada görünmez', async ({ page }) => {
  const avukatAdi = `Taslak Avukat ${hazir().damga}`
  avukatAdlari.push(avukatAdi)

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(avukatAdi)
  await page.getByLabel('Unvan').fill('Avukat')
  // "Yayında" İŞARETLENMİYOR: sızıntının ölçüldüğü tek yer bu.
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  await page.goto('/')
  await expect(page.getByText(avukatAdi)).toHaveCount(0)
})
