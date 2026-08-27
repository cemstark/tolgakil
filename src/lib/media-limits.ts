// Yükleme sınırı hem sunucuda (media-storage.ts) hem istemcide (MediaUploadForm) gerekiyor.
// Ayrı bir modülde duruyor çünkü media-storage sharp'ı import ediyor ve o paket istemci
// paketine giremez; sabiti orada bıraksaydık ya iki kez yazılırdı ya sharp tarayıcıya sızardı.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024)

// Aynı metin iki yerde de gösteriliyor: istemci dosya seçildiği anda, sunucu gönderim
// sonrasında. Kullanıcı ikisinde farklı cümle görmemeli.
export const OVERSIZE_MESSAGE = `Görsel çok büyük: en fazla ${MAX_UPLOAD_MB} MB yükleyebilirsiniz.`

// Piksel sınırı bayt sınırından BAĞIMSIZ olmak zorunda: ölçüldü, 8000×8000 (64 MP) düz bir
// PNG yalnız 202 KB tutuyor — bayt sınırı böyle bir dosyayı hiç görmez, ama çözülmüş hâli
// yüzlerce MB ham arabellek demek ve paylaşımlı barındırmada süreci OOM ile düşürür.
// 50 MP, 8000×6000'lik (48 MP) bir tam kare fotoğrafın üstünde: gerçek işi engellemiyor.
// İstemci yalnız SAYIYI gösteriyor (ipucu metni); denetim sunucuda.
export const MAX_UPLOAD_MEGAPIXELS = 50
export const MAX_UPLOAD_PIXELS = MAX_UPLOAD_MEGAPIXELS * 1_000_000

// WebP çıktı kalitesi. media-storage.ts'ten buraya alındı çünkü ikinci bir çağıran çıktı:
// scripts/fetch-stock-images.mts halka açık sayfaların stok görsellerini üretiyor. İki ayrı
// yerde iki ayrı sayı yazmak yerine tek sabit okunuyor.
//
// NE SAĞLADIĞI KONUSUNDA YANILMAYIN: bu değer yalnız DİSKE YAZILAN ara dosyanın kalitesi.
// Tarayıcıya giden bayt o dosya değil; `public/gorsel/*` ve panel yüklemeleri istemciye
// Next'in görsel iyileştiricisinden `/_next/image?...&q=75` ile yeniden kodlanarak
// ulaşıyor (srcSet çıktısında ölçüldü). Yani buradaki 82, son görüntünün sıkıştırma
// dokusunu belirlemiyor; ara dosyanın kaynak kalitesini yeterince yüksek tutup ikinci
// kodlamada bozulma bırakmamasını sağlıyor.
//
// Bu modülde durabilmesinin sebebi yön: burada hiç `import` satırı yok, sharp'ı import eden
// media-storage.ts BUNU okuyor, tersi değil. Bundler oku takip ettiği için istemci paketine
// (MediaUploadForm → media-limits) sharp uğramıyor.
export const WEBP_QUALITY = 82
