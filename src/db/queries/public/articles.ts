import { and, asc, count, desc, eq, isNotNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, categories, lawyers, media, practiceAreas } from '@/db/schema'

export type PublicArticleCard = {
  slug: string
  title: string
  excerpt: string
  publishedAt: Date
  categoryName: string | null
  categorySlug: string | null
  coverPath: string | null
  coverAlt: string | null
}

export type PublicArticleDetail = {
  slug: string
  title: string
  excerpt: string
  content: string
  publishedAt: Date
  updatedAt: Date
  metaTitle: string | null
  metaDescription: string | null
  categoryName: string | null
  categorySlug: string | null
  practiceAreaName: string | null
  practiceAreaSlug: string | null
  authorName: string | null
  authorSlug: string | null
  coverPath: string | null
  coverAlt: string | null
}

export type ArticlePage = {
  items: PublicArticleCard[]
  total: number
  page: number
  pageCount: number
}

export type ArticleQuery = {
  q?: string
  categorySlug?: string
  page?: number
}

export const ARTICLES_PER_PAGE = 9

/**
 * Yayımlanmışlık yüklemi — TEK TANIM.
 *
 * Üç koşul birlikte gerekiyor: `status` yayına alınmış, tarih atanmış ve tarih geçmiş
 * olmalı. İkinci koşul olmadan tarihi boş bir satır sıralamada belirsiz yere düşer;
 * üçüncüsü olmadan ileri tarihli yayın hemen görünür.
 *
 * NOW() güvenli: havuzdaki her bağlantı SET time_zone = '+00:00' alıyor (db/client.ts),
 * yani sunucu dilimi ne olursa olsun karşılaştırma UTC'de yapılıyor.
 *
 * `and(...)` `SQL | undefined` döndürüyor; hem `.where()` hem iç içe `and()` bu tipi kabul
 * ettiği için cast gerekmiyor. Nesne değişmez, yeniden kullanılabilir.
 */
const publishedPredicate = and(
  eq(articles.status, 'published'),
  isNotNull(articles.publishedAt),
  lte(articles.publishedAt, sql`NOW()`),
)

// Kart ve ayrıntı sorgularının ortak gövdesi; kapak görseli media'dan geliyor.
const cardColumns = {
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  publishedAt: articles.publishedAt,
  categoryName: categories.name,
  categorySlug: categories.slug,
  // HAM göreli yol (2026/08/<özet>.webp). Adrese çeviren mediaUrl() bileşen tarafında:
  // sorgu katmanı sunum biçimi üretmemeli.
  coverPath: media.path,
  coverAlt: media.altText,
}

/**
 * Yüklem NULL'ları eliyor ama tip sistemi bunu bilemez.
 *
 * Sessiz bir cast yerine gerçek denetim: yüklem ileride bozulursa hata burada gürültüyle
 * çıksın, `undefined.toISOString()` olarak sayfanın ortasında değil.
 */
function requirePublishedAt(row: { slug: string; publishedAt: Date | null }): Date {
  if (row.publishedAt === null) {
    throw new Error(`Yayımlanmış sayılan "${row.slug}" makalesinin published_at değeri boş.`)
  }
  return row.publishedAt
}

function toCard(row: { publishedAt: Date | null } & Omit<PublicArticleCard, 'publishedAt'>): PublicArticleCard {
  return { ...row, publishedAt: requirePublishedAt(row) }
}

// MariaDB BOOLEAN MODE operatörleri. Temizlenmezse kullanıcının kutuya yazdığı bir ")"
// sorguyu sözdizimi hatasıyla düşürür ve arama sayfası hata sınırına gider.
const BOOLEAN_MODE_OPERATORS = /[+\-><()~*"@]/g

/**
 * Kullanıcı girdisini BOOLEAN MODE'a güvenli hâle getirir.
 *
 * Operatörler ATILIYOR, kaçırılmıyor: kaçırma yolu MariaDB'de güvenilir değil ve avukatın
 * müvekkiline sunduğu arama kutusunda "+" ile öncelik vermek gibi bir gereksinim yok.
 * Değerin kendisi sorguya PARAMETRE olarak gidiyor (dizeye gömülmüyor); bu temizlik
 * enjeksiyona karşı değil, SÖZDİZİMİ hatasına karşı.
 *
 * Bilinen sınır: innodb_ft_min_token_size = 3, yani "iş" gibi iki harfli terimler
 * indekste yok ve sonuç döndürmez. Bu sunucu ayarıdır, sorgu düzeltemez.
 */
export function toBooleanModeTerm(raw: string): string {
  return raw.replace(BOOLEAN_MODE_OPERATORS, ' ').replace(/\s+/g, ' ').trim()
}

// MATCH sütun listesi FULLTEXT indeksinin sütun listesiyle BİREBİR aynı olmak zorunda
// (Görev 2: title, excerpt, search_text); farklı olsaydı MariaDB indeksi kullanamaz ve
// "Can't find FULLTEXT index matching the column list" derdi.
function matchExpression(term: string) {
  return sql`MATCH (${articles.title}, ${articles.excerpt}, ${articles.searchText}) AGAINST (${term} IN BOOLEAN MODE)`
}

// ?sayfa= adres çubuğundan geliyor: 0, -3, 1.5 ve NaN hepsi mümkün. Hata değil, ilk sayfa.
function normalizePage(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value) || value < 1) return 1
  return value
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran sunucu bileşeni error.tsx sınırına
// düşsün, sayfa sessizce "makale yok" göstermesin (spec §11).
export async function listPublishedArticles(query: ArticleQuery): Promise<ArticlePage> {
  const filters = [publishedPredicate]

  const term = query.q === undefined ? '' : toBooleanModeTerm(query.q)
  if (term !== '') filters.push(matchExpression(term))
  if (query.categorySlug !== undefined && query.categorySlug !== '') {
    filters.push(eq(categories.slug, query.categorySlug))
  }
  const where = and(...filters)

  // Toplam ayrı sorgu: LIMIT'li sorgudan sayfa sayısı çıkarılamaz. media join'i burada YOK,
  // sayıma katkısı olmadığı için gereksiz.
  const [toplam] = await db
    .select({ total: count() })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(where)

  const total = toplam.total
  const pageCount = Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE))
  // Elle yazılmış ?sayfa=99 boş bir liste değil, son sayfayı göstermeli.
  const page = Math.min(normalizePage(query.page), pageCount)

  const rows = await db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(where)
    // İkincil anahtar slug: aynı saniyede yayımlanan iki makalenin sırası sayfalar arasında
    // değişirse bir kayıt iki sayfada birden çıkar ya da hiç çıkmaz.
    .orderBy(desc(articles.publishedAt), asc(articles.slug))
    .limit(ARTICLES_PER_PAGE)
    .offset((page - 1) * ARTICLES_PER_PAGE)

  return { items: rows.map(toCard), total, page, pageCount }
}

/** Yayımlanmamış makale için null döner — taslak adresi 404 olmalıdır. */
export async function getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      content: articles.content,
      updatedAt: articles.updatedAt,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
      practiceAreaName: practiceAreas.name,
      practiceAreaSlug: practiceAreas.slug,
      authorName: lawyers.fullName,
      authorSlug: lawyers.slug,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    // leftJoin: alan bağı isteğe bağlı; bağlanmamış yazı da yayımlanabiliyor.
    .leftJoin(practiceAreas, eq(articles.practiceAreaId, practiceAreas.id))
    // leftJoin: yazarı atanmamış makale de yayımlanabiliyor (schema'da author_id nullable).
    .leftJoin(lawyers, eq(articles.authorId, lawyers.id))
    .where(and(publishedPredicate, eq(articles.slug, slug)))

  if (row === undefined) return null
  return { ...row, publishedAt: requirePublishedAt(row) }
}

/** Ana sayfa şeridi. */
export async function listLatestArticles(limit: number): Promise<PublicArticleCard[]> {
  // Çağıranın hatası sessizce "makale yok" olarak görünmemeli.
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`listLatestArticles pozitif tam sayı bekliyor; gelen: ${limit}`)
  }

  const rows = await db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(publishedPredicate)
    .orderBy(desc(articles.publishedAt), asc(articles.slug))
    .limit(limit)

  return rows.map(toCard)
}

/**
 * sitemap ve RSS için; tüm yayımlanmış makaleler, en yeni önce.
 *
 * LIMIT bilinçli olarak YOK: eksik bir sitemap sessizce arama motoruna yanlış bilgi verir ve
 * bu, listenin uzamasından daha pahalıdır. Bir büronun makale sayısı üç haneli mertebede
 * kalıyor; bu varsayım bozulursa besleme sayfalanmalıdır.
 */
export async function listArticleFeedEntries(): Promise<PublicArticleCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(publishedPredicate)
    .orderBy(desc(articles.publishedAt), asc(articles.slug))

  return rows.map(toCard)
}

/**
 * Bir çalışma alanına bağlı yayımlanmış yazılar — alan ayrıntı sayfasının "Bu alandaki
 * yazılar" bloğu.
 *
 * Alan SLUG ile alınıyor, id ile değil: çağıran sayfa zaten slug ile çalışıyor ve id'yi
 * ayrıca okumak ikinci bir sorgu demekti.
 *
 * `limit` çağıranın kararı: yan kolonda üç-dört satır gösteriliyor, sayfanın tamamını
 * listelemek oranın işi değil.
 */
export async function listArticlesByPracticeArea(
  practiceAreaSlug: string,
  limit: number,
): Promise<PublicArticleCard[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`listArticlesByPracticeArea: limit pozitif tam sayı olmalı, gelen: ${limit}`)
  }

  const rows = await db
    .select(cardColumns)
    .from(articles)
    // innerJoin: alanı olmayan yazı bu listeye zaten girmemeli.
    .innerJoin(practiceAreas, eq(articles.practiceAreaId, practiceAreas.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(and(publishedPredicate, eq(practiceAreas.slug, practiceAreaSlug)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)

  // toCard: published_at'ın dolu olduğu yüklemle garanti, ama tip düzeyinde nullable —
  // boş bir değer sayfanın ortasında değil burada, anlaşılır bir hatayla çıksın.
  return rows.map(toCard)
}
