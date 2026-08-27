// Kök `src/app/opengraph-image.tsx`in bu segmente yeniden tanıtılması.
//
// Gerekçe calisma-alanlari/[slug]/opengraph-image.tsx ile birebir aynı: sayfa kendi
// `metadata.openGraph` nesnesini export ettiği anda kökün openGraph'ı tümüyle eziliyor ve
// dosyadan gelen og:image ile twitter:image çıktıdan düşüyor. Bu dosya olmadan sayfa
// paylaşıldığında kart görselsiz kalırdı.
export { default, alt, size, contentType } from '@/app/opengraph-image'
