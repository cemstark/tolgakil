import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { practiceAreas } from '@/db/schema'

// Sözleşme §2: Plan 1'in PracticeAreas({ areas }) bileşeni tam olarak bu üç alanı bekliyor.
export type PublicPracticeAreaCard = { slug: string; name: string; summary: string }
export type PublicPracticeAreaDetail = PublicPracticeAreaCard & { content: string | null }

const cardColumns = {
  slug: practiceAreas.slug,
  name: practiceAreas.name,
  summary: practiceAreas.summary,
}

// Panel sorgusu KULLANILMIYOR: o taraf yayımlanmamış alanları da döndürüyor (sözleşme §3).
export async function listPublicPracticeAreas(): Promise<PublicPracticeAreaCard[]> {
  return db
    .select(cardColumns)
    .from(practiceAreas)
    .where(eq(practiceAreas.isPublished, true))
    .orderBy(asc(practiceAreas.sortOrder), asc(practiceAreas.name))
}

export async function getPublicPracticeAreaBySlug(slug: string): Promise<PublicPracticeAreaDetail | null> {
  const [row] = await db
    // İçerik yalnız ayrıntı sayfasında: kart sorgusuna TEXT sütunu koymak on kayıt için
    // yüz kilobayt taşırdı.
    .select({ ...cardColumns, content: practiceAreas.content })
    .from(practiceAreas)
    .where(and(eq(practiceAreas.slug, slug), eq(practiceAreas.isPublished, true)))

  return row ?? null
}
