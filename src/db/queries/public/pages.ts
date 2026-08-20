import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { pages, type PageSlug } from '@/db/schema'

export type PublicPage = { title: string; content: string; updatedAt: Date }

/**
 * Sabit sayfa metni; satır yoksa null (tohum verisi eksikse sayfa 404 olmalı, boş bir
 * kabuk basılmamalı).
 *
 * `content` yazma tarafında sanitizeArticleHtml'den geçmiş HTML'dir. Panel sorgusu
 * KULLANILMIYOR: halka açık taraf panel sorgularına bağlanırsa ileride oraya eklenen bir
 * taslak/gizli alan sessizce yayına sızar (sözleşme §3).
 */
export async function getPage(slug: PageSlug): Promise<PublicPage | null> {
  const [row] = await db
    .select({ title: pages.title, content: pages.content, updatedAt: pages.updatedAt })
    .from(pages)
    .where(eq(pages.slug, slug))
  return row ?? null
}
