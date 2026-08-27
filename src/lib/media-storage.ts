import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MEGAPIXELS, MAX_UPLOAD_PIXELS, OVERSIZE_MESSAGE, WEBP_QUALITY } from '@/lib/media-limits'

// Yükleme yolunun TAMAMI bu modülde toplanıyor. Üretimde dizin dağıtım kökünün dışına
// taşınacak (spec §13) ve gerekirse Cloudflare R2'ye geçilecek; o değişikliğin buradan
// dışarı sızmaması için sayfalar, action'lar ve servis rotası dosya sistemine doğrudan
// dokunmuyor, hep bu arayüzü çağırıyor.

const MAX_WIDTH = 1600

// Depolanan biçim daima WebP: tek uzantı, tek Content-Type, tek beyaz liste girdisi.
export const STORED_EXTENSION = '.webp'
export const STORED_CONTENT_TYPE = 'image/webp'

// Girişte kabul edilen biçimler. Liste, arayüzde İLAN EDİLEN dörtle birebir aynı: ilan
// edilmeyen bir ayrıştırıcıyı (avif, tiff, heif) açık tutmak kimsenin kullanmadığı bir
// saldırı yüzeyi bırakırdı. SVG de bilinçli olarak dışarıda: sharp onu rasterleştirebilir,
// ama o yol panelden gelen XML'i librsvg'ye besler. Çıktı WebP olduğu için betik hayatta
// kalmasa da ayrıştırıcıyı hiç çalıştırmamak daha ucuz bir savunma.
const ALLOWED_INPUT_FORMATS: ReadonlySet<string> = new Set(['jpeg', 'png', 'webp', 'gif'])

/**
 * Kullanıcıya gösterilebilir yükleme hatası. Ayrı bir sınıf olmasının nedeni: server action
 * yalnız bunu alan hatasına çevirir, disk dolması gibi beklenmedik hataları yeniden fırlatır.
 * Tek bir `catch` her şeyi Türkçe bir alan hatasına çevirseydi gerçek arıza sessizce
 * "geçersiz görsel" diye görünürdü.
 */
export class MediaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MediaError'
  }
}

export function uploadDir(): string {
  const dir = process.env.UPLOAD_DIR
  if (!dir) throw new Error('UPLOAD_DIR tanımlı değil.')
  // Göreli yol (yerelde ./.uploads) çalışma dizinine göre çözülür; üretimde bu değer
  // dağıtım kökünün DIŞINDA mutlak bir yol olmalıdır.
  return path.resolve(dir)
}

// Yol kullanıcı verisinden türüyor (servis rotası adres çubuğundan okuyor); kök dizinin
// dışına çıkan her istek reddedilir. Ayıraç şart: kök "/veri/yuklemeler" iken
// "/veri/yuklemeler-yedek" yalın startsWith ile "içeride" sayılırdı. Kökün kendisi de
// reddediliyor — o bir dosya değil, dizin.
function resolveWithin(root: string, relative: string): string {
  const hedef = path.resolve(root, relative)
  if (!hedef.startsWith(root + path.sep)) {
    throw new Error('Yol yükleme dizini dışına çıkıyor.')
  }
  return hedef
}

export function resolveUploadPath(relative: string): string {
  return resolveWithin(uploadDir(), relative)
}

export function buildStoredName(_originalName: string, bytes: Buffer): { relative: string; extension: string } {
  // Kullanıcının dosya adı hiç kullanılmıyor: hem yol enjeksiyonunu hem Türkçe karakter
  // sorunlarını kökten keser. İçerik özeti aynı zamanda değişmez önbelleklemeyi güvenli kılar.
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const now = new Date()
  const yil = String(now.getUTCFullYear())
  const ay = String(now.getUTCMonth() + 1).padStart(2, '0')
  return { relative: `${yil}/${ay}/${hash}${STORED_EXTENSION}`, extension: STORED_EXTENSION }
}

export type StoredImage = {
  relative: string
  width: number
  height: number
  sizeBytes: number
}

/**
 * Görseli doğrular, EXIF yönünü uygular, en fazla 1600 piksele indirir ve WebP olarak
 * `dir` altına yazar. Geçersiz girdide Türkçe mesajlı `MediaError` fırlatır; çağıran
 * yalnız o sınıfı alan hatasına çevirir.
 */
export async function storeImage(file: File, dir: string): Promise<StoredImage> {
  if (file.size === 0) throw new MediaError('Yüklenecek bir dosya seçin.')
  if (file.size > MAX_UPLOAD_BYTES) throw new MediaError(OVERSIZE_MESSAGE)

  const bytes = Buffer.from(await file.arrayBuffer())
  // Uzunluk ikinci kez ölçülüyor: File.size ayrıştırılmış gövdeden geliyor, ama sınırı
  // gerçek bayt sayısına bağlamak beyana bağlamaktan ucuz ve kesin.
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new MediaError(OVERSIZE_MESSAGE)

  const { format, width, height } = await readMetadata(bytes)
  if (!ALLOWED_INPUT_FORMATS.has(format)) {
    throw new MediaError('Bu görsel biçimi desteklenmiyor; JPEG, PNG, WebP veya GIF yükleyin.')
  }

  // Denetim ÇÖZMEDEN önce: metadata yalnız başlığı okuyor, piksel arabelleği daha
  // ayrılmadı. Sınır burada dönmezse 64 MP'lik 202 KB'lik bir dosya süreci düşürebilir.
  if (width * height > MAX_UPLOAD_PIXELS) {
    throw new MediaError(
      `Görselin çözünürlüğü çok yüksek: ${width}×${height} piksel. En fazla ${MAX_UPLOAD_MEGAPIXELS} megapiksel yükleyebilirsiniz.`,
    )
  }

  const donusturulen = await toWebp(bytes)

  const { relative } = buildStoredName(file.name, bytes)
  const hedef = resolveWithin(path.resolve(dir), relative)
  await mkdir(path.dirname(hedef), { recursive: true })
  await writeFile(hedef, donusturulen.data)

  return {
    relative,
    width: donusturulen.info.width,
    height: donusturulen.info.height,
    sizeBytes: donusturulen.info.size,
  }
}

// Dönüştürme ayrı bir fonksiyonda: try bloğu yalnız sharp'ı sarmalıyor, diske yazma
// DIŞARIDA kalıyor. Aynı try'ın içinde olsaydı disk dolması da "geçersiz görsel" diye
// görünür ve gerçek arıza gizlenirdi.
async function toWebp(bytes: Buffer): Promise<{ data: Buffer; info: { width: number; height: number; size: number } }> {
  try {
    // limitInputPixels ikinci savunma: başlıktaki ölçü ile gerçek çözülen ölçü ayrışırsa
    // (bozuk ya da kasıtlı hazırlanmış dosya) çözme burada durur. sharp'ın kendi
    // varsayılanı ~268 MP, yani bizim tavanımızın çok üstünde ve tek başına yetmiyor.
    return await sharp(bytes, { limitInputPixels: MAX_UPLOAD_PIXELS })
      // Telefon fotoğraflarının çoğu dik değil, EXIF etiketiyle döndürülmüş kaydediliyor.
      .rotate()
      // Animasyonlu GIF'in yalnız ilk karesi alınıyor (sharp'ın varsayılanı; `animated`
      // verilmiyor). Bilinçli: hareketli çıktı hem piksel sınırını kare sayısıyla çarpar
      // hem tek bir WebP boyutu/ölçüsü ile temsil edilemez. Arayüz ipucu bunu söylüyor.
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true })
  } catch (cause) {
    // Başlığı okunabilen ama gövdesi bozuk dosya buraya düşer. Hata yutulmuyor; Türkçeye
    // çevrilip nedeni `cause` ile taşınarak yeniden fırlatılıyor.
    throw new MediaError('Yüklenen dosya geçerli bir görsel değil.', { cause })
  }
}

// İstemcinin bildirdiği MIME tipine (file.type) GÜVENİLMEZ: bir .exe'ye "image/png"
// yazmak tek satırlık iş. Biçim ve ölçü dosyanın gerçek içeriğinden okunuyor. metadata()
// yalnız başlığı ayrıştırıyor, piksel arabelleği ayırmıyor — piksel sınırının çözmeden
// önce uygulanabilmesi bu yüzden mümkün.
async function readMetadata(bytes: Buffer): Promise<{ format: string; width: number; height: number }> {
  try {
    const metadata = await sharp(bytes).metadata()
    // Ölçüsü okunamayan dosya sıfır piksel sayılıp sınırdan kaçmasın: eksik değer
    // "geçersiz görsel" demek.
    if (!metadata.width || !metadata.height) {
      throw new MediaError('Yüklenen dosya geçerli bir görsel değil.')
    }
    return { format: metadata.format ?? '', width: metadata.width, height: metadata.height }
  } catch (cause) {
    if (cause instanceof MediaError) throw cause
    throw new MediaError('Yüklenen dosya geçerli bir görsel değil.', { cause })
  }
}
