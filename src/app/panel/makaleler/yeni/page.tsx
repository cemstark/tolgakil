import type { Metadata } from 'next'
import { listAuthorOptions, listCategoryOptions } from '@/db/queries/articles'
import { listMediaOptions } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { AdBanNotice } from '@/components/AdBanNotice'
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
    listMediaOptions(),
  ])

  return (
    <>
      <PanelHeading title="Yeni makale" description="Taslak olarak kaydedip sonra yayımlayabilirsiniz." />

      {/* Hatırlatma artık sayfa düzeyinde AYRI BİR SÜTUN DEĞİL, formun kendi sağ
          bölmesinin sonunda (devir tasarımı 5d). Önceki hâlde sayfa iki sütuna, form da
          kendi içinde iki bölmeye ayrılıyordu; 1440px'te üç sütun oluşup yazma alanı
          304px'e iniyordu. Slot olarak geçiliyor: ArticleForm 'use client' ve bu blok
          sunucuda çiziliyor. */}
      <ArticleForm
        categories={categories}
        authors={authors}
        mediaOptions={mediaOptions}
        aside={<AdBanNotice />}
      />
    </>
  )
}
