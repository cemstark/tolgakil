// Kök `src/app/opengraph-image.tsx`in bu segmente yeniden tanıtılması.
//
// NEDEN GEREKLİ: dosya tabanlı paylaşım görseli normalde alt rotalara kendiliğinden
// iniyor, AMA sayfa kendi `metadata.openGraph` nesnesini export ettiği anda kökün
// openGraph'ı tümüyle eziliyor ve dosyadan gelen og:image ile twitter:image kayboluyor.
// Ölçüldü: [slug]/page.tsx'e sayfaya özgü og:title eklendiğinde og:image ve twitter:image
// çıktıdan tümüyle düştü — başlığı düzeltirken paylaşım görselini yok ediyorduk.
//
// Görselin URL'sini metadata içinde ELLE yazmak çözüm değil: Next adrese içerik hash'i
// ekliyor (`/opengraph-image?15cb7c3ef6b206eb`) ve hash'siz adres yanıt vermiyor — denendi,
// boş yanıt döndü. Doğru yol adresi tahmin etmek değil, dosyayı segmentin kendisine
// tanıtmak; Next hash'i yine kendisi üretiyor.
//
// Yeniden dışa aktarım, görselin İKİ AYRI yerde çizilmemesi için: tasarım tek yerde
// (kök dosyada) duruyor, burası yalnız Next'in dosya bulma kuralını karşılıyor.
export { default, alt, size, contentType } from '@/app/opengraph-image'

// generateStaticParams ZORUNLU — yokluğunda bu rota BOZULUYOR, sessizce.
//
// ÖLÇÜLDÜ: yalnız yukarıdaki yeniden dışa aktarımla, adres hem üretim hem geliştirme
// sunucusunda boş yanıt (curl 52) döndürüyordu ve sunucu günlüğüne
// `Error: failed to pipe response … [cause]: Input buffer contains unsupported image format`
// düşüyordu. Yani yedi çalışma alanı sayfasının og:image etiketi ölü bir adresi
// gösteriyordu — re-export'un varlık sebebi olan görsel yine yoktu.
//
// SEBEP: metadata görseli kendi başına bir rota ve `[slug]` dinamik. Parametre listesi
// verilmediğinde görsel derleme anında üretilemiyor, istek anında üretilmeye çalışılıyor
// ve `ImageResponse`ın PNG'ye çevirme adımı bu ortamda çalışmıyor. Aynı arıza kök
// `/opengraph-image` adresinde de GELİŞTİRME sunucusunda görülüyor; üretimde görünmemesinin
// tek sebebi o rotanın derleme anında bir kez çizilip diske yazılması. Listeyi vermek bu
// rotayı da o güvenli yola sokuyor: yedi PNG derlemede üretiliyor, çalışma zamanında
// hiç çizim yapılmıyor.
//
// Liste sayfanın kendi `generateStaticParams`'ından geliyor — ikinci bir veritabanı
// sorgusu yazmak, sayfa ile görselin farklı slug kümeleri üretmesi riskini açardı.
export { generateStaticParams } from './page'
