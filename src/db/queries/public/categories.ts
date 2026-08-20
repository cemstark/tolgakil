import { and, asc, count, eq, isNotNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, categories } from '@/db/schema'

export type PublicCategory = {
  slug: string
  name: string
  description: string | null
  articleCount: number
}

// Yüklem articles/public/articles.ts ile aynı üç koşul. İkinci kez yazılmasının tek nedeni
// modüller arası bağımlılık kurmamak; koşullardan biri değişirse İKİSİ birlikte değişir.
// (Tek dosyaya taşımak da mümkün ama o dosya iki tarafın da import ettiği üçüncü bir modül
// olurdu ve kazancı yok — koşul üç satır.)
const publishedArticleJoin = and(
  eq(articles.categoryId, categories.id),
  eq(articles.status, 'published'),
  isNotNull(articles.publishedAt),
  lte(articles.publishedAt, sql`NOW()`),
)

const categoryColumns = {
  slug: categories.slug,
  name: categories.name,
  description: categories.description,
  // count(articles.id): ham count() COUNT(*) üretir ve eşleşme olmasa bile 1 sayardı.
  articleCount: count(articles.id),
}

const categoryGrouping = [categories.id, categories.slug, categories.name, categories.description]

/**
 * articleCount = 0 olan kategoriler listede GÖSTERİLMEZ (boş arşiv sayfası üretmesin).
 *
 * Bunu sağlayan innerJoin: yayımlanmışlık koşulu ON içinde, dolayısıyla yalnız taslağı olan
 * kategori hiç eşleşmiyor ve satır düşüyor. HAVING ile de yazılabilirdi; join daha ucuz.
 */
export async function listPublicCategories(): Promise<PublicCategory[]> {
  return db
    .select(categoryColumns)
    .from(categories)
    .innerJoin(articles, publishedArticleJoin)
    .groupBy(...categoryGrouping)
    .orderBy(asc(categories.name))
}

/**
 * Kategori arşiv sayfası için; makalesi olmayan kategoride articleCount 0 döner (null DEĞİL).
 * Böyle bir adrese listeden bağlantı verilmiyor ama elle yazılabilir; sayfa "bu kategoride
 * henüz makale yok" diyebilmeli, 404 vermek zorunda kalmamalı — karar Görev 4'ün.
 */
export async function getPublicCategoryBySlug(slug: string): Promise<PublicCategory | null> {
  const [row] = await db
    .select(categoryColumns)
    .from(categories)
    // leftJoin: burada eşleşme yokluğu satırı düşürmemeli, yalnız sayıyı 0 yapmalı.
    .leftJoin(articles, publishedArticleJoin)
    .where(eq(categories.slug, slug))
    .groupBy(...categoryGrouping)

  return row ?? null
}
