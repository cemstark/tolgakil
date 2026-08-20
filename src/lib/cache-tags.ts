// Önbellek etiketleri tek yerde toplanır: yazma tarafı updateTag'i, okuma tarafı
// cacheTag'i aynı dizeden alsın; elle yazılan bir etiket sessizce eşleşmeyi kaçırmasın.
//
// YAZMA TARAFI HANGİ ÇAĞRIYI KULLANIR — Görev 4'te ÖLÇÜLDÜ:
// Panel server action'ları `updateTag(tag)` çağırır, `revalidateTag(tag, 'max')` DEĞİL.
// İkincisi tanım gereği stale-while-revalidate: etiketi bayat işaretler, o etiketi taşıyan
// sayfaya yapılan İLK ziyarete hâlâ eski HTML'i sunar ve tazelemeyi arka planda yapar.
// Üretim derlemesinde ölçüldü — panelden makale yayımlayıp ana sayfaya giden e2e testi
// makaleyi göremedi; yalnız çağrı updateTag'e çevrilince geçti. Next 16.3 belgeleri de
// server action'lardaki "read-your-own-writes" durumu için updateTag'i işaret ediyor.
// Editör yayımladıktan sonra siteye bakınca kendi yazısını GÖRMELİ; aksi hâlde yayımın
// çalışmadığını sanar. Bedeli, tazelemeden sonraki ilk isteğin bloklanması — günde birkaç
// içerik güncellemesi olan bir büro sitesinde ihmal edilebilir.
// updateTag YALNIZ server action içinde çağrılabilir; route handler'da revalidateTag şart.
export const TAGS = {
  articles: 'articles',
  lawyers: 'lawyers',
  practiceAreas: 'practice-areas',
  categories: 'categories',
  settings: 'settings',
  // Sabit satırlı `pages` tablosu (Görev 2): hakkımızda, KVKK ve çerez politikası metinleri.
  pages: 'pages',
} as const

// Tek bir makalenin ayrıntı sayfası, liste etiketinden bağımsız geçersizleştirilebilsin.
export function articleTag(slug: string): string {
  return `article:${slug}`
}

// Ön ek `page:` — `article:` ile çakışmaması şart: iki tür de slug taşıyor ve bir hukuk
// bürosunda "kvkk" hem bir makale hem bir sayfa adresi olabilir.
export function pageTag(slug: string): string {
  return `page:${slug}`
}
