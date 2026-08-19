import { and, asc, count, eq, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, categories, type Category } from '@/db/schema'

export type CategoryListItem = {
  id: number
  slug: string
  name: string
  articleCount: number
}

// Makale sayısı listede gösteriliyor çünkü kategoriler yalnızca boşken silinebiliyor
// (articles.category_id kısıtı ON DELETE RESTRICT). Sayıyı görmeyen kullanıcı silme
// düğmesine basıp neden reddedildiğini anlamazdı.
export async function listCategories(): Promise<CategoryListItem[]> {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      // count(articles.id): count() ham hâliyle COUNT(*) üretir ve leftJoin eşleşmese bile
      // 1 sayardı; sütun verilince NULL satırlar sayılmıyor, yani boş kategori 0 gösteriyor.
      articleCount: count(articles.id),
    })
    .from(categories)
    .leftJoin(articles, eq(articles.categoryId, categories.id))
    .groupBy(categories.id, categories.slug, categories.name)
    .orderBy(asc(categories.name))
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id))
  return row ?? null
}

// exceptId düzenlemede kendi kaydını saymaz (bkz. queries/lawyers.ts).
export async function isSlugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const predicate =
    exceptId === undefined
      ? eq(categories.slug, slug)
      : and(eq(categories.slug, slug), ne(categories.id, exceptId))

  const [row] = await db.select({ id: categories.id }).from(categories).where(predicate).limit(1)
  return row !== undefined
}

export async function deleteCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id))
}
