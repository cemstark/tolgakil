import type { Metadata } from 'next'
import { listAuthorOptions, listCategoryOptions } from '@/db/queries/articles'
import { listMediaOptions } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { AdBanNotice } from '@/components/AdBanNotice'
import { ArticleForm } from '@/components/ArticleForm'
import { PanelHeading } from '@/components/PanelHeading'
import styles from './page.module.css'

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

      <div className={styles.layout}>
        {/* Hatırlatma kaynak sırasında formdan ÖNCE: yazmaya başlamadan okunması gereken
            bir liste bu. Geniş ekranda ızgara onu sağ sütuna alıyor. */}
        <div className={styles.aside}>
          <AdBanNotice />
        </div>
        <div className={styles.form}>
          <ArticleForm categories={categories} authors={authors} mediaOptions={mediaOptions} />
        </div>
      </div>
    </>
  )
}
