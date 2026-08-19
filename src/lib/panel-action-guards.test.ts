import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Panel server action'larının yetki denetimini KAYNAK ÜZERİNDEN tarar.
 *
 * Neden kaba bir tarama: bir server function'ı gerçekten dispatch eden bir test yazmak
 * mümkün (bkz. `tests/e2e/panel-yetki.spec.ts`) ama pahalı — Next bir action'ı yalnız
 * `Next-Action` başlığıyla çağırıyor, dolayısıyla istek önce yönetici oturumunda
 * yakalanmak zorunda. O test `saveLawyer` için yazıldı; geri kalan dokuz action'ı aynı
 * yolla kapsamak dokuz e2e turu demekti.
 *
 * Bu tarama onların yerine geçmiyor, kapsamadıkları mutasyonu kapatıyor: birinden
 * `requireAccess` düşerse burada kırmızı olur. Neyi ÖLÇMEDİĞİ de açık — çağrının doğru
 * kaynakla yapıldığını ya da erken dönen bir dalda atlanmadığını görmez.
 */

const PANEL_KOKU = path.resolve(import.meta.dirname, '../app/panel')

// Yetki denetimi taşımaması BİLİNÇLİ olan iki fonksiyon. Liste burada duruyor ki yeni bir
// muafiyet eklemek görünür bir karar olsun.
const MUAF: ReadonlyMap<string, readonly string[]> = new Map([
  // Çıkış yapmak için yetki gerekmez; oturumu olan herkes kendi oturumunu kapatabilir.
  ['actions.ts', ['signOutAction']],
  // Giriş, oturum açmadan önce koşan tek action.
  ['giris/actions.ts', ['login']],
])

function actionDosyalari(dizin: string): string[] {
  const bulunanlar: string[] = []
  for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
    const tamYol = path.join(dizin, girdi.name)
    if (girdi.isDirectory()) bulunanlar.push(...actionDosyalari(tamYol))
    else if (girdi.name === 'actions.ts') bulunanlar.push(tamYol)
  }
  return bulunanlar
}

const dosyalar = actionDosyalari(PANEL_KOKU)

describe('panel server action yetki denetimi', () => {
  // Boş bir liste bütün iddiaları sessizce geçirirdi: tarama yolunu kaybederse kırmızı olsun.
  it('taranacak actions.ts dosyalarını bulur', () => {
    expect(dosyalar.length).toBeGreaterThanOrEqual(8)
  })

  it.each(dosyalar.map((d) => [path.relative(PANEL_KOKU, d).replaceAll('\\', '/'), d]))(
    '%s içindeki her dışa aktarılan action requireAccess çağırıyor',
    (goreliYol, tamYol) => {
      const kaynak = readFileSync(tamYol, 'utf8')
      expect(kaynak.startsWith("'use server'"), `${goreliYol} 'use server' ile başlamıyor`).toBe(true)

      // Her parça bir fonksiyonun adından bir sonraki dışa aktarıma kadar olan gövdesidir.
      const parcalar = kaynak.split('\nexport async function ').slice(1)
      expect(parcalar.length, `${goreliYol} içinde dışa aktarılan action yok`).toBeGreaterThan(0)

      const muafOlanlar = MUAF.get(goreliYol) ?? []
      for (const parca of parcalar) {
        const ad = parca.slice(0, parca.indexOf('('))
        if (muafOlanlar.includes(ad)) continue
        expect(parca.includes('requireAccess('), `${goreliYol} → ${ad} requireAccess çağırmıyor`).toBe(true)
      }
    },
  )
})
