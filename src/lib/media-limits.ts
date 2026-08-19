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
