import { and, asc, eq, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { lawyers, type Lawyer } from '@/db/schema'

export type LawyerListItem = {
  id: number
  fullName: string
  title: string
  sortOrder: number
  isPublished: boolean
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün,
// panel sessizce boş liste göstermesin.
export async function listLawyers(): Promise<LawyerListItem[]> {
  return db
    .select({
      id: lawyers.id,
      fullName: lawyers.fullName,
      title: lawyers.title,
      sortOrder: lawyers.sortOrder,
      isPublished: lawyers.isPublished,
    })
    .from(lawyers)
    // Sıra alanı kadro sayfasındaki gösterim sırasını belirliyor; panel de aynı sırayı
    // göstermeli, aksi hâlde "sıra" alanının ne yaptığı ekrandan anlaşılmaz.
    .orderBy(asc(lawyers.sortOrder), asc(lawyers.fullName))
}

export async function getLawyerById(id: number): Promise<Lawyer | null> {
  const [row] = await db.select().from(lawyers).where(eq(lawyers.id, id))
  return row ?? null
}

// exceptId düzenlemede kendi kaydını saymaz; aksi hâlde kayıt kendi adresiyle çakışır
// ve slug'a dokunmayan her güncelleme reddedilirdi.
export async function isSlugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const predicate =
    exceptId === undefined
      ? eq(lawyers.slug, slug)
      : and(eq(lawyers.slug, slug), ne(lawyers.id, exceptId))

  const [row] = await db.select({ id: lawyers.id }).from(lawyers).where(predicate).limit(1)
  return row !== undefined
}

export async function deleteLawyer(id: number): Promise<void> {
  await db.delete(lawyers).where(eq(lawyers.id, id))
}
