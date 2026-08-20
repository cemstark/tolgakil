import {
  boolean, date, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar,
} from 'drizzle-orm/mysql-core'

export type UserRole = 'admin' | 'editor'
export type ArticleStatus = 'draft' | 'published'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  // Giriş kimliği e-posta DEĞİL kullanıcı adı: bu sütuna hiçbir zaman posta gönderilmedi,
  // yalnız kimlik olarak okundu. Biçim (3-60 karakter, yalnız a-z 0-9 . _ -) ve ASCII
  // kısıtının gerekçesi src/lib/validation.ts içindeki USERNAME_PATTERN notunda.
  // Sütun genişliği 190'da bırakıldı: migration RENAME ile yürüdü, daraltmak üretimdeki
  // e-posta biçimli eski değerleri kesip veri kaybettirirdi.
  username: varchar('username', { length: 190 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'editor']).notNull().default('editor'),
  name: varchar('name', { length: 120 }).notNull(),
  // Kullanıcı silinmez, pasifleştirilir: yazdığı makalelerin izi ve last_login_at kaydı
  // kaybolmasın. Pasif kullanıcı giriş yapamaz (Görev 3).
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
})

export const media = mysqlTable('media', {
  id: int('id').autoincrement().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  path: varchar('path', { length: 255 }).notNull().unique(),
  altText: varchar('alt_text', { length: 255 }).notNull(),
  width: int('width').notNull(),
  height: int('height').notNull(),
  sizeBytes: int('size_bytes').notNull(),
  uploadedBy: int('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const lawyers = mysqlTable('lawyers', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  barAssociation: varchar('bar_association', { length: 120 }),
  barRegistryNo: varchar('bar_registry_no', { length: 40 }),
  tbbRegistryNo: varchar('tbb_registry_no', { length: 40 }),
  // mode: 'string' ÖLÇÜMLE seçildi (Görev 7). Varsayılan 'date' kipinde sürücü
  // '2010-03-15' değerini UTC gece yarısına oturan bir Date'e çeviriyor; TZ=America/New_York
  // altında o nesnenin getDate()'i 14 döndürüyor, yani yerel saat yöntemlerini kullanan
  // her okuma bir gün geriye kayıyor. Sütun saat taşımıyor; dize olarak okunup yazıldığında
  // <input type="date"> ile birebir aynı biçimde dolaşıyor ve kayma yolu tümüyle kapanıyor.
  // SQL tipi değişmedi (`date`), drizzle anlık görüntüsü kipi kaydetmiyor: migration yok.
  practiceStartDate: date('practice_start_date', { mode: 'string' }),
  university: varchar('university', { length: 160 }),
  // Diller virgülle ayrılmış düz metin: MariaDB'de JSON tipi LONGTEXT takma adı olduğu ve
  // 10.11'e taşınabilirliği tartışmalı olduğu için kullanılmadı.
  languages: varchar('languages', { length: 255 }),
  email: varchar('email', { length: 190 }),
  photoMediaId: int('photo_media_id').references(() => media.id, { onDelete: 'set null' }),
  bio: text('bio'),
  sortOrder: int('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
})

export const practiceAreas = mysqlTable('practice_areas', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  summary: varchar('summary', { length: 400 }).notNull(),
  content: text('content'),
  sortOrder: int('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
})

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  description: varchar('description', { length: 400 }),
})

export const articles = mysqlTable(
  'articles',
  {
    id: int('id').autoincrement().primaryKey(),
    slug: varchar('slug', { length: 190 }).notNull().unique(),
    title: varchar('title', { length: 220 }).notNull(),
    excerpt: varchar('excerpt', { length: 400 }).notNull(),
    content: text('content').notNull(),
    // FULLTEXT indeksi content'i kapsıyordu ve o sütun HTML tutuyor: "<strong>" araması
    // makale getiriyor, etiket adları terim olarak indeksleniyordu (Plan 2 borcu). Bu sütun
    // aynı metnin düz hâlini tutuyor ve indeks artık content yerine bunu kapsıyor.
    // Nullable: geri doldurma script'i koşmadan önceki satırlar NULL kalır ve NULL bir
    // FULLTEXT sütunu boş dize gibi davranır — o satır aramada çıkmaz, hata da vermez.
    searchText: text('search_text'),
    coverMediaId: int('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    // Yazarı veya kategorisi olan makale sessizce sahipsiz kalmasın: silme reddedilir.
    authorId: int('author_id').references(() => lawyers.id, { onDelete: 'restrict' }),
    categoryId: int('category_id').references(() => categories.id, { onDelete: 'restrict' }),
    status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    metaTitle: varchar('meta_title', { length: 220 }),
    metaDescription: varchar('meta_description', { length: 400 }),
  },
  (table) => [
    index('articles_status_published_at_idx').on(table.status, table.publishedAt),
    index('articles_category_id_idx').on(table.categoryId),
  ],
)

export const messages = mysqlTable(
  'messages',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 190 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    subject: varchar('subject', { length: 220 }).notNull(),
    body: text('body').notNull(),
    kvkkAcceptedAt: timestamp('kvkk_accepted_at'),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 255 }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('messages_created_at_idx').on(table.createdAt)],
)

// Tek satırlık ayar tablosu; uygulama daima id = 1 satırını okur/yazar (SETTINGS_ID).
export const settings = mysqlTable('settings', {
  id: int('id').primaryKey(),
  officeName: varchar('office_name', { length: 160 }).notNull(),
  address: varchar('address', { length: 400 }).notNull(),
  phone: varchar('phone', { length: 40 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 40 }),
  email: varchar('email', { length: 190 }).notNull(),
  kep: varchar('kep', { length: 190 }),
  mapLat: varchar('map_lat', { length: 32 }),
  mapLng: varchar('map_lng', { length: 32 }),
  socialLinks: varchar('social_links', { length: 500 }),
  footerText: varchar('footer_text', { length: 500 }),
})

// Sabit satırlı sayfa metinleri: spec §4 /hakkimizda, /kvkk ve /cerez-politikasi sayfalarını
// istiyor ama spec §5 veri modelinde bu metinler için hiçbir alan yok. Kodda sabit metin
// olsalardı avukat kendi metnini panelden değiştiremezdi. Yeni satır oluşturulamaz, satır
// silinemez; yalnız düzenlenir (bkz. src/app/panel/sayfalar).
export const pages = mysqlTable('pages', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  title: varchar('title', { length: 220 }).notNull(),
  content: text('content').notNull(), // sanitizeArticleHtml'den geçmiş HTML
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})

// Liste sütunun YANINDA duruyor: slug kümesini kısıtlayan tek şey bu dizi (veritabanında
// ENUM yok — ENUM'a satır eklemek migration gerektirirdi ve buradaki amaç tam tersi,
// kümenin kod tarafında kilitli kalması).
export const PAGE_SLUGS = ['hakkimizda', 'kvkk', 'cerez-politikasi'] as const
export type PageSlug = (typeof PAGE_SLUGS)[number]

// Adres çubuğundan ve formdan gelen slug kullanıcı verisidir; daraltma bu yüklemle yapılır.
export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value)
}

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
export type Lawyer = typeof lawyers.$inferSelect
export type NewLawyer = typeof lawyers.$inferInsert
export type PracticeArea = typeof practiceAreas.$inferSelect
export type NewPracticeArea = typeof practiceAreas.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Settings = typeof settings.$inferSelect
export type NewSettings = typeof settings.$inferInsert
export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
