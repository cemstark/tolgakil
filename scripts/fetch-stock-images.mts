import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { WEBP_QUALITY } from '../src/lib/media-limits.ts'

/**
 * Halka açık sayfaların stok görsellerini Unsplash'ten indirip WebP'ye çevirir.
 *
 *   node scripts/fetch-stock-images.mts          → eksik olanları üretir
 *   node scripts/fetch-stock-images.mts --force  → var olanların üstüne yazar
 *
 * **Neden repoda duruyor:** `docs/gorseller/kaynak-lisans.md` "hangi görsel" sorusunu
 * yanıtlıyor, bu betik "nasıl üretildi" sorusunu yanıtlıyor ve bunun tek dürüst biçimi
 * çalışan koddur. Markdown'a yazılan bir komut çalıştırılamaz, zamanla gerçeklikten
 * kopar. Görsel değişimi tekrar edecek bir iş: müvekkil bir fotoğrafı beğenmezse
 * SLUG'ı değiştirip yeniden koşmak yetiyor.
 *
 * **Neden package.json'a eklenmedi:** bu projedeki npm script'leri dağıtım sözleşmesi
 * (`db:deploy` üç adımı zincirliyor ve `prebuild` onu otomatik çağırıyor). Tek seferlik
 * bir varlık üreticisinin o listede yeri yok; üretim derlemesi bu uç noktaya HİÇ
 * bağlanmamalı. Üretilen dosyalar `public/` altında sürüm denetimine giriyor, yani
 * dağıtım Unsplash'e erişemese de site eksiksiz derleniyor.
 *
 * **Neden arama yapmıyor:** SLUG'lar elle yazılı. Betik kendi arama yapsaydı aynı komut
 * her koşumda başka bir fotoğraf üretir, `docs/gorseller/kaynak-lisans.md` ile
 * `public/gorsel/` birbirinden sessizce ayrışırdı.
 */

// Unsplash'in resmi indirme uç noktası. `force=true` tarayıcı yönlendirmesini atlar,
// `w` kaynak genişliğini sınırlar. UA başlığı ZORUNLU: başlıksız istek 401 dönüyor.
const UNSPLASH_INDIRME = (slug: string, genislik: number) =>
  `https://unsplash.com/photos/${slug}/download?force=true&w=${genislik}`

const TARAYICI_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// Kaynak indirme genişliği hedef genişliklerin üstünde tutuluyor: hero 4/5 DİKEY
// kırpılıyor ve yatay bir fotoğraftan 1600 piksel yükseklik ancak 2400 piksel genişlikte
// bir kaynaktan çıkıyor. Küçük indirip büyütmek çözünürlük uydurmak olurdu.
const KAYNAK_GENISLIK = 2400

const CIKTI_DIZINI = 'public/gorsel'

type StokGorsel = {
  dosya: string
  slug: string
  genislik: number
  yukseklik: number
  /** Gözle denetimde ne görüldüğü; `docs/gorseller/kaynak-lisans.md` ile aynı metin. */
  konu: string
  /**
   * Kırpma odağı (sharp `position`). Varsayılan merkez kırpma bazı fotoğraflarda istenmeyen
   * bir ayrıntıyı kadraja sokuyor — bu alan onu dışarıda bırakmak için var, estetik tercih
   * için değil. Kullanıldığı yerde NEDENİ yazılmalı.
   */
  odak?: 'left' | 'right' | 'top' | 'bottom'
}

/**
 * Dosya adları Türkçe ve slug'larla eşleşiyor: `practice-area-images.ts` içindeki
 * anahtarlar `practice_areas.slug` sütunundan geliyor, iki taraf gözle karşılaştırılabilsin.
 *
 * Oranlar üç grup: hero 4/5 (dikey), çalışma alanları 16/10, hakkımızda 16/7. Bunlar
 * DOSYA oranları; ekrandaki çerçeve oranı sayfaya göre değişiyor ve farkı `object-fit:
 * cover` kapatıyor (ör. alan ayrıntı bandı masaüstünde 3/1). Tek dosya birden çok
 * çerçevede kullanıldığı için ikinci bir varyant üretilmiyor.
 */
const GORSELLER: readonly StokGorsel[] = [
  {
    dosya: 'hero-themis.webp',
    slug: 'yCdPU73kGSc',
    genislik: 1280,
    yukseklik: 1600,
    konu: 'Adalet (Themis) heykeli, terazi; açık gri zemin, solda geniş boşluk',
  },
  {
    dosya: 'gayrimenkul.webp',
    slug: '1hSh1aDG6Mg',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Tarihi mimari çizim: bina cepheleri ve kat planları, okunur yabancı metin yok',
  },
  {
    dosya: 'icra-iflas.webp',
    slug: 'K-ZsC7YdJ6Y',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Siyah kurdeleyle bağlanmış eski dosya tomarları; adliye arşivi görünümü',
  },
  {
    dosya: 'is.webp',
    slug: 'tjd5CfdDPRA',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Boş toplantı masası ve deri sandalyeler; insan yok',
  },
  {
    dosya: 'tazminat.webp',
    slug: 'CKlHKtCJZKk',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Dolmakalem ve el yazılı defter, ahşap masa; yazı okunmuyor',
  },
  {
    dosya: 'sigorta.webp',
    slug: 'QI6NLgN5XnM',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Belge imzalayan eller, sıcak bokeh ışık; yüz yok',
  },
  {
    dosya: 'kira.webp',
    slug: 'iHNGF-5Dyn8',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Ahşap kapı ve antika kapı kolu yakın çekim',
  },
  {
    dosya: 'miras.webp',
    slug: 'MiNq1Mjikfw',
    genislik: 1600,
    yukseklik: 1000,
    konu: 'Antika el yazması belge, sararmış kâğıt dokusu; sıcak sarı-kahve ton',
    // İlk seçilen görsel (cw2ai6A_eeM, antika kalem ucu) gözle denetimde ELENDİ: uçtaki
    // "JOHNSON & CO. — NEW YORK" gravürü kadrajdan çıkmıyordu; kaynak fotoğraf zaten 16/10
    // oranına yakın olduğu için kırpma odağını değiştirmek de bir şey kazandırmadı.
    // Bu görsel hem o sorunu taşımıyor hem konusu miras hukukuna daha yakın: tereke ve
    // vasiyetname çağrışımı kalemden çok el yazması belgede.
  },
  {
    dosya: 'buro-kitaplik.webp',
    slug: 'cnRuUMK9EWI',
    genislik: 1600,
    yukseklik: 700,
    konu: 'Koyu ahşap kitaplık, pencereden düşen altın ışık hüzmesi',
  },
]

const zorla = process.argv.includes('--force')

async function indir(slug: string): Promise<Buffer> {
  const yanit = await fetch(UNSPLASH_INDIRME(slug, KAYNAK_GENISLIK), {
    headers: { 'User-Agent': TARAYICI_UA },
  })

  // LİSANS KAPISI — betiğin en önemli kuralı.
  //
  // Ölçüldü: Unsplash+ (ücretli abonelik) içeriği bu uç noktada 403 ve sıfır bayt
  // döndürüyor, ücretsiz içerik 200 ve image/* döndürüyor. Yani indirmesi BAŞARILI olan
  // her görsel tanım gereği Unsplash Lisansı kapsamındadır (ticari kullanım serbest,
  // atıf zorunlu değil). Bu denetim olmasaydı sıfır baytlık bir HTML sharp'a gider ve
  // "geçersiz görsel" gibi anlamsız bir hatayla ölürdü; asıl sorun (lisans) görünmezdi.
  //
  // Durum yutulmuyor, fırlatılıyor: yanlış lisanslı bir görselin sessizce siteye
  // düşmesindense betiğin durması yeğdir.
  if (!yanit.ok) {
    throw new Error(
      `${slug}: Unsplash ${yanit.status} döndürdü. 403 ise bu görsel Unsplash+ (ücretli) ` +
        'demektir ve KULLANILAMAZ — listeden çıkarıp ücretsiz bir görselle değiştirin.',
    )
  }

  const tip = yanit.headers.get('content-type') ?? ''
  if (!tip.startsWith('image/')) {
    throw new Error(`${slug}: beklenen görsel yerine "${tip}" geldi.`)
  }

  return Buffer.from(await yanit.arrayBuffer())
}

async function uret(gorsel: StokGorsel): Promise<void> {
  const hedef = path.join(CIKTI_DIZINI, gorsel.dosya)

  if (existsSync(hedef) && !zorla) {
    // Slug da basılıyor: atlama, listedeki slug değiştirilip `--force` unutulduğunda
    // sessizce YANLIŞ dosyayı korur — diskteki görsel eski slug'dan, docs/gorseller/
    // kaynak-lisans.md ise yenisinden bahseder ve ikisi birbirinden habersiz ayrışır.
    // Beklenen slug'ı ekrana yazmak, çıktıya bakan kişiye bu ayrışmayı görme şansı verir.
    console.log(`[atlandı] ${gorsel.dosya} zaten var — beklenen slug ${gorsel.slug} (--force ile üzerine yazılır)`)
    return
  }

  const ham = await indir(gorsel.slug)

  // ÇÖZÜNÜRLÜK DENETİMİ KAYNAK ÜZERİNDE YAPILIYOR, çıktı üzerinde değil.
  //
  // İlk yazımda kıyas çıktıdaydı (`info.width !== gorsel.genislik`) ve bu ULAŞILAMAZ bir
  // koşuldu: `fit: 'cover'` iki boyut birden verildiğinde sharp hedefi daima tam olarak
  // üretir — gerekirse büyüterek. Yani 800 piksellik bir kaynak sessizce 1600'e şişer,
  // dosya "doğru ölçüde" görünür ve uyarı hiç basılmazdı. Denetim ancak ham dosyanın
  // gerçek ölçüsüne bakarak anlam taşıyor.
  const kaynak = await sharp(ham).metadata()
  if (!kaynak.width || !kaynak.height) {
    throw new Error(`${gorsel.slug}: kaynak görselin ölçüsü okunamadı.`)
  }
  if (kaynak.width < gorsel.genislik || kaynak.height < gorsel.yukseklik) {
    console.warn(
      `  UYARI: ${gorsel.dosya} kaynağı ${kaynak.width}×${kaynak.height}; hedef ` +
        `${gorsel.genislik}×${gorsel.yukseklik} bundan büyük olduğu için görsel BÜYÜTÜLEREK ` +
        'üretiliyor ve netliği düşük olacak. Daha büyük bir kaynak seçin.',
    )
  }

  // fit: 'cover' — hedef oranı korumak için kırpar, sıkıştırmaz.
  const { data, info } = await sharp(ham)
    .rotate()
    .resize(gorsel.genislik, gorsel.yukseklik, { fit: 'cover', position: gorsel.odak ?? 'centre' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true })

  await mkdir(path.dirname(hedef), { recursive: true })
  await writeFile(hedef, data)

  const kb = Math.round(info.size / 1024)
  console.log(`[yazıldı] ${gorsel.dosya} — ${info.width}×${info.height}, ${kb} KB — ${gorsel.konu}`)
}

// Sıralı koşuyor, paralel değil: dokuz eşzamanlı istek Unsplash'in hız sınırına takılıp
// bir kısmını 429 ile geri çevirebilir ve hangi görselin neden düştüğü karışır.
for (const gorsel of GORSELLER) {
  await uret(gorsel)
}

console.log(`\nBitti. Çıktı: ${CIKTI_DIZINI}/`)
