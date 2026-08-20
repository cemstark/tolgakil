import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next 16'da kararlı ve KÖK seviyede (experimental altında değil). 'use cache' yönergesi
  // yalnız bu bayrak açıkken çalışıyor; Plan 2'de yazılmış revalidateTag(tag, 'max')
  // çağrıları da ancak okuma tarafı cacheTag ile bağlandığında bir işe yarıyor.
  //
  // Segment export'ları `dynamic`, `dynamicParams`, `revalidate`, `fetchCache` v16.0.0'da
  // kaldırıldı: süre gerekiyorsa cacheLife() ile verilir.
  //
  // ÖLÇÜLMÜŞ İKİ YAN ETKİ:
  // 1) Panel statik kabuk denetiminden `instant = false` ile muaf (src/app/panel/layout.tsx).
  // 2) Üretimde her dinamik rota önce statik kabuğu yayımladığı için, bir <Suspense> sınırının
  //    İÇİNDE çağrılan notFound() durum kodunu değiştiremiyor (soft 404). Halka açık ayrıntı
  //    sayfalarında varlık denetimi sayfa gövdesinde, Suspense'in DIŞINDA kalmalı.
  cacheComponents: true,
  images: { formats: ['image/avif', 'image/webp'] },
  // argon2 ve sharp yerel (native) ikili taşır; sunucu paketine gömülemez.
  serverExternalPackages: ['argon2', 'sharp'],
  experimental: {
    // Ölçüldü (Görev 6): varsayılan 1 MB. Sınır aşılınca Next 413 fırlatıyor ve istek
    // server action gövdesine HİÇ ulaşmıyor; kullanıcı alan hatası değil panelin
    // "Bir hata oluştu" sayfasını görüyor, ne olduğunu anlamıyor.
    //
    // Uygulamanın kendi sınırı 8 MB (media-limits.ts) ve reddi Türkçe alan hatasıyla
    // yapıyor. Buradaki değer ondan yalnız 1 MB büyük: 8 MB'a kadar olan her dosya
    // uygulamanın koduna ulaşıp anlaşılır bir yanıt alıyor, çerçevenin sert tavanı ise
    // gereksiz yere yükseltilmiş olmuyor (aradaki fark çok parçalı gövde başlıklarına
    // fazlasıyla yetiyor).
    serverActions: { bodySizeLimit: '9mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // Kaynak '/:path*', yani başlık BÜTÜN yollara iniyor ve tarayıcı bu izinleri
            // sayfanın GÖMÜLÜ ÇERÇEVELERİNE de kapatıyor. Plan 3'ün harita rıza sarıcısı
            // buna takılacak: iframe içindeki "konumumu göster" düğmesi sessizce
            // çalışmayacak, konsola bir ihlal düşecek ama kullanıcı yalnız tepkisiz bir
            // düğme görecek. Düzeltmek gerektiğinde doğru biçim izni tümüyle açmak değil,
            // yalnız harita kaynağına vermektir: geolocation=("https://<harita-alan-adi>").
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
