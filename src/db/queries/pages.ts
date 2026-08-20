import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { PAGE_SLUGS, pages, type PageSlug } from '@/db/schema'

export type PageListItem = {
  slug: PageSlug
  title: string
  updatedAt: Date
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün,
// panel sessizce boş liste göstermesin.
export async function listPages(): Promise<PageListItem[]> {
  const rows = await db.select({ slug: pages.slug, title: pages.title, updatedAt: pages.updatedAt }).from(pages)

  // Sıralama veritabanına bırakılmıyor: liste ekranda sabit durmalı. `updated_at`'e göre
  // dizilseydi bir sayfayı kaydeden kullanıcı listenin yeniden dizildiğini görür ve bir
  // sonraki tıklamada yanlış satıra basardı. Sabit liste dışındaki bir satır (elle eklenmiş
  // olabilir) düşüyor: panel yalnız yönetebildiği slug'ları göstermeli.
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  return PAGE_SLUGS.flatMap((slug) => {
    const row = bySlug.get(slug)
    return row === undefined ? [] : [{ slug, title: row.title, updatedAt: row.updatedAt }]
  })
}

export async function getPageBySlug(slug: PageSlug): Promise<{ title: string; content: string } | null> {
  const [row] = await db.select({ title: pages.title, content: pages.content }).from(pages).where(eq(pages.slug, slug))
  return row ?? null
}

/** Yalnız GÜNCELLER; satır oluşturmaz ve silmez (sabit satırlı tablo). */
export async function updatePageContent(slug: PageSlug, values: { title: string; content: string }): Promise<void> {
  await db.update(pages).set(values).where(eq(pages.slug, slug))
}
