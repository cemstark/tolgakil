import { mkdtempSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { buildStoredName, resolveUploadPath, storeImage, uploadDir } from '@/lib/media-storage'

let dizin: string

beforeAll(() => {
  dizin = mkdtempSync(path.join(tmpdir(), 'medya-'))
  process.env.UPLOAD_DIR = dizin
})

afterAll(() => {
  rmSync(dizin, { recursive: true, force: true })
})

describe('uploadDir', () => {
  it('göreli yolu mutlak yola çevirir', () => {
    process.env.UPLOAD_DIR = './.uploads-birim-deneme'
    expect(uploadDir()).toBe(path.resolve('./.uploads-birim-deneme'))
    process.env.UPLOAD_DIR = dizin
  })

  // Değişken yoksa sessizce çalışma dizinine yazmak, üretimde yüklemeleri dağıtım kökünün
  // içine döker ve ilk dağıtımda hepsini sildirir. Gürültülü durmak tek doğru davranış.
  it('UPLOAD_DIR tanımsızsa fırlatır', () => {
    delete process.env.UPLOAD_DIR
    expect(() => uploadDir()).toThrow(/UPLOAD_DIR/)
    process.env.UPLOAD_DIR = dizin
  })
})

describe('resolveUploadPath', () => {
  it('yükleme dizini içindeki yolu çözer', () => {
    expect(resolveUploadPath('2026/08/a.webp')).toBe(path.resolve(dizin, '2026/08/a.webp'))
  })

  // Dosya adı kullanıcıdan geliyor; ".." ile dizin dışına yazma/okuma girişimi reddedilmeli.
  it.each(['../../etc/passwd', '2026/../../../gizli.txt', '/mutlak/yol.webp'])(
    '%s yolunu reddeder',
    (kotu) => {
      expect(() => resolveUploadPath(kotu)).toThrow(/yükleme dizini/i)
    },
  )

  // Kök dizinin KENDİSİ dosya değil; servis rotası boş yol ile çağrılırsa dizini okumaya
  // çalışıp EISDIR ile 500 dönerdi. Ayrıca "/kok" ile "/kok-yedek" karışmasın: startsWith
  // ayıraçsız yazılırsa kardeş dizin de içeride sayılır.
  it('kök dizinin kendisini kabul etmez', () => {
    expect(() => resolveUploadPath('')).toThrow(/yükleme dizini/i)
  })

  it('adı köke önek olan kardeş dizini reddeder', () => {
    expect(() => resolveUploadPath('../' + path.basename(dizin) + '-yedek/a.webp')).toThrow(/yükleme dizini/i)
  })
})

describe('buildStoredName', () => {
  it('kullanıcının dosya adını kullanmaz, içerikten türetir', () => {
    const { relative, extension } = buildStoredName('Tehlikeli ../ İsim.PNG', Buffer.from('abc'))
    expect(extension).toBe('.webp')
    expect(relative).toMatch(/^\d{4}\/\d{2}\/[a-f0-9]{16}\.webp$/)
    expect(relative).not.toContain('..')
  })

  // Ad içerik özeti: aynı görsel iki kez yüklenirse aynı yola düşer. Değişmez önbellekleme
  // (max-age=31536000, immutable) ancak bu sayede güvenli.
  it('aynı içerik için aynı adı üretir, farklı içerik için farklı', () => {
    const a = buildStoredName('bir.png', Buffer.from('abc'))
    const b = buildStoredName('bambaska.jpg', Buffer.from('abc'))
    const c = buildStoredName('bir.png', Buffer.from('abd'))
    expect(a.relative).toBe(b.relative)
    expect(a.relative).not.toBe(c.relative)
  })
})

describe('storeImage', () => {
  it('büyük görseli 1600 piksele indirir ve WebP yazar', async () => {
    const kaynak = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#123456' } })
      .jpeg()
      .toBuffer()
    const dosya = new File([kaynak], 'buyuk.jpg', { type: 'image/jpeg' })
    const sonuc = await storeImage(dosya, dizin)
    expect(sonuc.width).toBe(1600)
    expect(sonuc.height).toBe(1067)
    const yazilan = await readFile(resolveUploadPath(sonuc.relative))
    expect((await sharp(yazilan).metadata()).format).toBe('webp')
    // Bildirilen boyut diskteki dosyayla uyuşmalı; kayıt listede bu değerle görünüyor.
    expect(sonuc.sizeBytes).toBe(yazilan.byteLength)
  })

  // Küçük görsel büyütülmez: withoutEnlargement düşerse 1×1 nokta 1600 piksele şişer ve
  // bulanık bir dev dosya üretilir.
  it('küçük görseli büyütmez', async () => {
    const kaynak = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#654321' } })
      .png()
      .toBuffer()
    const sonuc = await storeImage(new File([kaynak], 'kucuk.png', { type: 'image/png' }), dizin)
    expect(sonuc.width).toBe(40)
    expect(sonuc.height).toBe(20)
  })

  // Telefonla çekilen fotoğrafların çoğu dik değil, EXIF etiketiyle döndürülmüş kaydediliyor.
  // .rotate() düşerse kapak görselleri panelde yan yatar.
  it('EXIF yön etiketini uygular', async () => {
    const kaynak = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#abcdef' } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()
    const sonuc = await storeImage(new File([kaynak], 'yatik.jpg', { type: 'image/jpeg' }), dizin)
    expect(sonuc.width).toBe(200)
    expect(sonuc.height).toBe(400)
  })

  // sharp SVG'yi rasterleştirebiliyor; kabul edilseydi panelden gelen XML librsvg'ye
  // beslenirdi. Çıktı WebP olduğu için betik hayatta kalmaz ama ayrıştırıcıyı hiç
  // çalıştırmamak daha ucuz: biçim beyaz listesi girişte durduruyor.
  it('SVG dosyasını reddeder', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    const dosya = new File([svg], 'vektor.svg', { type: 'image/svg+xml' })
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/desteklenmiyor/i)
  })

  // Bayt sınırı piksel sayısını sınırlamıyor: 8000×8000 düz PNG ölçüldü, 8 MB sınırının
  // yalnız %2,4'ü kadar yer tutuyor ama çözülmüş hâli yüzlerce MB. Denetim çözmeden önce,
  // metadata üzerinden yapılmalı.
  it('piksel sayısı çok yüksek görseli çözmeden reddeder', async () => {
    const bomba = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#000000' } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    // Dosyanın küçüklüğü iddianın kendisi: bayt sınırı bu saldırıyı görmez.
    expect(bomba.byteLength).toBeLessThan(8 * 1024 * 1024)
    const dosya = new File([bomba], 'bomba.png', { type: 'image/png' })
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/çözünürlüğü çok yüksek/i)
  })

  // İlan edilmeyen ayrıştırıcı açık kalmamalı: arayüz "JPEG, PNG, WebP veya GIF" diyor.
  it('ilan edilmeyen biçimi (TIFF) reddeder', async () => {
    const kaynak = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#0000ff' } })
      .tiff()
      .toBuffer()
    const dosya = new File([kaynak], 'tarama.tiff', { type: 'image/tiff' })
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/desteklenmiyor/i)
  })

  it('görsel olmayan dosyayı reddeder', async () => {
    const dosya = new File([Buffer.from('bu bir metin')], 'not.txt', { type: 'image/png' })
    // İstemcinin bildirdiği MIME tipine değil, dosyanın gerçek içeriğine bakılır.
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/geçerli bir görsel/i)
  })

  // Boyut sınırı sunucuda: istemcideki denetim kolaylık, güvenlik değil.
  it('sınırı aşan dosyayı reddeder', async () => {
    const dosya = new File([Buffer.alloc(8 * 1024 * 1024 + 1)], 'devasa.png', { type: 'image/png' })
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/çok büyük/i)
  })

  it('boş dosyayı reddeder', async () => {
    const dosya = new File([], 'bos.png', { type: 'image/png' })
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/dosya seçin/i)
  })
})
