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

// Gezinmeyi gizlemek koruma değil ve rota korumasının kendisi de tek hat değil: server
// function bulunduğu rotaya POST olarak gider. proxy.ts matcher'ı değişirse ilk hat sessizce
// kalkar; ikinci hat her action'ın içindeki requireAccess'tir.
test('editor doğrudan gönderdiği kadro formuyla da kayıt oluşturamaz', async ({ page }) => {
  const ad = `Sızma Denemesi ${Date.now()}`
  const temizlik = await temizlikciAc()
  try {
    await girisYap(page, EDITOR)
    const yanit = await page.request.post('/panel/kadro/yeni', {
      form: { fullName: ad, title: 'Avukat', slug: '' },
    })
    expect(yanit.status()).toBeGreaterThanOrEqual(400)

    // Ekranda görünmemesi yetmez; veritabanında da olmamalı. Arayüz kaydı gizleseydi
    // (ör. yalnız yayımlananları listeleseydi) HTML iddiası yanlış güvence verirdi.
    const satirlar = await temizlik.sorgu<{ id: number }>('SELECT id FROM lawyers WHERE full_name = ?', [ad])
    expect(satirlar).toHaveLength(0)

    await cikisYap(page)
    await girisYap(page, ADMIN)
    await page.goto('/panel/kadro')
    await expect(page.getByText(ad)).toHaveCount(0)
  } finally {
    // Kayıt oluşmamış OLMALI; oluştuysa test zaten kırmızı, ama artığı bırakmıyoruz.
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
