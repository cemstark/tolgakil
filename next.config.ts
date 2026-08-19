import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
