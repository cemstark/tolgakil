import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getArticleById, listAuthorOptions, listCategoryOptions } from '@/db/queries/articles'
import { listMediaOptions } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { isRouteId } from '@/lib/form-id'
import { sanitizeArticleHtml } from '@/lib/sanitize'
import { AdBanNotice } from '@/components/AdBanNotice'
import { ArticleForm } from '@/components/ArticleForm'
import { PanelHeading } from '@/components/PanelHeading'
import { saveMessageFor } from '../save-messages'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Makaleyi düzenle',
  robots: { index: false, follow: false },
}

type EditArticlePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ kaydedildi?: string }>
}

export default async function EditArticlePage({ params, searchParams }: EditArticlePageProps) {
  await requireAccess('articles')

  const { id } = await params
  // Adres kullanıcı verisi: "3e2" Number ile sessizce 300 olurdu, var olmayan bir kayda
  // referans verip 500 döndürürdü. Biçim önce denetleniyor — yüklem lib/form-id.ts'te,
  // satır içi kopyası olsaydı iki denetim zamanla ayrışırdı.
  if (!isRouteId(id)) notFound()

  const article = await getArticleById(Number(id))
  if (article === null) notFound()

  const [categories, authors, mediaOptions, query] = await Promise.all([
    listCategoryOptions(),
    listAuthorOptions(),
    listMediaOptions(),
    searchParams,
  ])

  return (
    <>
      <PanelHeading
        title="Makaleyi düzenle"
        description={
          article.publishedAt === null
            ? 'Bu makale henüz yayımlanmadı.'
            : `İlk yayım: ${formatDateTime(article.publishedAt)}`
        }
      />

      <ArticleForm
        categories={categories}
        authors={authors}
        mediaOptions={mediaOptions}
        initialMessage={saveMessageFor(query.kaydedildi)}
        // Hatırlatma düzenleme ekranında da duruyor: yasaklı ifade en çok metni SONRADAN
        // genişletirken giriyor.
        aside={<AdBanNotice />}
        values={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          categoryId: article.categoryId === null ? '' : String(article.categoryId),
          authorId: article.authorId === null ? '' : String(article.authorId),
          coverMediaId: article.coverMediaId === null ? '' : String(article.coverMediaId),
        }}
      />

      <section aria-labelledby="article-preview-heading" className={styles.preview}>
        <h2 id="article-preview-heading" className={styles.previewHeading}>
          Önizleme
        </h2>
        {/* Temizleme OKUMADA da tekrarlanıyor: veritabanına bu görevden önce veya başka bir
            yoldan temizlenmemiş bir kayıt girmiş olabilir, kayıt anındaki temizliğe
            güvenmek panelde saklı bir XSS bırakırdı. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }} />
      </section>
    </>
  )
}
