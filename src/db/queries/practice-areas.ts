import { and, asc, eq, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { practiceAreas, type PracticeArea } from '@/db/schema'

export type PracticeAreaListItem = {
  id: number
  name: string
  sortOrder: number
  isPublished: boolean
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün,
// panel sessizce boş liste göstermesin.
export async function listPracticeAreas(): Promise<PracticeAreaListItem[]> {
  return db
    .select({
      id: practiceAreas.id,
      name: practiceAreas.name,
      sortOrder: practiceAreas.sortOrder,
      isPublished: practiceAreas.isPublished,
    })
    .from(practiceAreas)
    .orderBy(asc(practiceAreas.sortOrder), asc(practiceAreas.name))
}

export async function getPracticeAreaById(id: number): Promise<PracticeArea | null> {
  const [row] = await db.select().from(practiceAreas).where(eq(practiceAreas.id, id))
  return row ?? null
}

// exceptId düzenlemede kendi kaydını saymaz (bkz. queries/lawyers.ts).
export async function isSlugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const predicate =
    exceptId === undefined
      ? eq(practiceAreas.slug, slug)
      : and(eq(practiceAreas.slug, slug), ne(practiceAreas.id, exceptId))

  const [row] = await db.select({ id: practiceAreas.id }).from(practiceAreas).where(predicate).limit(1)
  return row !== undefined
}

export async function deletePracticeArea(id: number): Promise<void> {
  await db.delete(practiceAreas).where(eq(practiceAreas.id, id))
}
