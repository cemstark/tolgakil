import type { Metadata } from 'next'
import { listAuthorOptions, listCategoryOptions } from '@/db/queries/articles'
import { listMedia } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { ArticleForm } from '@/components/ArticleForm'
import { PanelHeading } from '@/components/PanelHeading'

export const metadata: Metadata = {
  title: 'Yeni makale',
  robots: { index: false, follow: false },
}

export default async function NewArticlePage() {
  await requireAccess('articles')
  const [categories, authors, mediaOptions] = await Promise.all([
    listCategoryOptions(),
    listAuthorOptions(),
    listMedia(),
  ])

  return (
    <>
      <PanelHeading title="Yeni makale" description="Taslak olarak kaydedip sonra yayımlayabilirsiniz." />
      <ArticleForm categories={categories} authors={authors} mediaOptions={mediaOptions} />
    </>
  )
}
