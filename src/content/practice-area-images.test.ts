import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ABOUT_IMAGE, HERO_IMAGE, PRACTICE_AREA_IMAGES, practiceAreaImage } from '@/content/practice-area-images'
import { CONTENT_APPROVAL } from '@/content/site'
import { SEED_PRACTICE_AREAS } from '@/db/seed-content'

describe('PRACTICE_AREA_IMAGES', () => {
  // Eşleme elle yazılıyor ve tohumdaki slug'larla eşleşmek zorunda. Kaçarsa hiçbir şey
  // patlamıyor: kart sessizce görselsiz çiziliyor ve bunu ancak sayfayı açan biri fark
  // ediyor. Test o sessiz kaymayı derlemeden önce görünür kılıyor.
  it('tohumdaki yedi alanın hepsinin görseli var', () => {
    for (const alan of SEED_PRACTICE_AREAS) {
      expect(practiceAreaImage(alan.slug), `${alan.slug} için görsel tanımlı değil`).toBeDefined()
    }
  })

  // Ters yön de önemli: tohumdan bir alan çıkarıldığında buradaki kayıt öksüz kalır ve
  // artık hiçbir sayfanın kullanmadığı bir dosya `public/` altında taşınmaya devam eder.
  it('tohumda karşılığı olmayan fazladan anahtar yok', () => {
    // Set<string> açıkça yazılıyor: SEED_PRACTICE_AREAS `as const` olduğu için slug'lar
    // literal birleşim tipinde çıkıyor ve `.has(string)` çağrısı tip hatası veriyor.
    const tohumSluglari = new Set<string>(SEED_PRACTICE_AREAS.map((alan) => alan.slug))
    for (const anahtar of Object.keys(PRACTICE_AREA_IMAGES)) {
      expect(tohumSluglari.has(anahtar), `${anahtar} tohumda yok`).toBe(true)
    }
  })

  // Künye kapsamı (CONTENT_APPROVAL.practiceAreaSlugs) aynı yedi slug'ın kodda ÜÇÜNCÜ
  // kopyası: tohum, görsel eşlemesi ve künye listesi. Biri yeniden adlandırılırsa künye
  // sessizce kaybolur — güvenli yön (yanlış onay beyanı basmaktansa hiç basmamak iyidir)
  // ama sessiz; test o sessizliği bozuyor.
  it('künye kapsamı tohumdaki yedi alanla birebir aynı', () => {
    const tohum = [...SEED_PRACTICE_AREAS.map((alan) => alan.slug)].sort()
    const kunye = [...CONTENT_APPROVAL.practiceAreaSlugs].sort()
    expect(kunye).toEqual(tohum)
  })

  it('panelden eklenmiş, eşlemede olmayan alan için undefined döner', () => {
    // Çağıranlar bu durumda görsel bloğunu hiç çizmiyor; sözleşme burada sabitleniyor.
    expect(practiceAreaImage('vergi-hukuku')).toBeUndefined()
  })
})

describe('görsel dosyaları', () => {
  // Yol dizesi doğru görünüp dosya `public/` altında bulunmayabilir: betik koşmadan
  // dağıtım yapılırsa ya da bir dosya adı elle değiştirilirse. Next böyle bir <Image>'ı
  // derleme sırasında doğrulamıyor, kullanıcı 404 görüyor. Bu yüzden varlık gerçekten
  // disk üzerinde aranıyor.
  const tumGorseller = [...Object.values(PRACTICE_AREA_IMAGES), HERO_IMAGE, ABOUT_IMAGE]

  it('hepsi public/ altında gerçekten var', () => {
    for (const gorsel of tumGorseller) {
      const diskYolu = path.join(process.cwd(), 'public', gorsel.src)
      expect(existsSync(diskYolu), `${gorsel.src} bulunamadı — scripts/fetch-stock-images.mts koşturun`).toBe(true)
    }
  })

  // Bildirilen ölçü DİSKTEKİ dosyayla karşılaştırılıyor, yalnız "sıfırdan büyük mü" diye
  // bakılmıyor. Sebep: `width`/`height` alanlarını bugün hiçbir bileşen okumuyor (hepsi
  // `fill` kullanıyor), yani yanlış bir değer hiçbir yerde patlamaz ve sessizce yalan
  // söyleyen bir sabit olarak kalırdı. Görseller yeniden üretilip oranı değişirse bu test
  // düşer ve modül gerçeğe geri çekilir.
  it('bildirilen ölçüler diskteki dosyayla birebir aynı', async () => {
    const sharp = (await import('sharp')).default

    for (const gorsel of tumGorseller) {
      expect(gorsel.src.endsWith('.webp'), `${gorsel.src} WebP değil`).toBe(true)

      const meta = await sharp(path.join(process.cwd(), 'public', gorsel.src)).metadata()
      expect(meta.width, `${gorsel.src} genişliği`).toBe(gorsel.width)
      expect(meta.height, `${gorsel.src} yüksekliği`).toBe(gorsel.height)
    }
  })
})
