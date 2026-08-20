import { cacheLife, cacheTag } from 'next/cache'
// getPage halka açık sorgu katmanında (src/db/queries/public/pages.ts); PageSlug türü
// db/schema.ts'den geliyor. Görev 6 brifinin varsaydığı '@/db/queries/pages' yolu panel
// tarafının sorgularını taşıyor (listPages/updatePageContent), halka açık getPage değil —
// import yolu bu yüzden düzeltildi, imza sözleşme §3.6'dan geldiği için değişmedi.
import { getPage } from '@/db/queries/public/pages'
import type { PageSlug } from '@/db/schema'
import { TAGS } from '@/lib/cache-tags'

export type StaticPageContent = { title: string; content: string; updatedAt: Date }

// SQL YOK: sorgu Görev 2'nin getPage()'inde. Bu modül yalnız önbellek kabuğu — sabit metin
// sayfaları içerik değişene kadar yeniden çizilmesin ve cacheComponents altında statik
// kalsınlar. Panelin sayfa kaydı updateTag(TAGS.pages) ile tazeler.
//
// Hata YUTULMUYOR: getPage fırlatırsa fırlatma buradan geçer ve error.tsx sınırına düşer.
// null yalnız "böyle bir satır yok" demektir ve çağıran onu notFound()'a çevirir.
export async function loadStaticPage(slug: PageSlug): Promise<StaticPageContent | null> {
  'use cache'
  cacheTag(TAGS.pages)
  cacheLife('max')

  return getPage(slug)
}
