import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, categories, lawyers, practiceAreas, type Article, type ArticleStatus } from '@/db/schema'

export type ArticleListItem = {
  id: number
  slug: string
  title: string
  status: ArticleStatus
  publishedAt: Date | null
  updatedAt: Date
  categoryName: string | null
}

/** Form seçicilerinin ortak biçimi; etiket kullanıcıya görünen addır. */
export type SelectOption = { id: number; label: string }

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün,
// panel sessizce boş liste göstermesin.
export async function listArticles(): Promise<ArticleListItem[]> {
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      status: articles.status,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      categoryName: categories.name,
    })
    .from(articles)
    // leftJoin: kategorisi olmayan taslak da listede görünmek zorunda.
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .orderBy(desc(articles.updatedAt))
}

export async function getArticleById(id: number): Promise<Article | null> {
  const [row] = await db.select().from(articles).where(eq(articles.id, id))
  return row ?? null
}

// exceptId düzenlemede kendi kaydını saymaz; aksi hâlde makale kendi adresiyle çakışır
// ve slug'a dokunmayan her güncelleme reddedilirdi.
export async function isSlugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const predicate =
    exceptId === undefined
      ? eq(articles.slug, slug)
      : and(eq(articles.slug, slug), ne(articles.id, exceptId))

  const [row] = await db.select({ id: articles.id }).from(articles).where(predicate).limit(1)
  return row !== undefined
}

export async function listCategoryOptions(): Promise<SelectOption[]> {
  return db.select({ id: categories.id, label: categories.name }).from(categories).orderBy(asc(categories.name))
}

// Yazar alanı articleSchema'nın parçası; kadro yönetimi Görev 7'de gelse de seçici bugün
// çizilmek zorunda, aksi hâlde form şemanın beklediği alanı hiç göndermez.
export async function listAuthorOptions(): Promise<SelectOption[]> {
  return db.select({ id: lawyers.id, label: lawyers.fullName }).from(lawyers).orderBy(asc(lawyers.fullName))
}

/** Makale formundaki "Çalışma alanı" seçicisi; yayımlanmamış alanlar da listeleniyor
    çünkü yazı, alan yayına alınmadan önce hazırlanabiliyor. */
export async function listPracticeAreaOptions(): Promise<SelectOption[]> {
  return db
    .select({ id: practiceAreas.id, label: practiceAreas.name })
    .from(practiceAreas)
    .orderBy(asc(practiceAreas.sortOrder), asc(practiceAreas.name))
}
