import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { lawyers, media } from '@/db/schema'

export type PublicLawyerCard = {
  slug: string
  fullName: string
  title: string
  photoPath: string | null
  photoAlt: string | null
}

export type PublicLawyerDetail = PublicLawyerCard & {
  barAssociation: string | null
  barRegistryNo: string | null
  tbbRegistryNo: string | null
  practiceStartDate: string | null
  university: string | null
  languages: string | null
  email: string | null
  bio: string | null
}

const cardColumns = {
  slug: lawyers.slug,
  fullName: lawyers.fullName,
  title: lawyers.title,
  // HAM göreli yol; mediaUrl() bileşen tarafında (bkz. public/articles.ts).
  photoPath: media.path,
  photoAlt: media.altText,
}

// Panel sorgusu (queries/lawyers.ts) KULLANILMIYOR: o taraf yayımlanmamış kayıtları da
// döndürüyor ve buraya bağlanırsa gizli bir özgeçmiş sızabilir (sözleşme §3).
export async function listPublicLawyers(): Promise<PublicLawyerCard[]> {
  return db
    .select(cardColumns)
    .from(lawyers)
    .leftJoin(media, eq(lawyers.photoMediaId, media.id))
    .where(eq(lawyers.isPublished, true))
    // Panel de aynı sırayı gösteriyor; "sıra" alanının ne yaptığı ekrandan anlaşılsın.
    .orderBy(asc(lawyers.sortOrder), asc(lawyers.fullName))
}

export async function getPublicLawyerBySlug(slug: string): Promise<PublicLawyerDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      barAssociation: lawyers.barAssociation,
      barRegistryNo: lawyers.barRegistryNo,
      tbbRegistryNo: lawyers.tbbRegistryNo,
      // mode:'string' sütun (schema.ts): 'YYYY-MM-DD' olarak taşınıyor. Date'e çevrilseydi
      // TZ=America/New_York altında bir gün geriye kayardı.
      practiceStartDate: lawyers.practiceStartDate,
      university: lawyers.university,
      languages: lawyers.languages,
      email: lawyers.email,
      // Yazma tarafında sanitizeArticleHtml'den geçmiş HTML.
      bio: lawyers.bio,
    })
    .from(lawyers)
    .leftJoin(media, eq(lawyers.photoMediaId, media.id))
    .where(and(eq(lawyers.slug, slug), eq(lawyers.isPublished, true)))

  return row ?? null
}
