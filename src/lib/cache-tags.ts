// Önbellek etiketleri tek yerde toplanır: yazma tarafı revalidateTag'i, okuma tarafı
// cacheTag'i aynı dizeden alsın; elle yazılan bir etiket sessizce eşleşmeyi kaçırmasın.
export const TAGS = {
  articles: 'articles',
  lawyers: 'lawyers',
  practiceAreas: 'practice-areas',
  categories: 'categories',
  settings: 'settings',
} as const

// Tek bir makalenin ayrıntı sayfası, liste etiketinden bağımsız geçersizleştirilebilsin.
export function articleTag(slug: string): string {
  return `article:${slug}`
}
