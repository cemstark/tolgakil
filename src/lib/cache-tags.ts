// Önbellek etiketleri tek yerde toplanır: yazma tarafı revalidateTag'i, okuma tarafı
// cacheTag'i aynı dizeden alsın; elle yazılan bir etiket sessizce eşleşmeyi kaçırmasın.
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
