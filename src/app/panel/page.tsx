import type { Metadata } from 'next'
import { count, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, messages } from '@/db/schema'
import { requireUser } from '@/lib/auth-guards'
import { canAccess } from '@/lib/permissions'
import { PanelHeading } from '@/components/PanelHeading'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

async function countArticles(status: 'draft' | 'published'): Promise<number> {
  const [row] = await db.select({ value: count() }).from(articles).where(eq(articles.status, status))
  return row.value
}

export default async function PanelHomePage() {
  const user = await requireUser()

  // Okunmamış mesaj sayısı bir admin verisi; editor'e sorgusu bile atılmıyor.
  const canSeeMessages = canAccess(user.role, 'messages')
  const [draftCount, publishedCount, unreadCount] = await Promise.all([
    countArticles('draft'),
    countArticles('published'),
    canSeeMessages
      ? db.select({ value: count() }).from(messages).where(eq(messages.isRead, false)).then(([r]) => r.value)
      : Promise.resolve(null),
  ])

  const stats = [
    { label: 'Taslak makale', value: draftCount },
    { label: 'Yayımlanmış makale', value: publishedCount },
    ...(unreadCount === null ? [] : [{ label: 'Okunmamış mesaj', value: unreadCount }]),
  ]

  return (
    <>
      {/* Oturum sahibinin adı gezinmede zaten yazıyor; burada tekrarlanmıyor. */}
      <PanelHeading title="Panel" description="Bürodaki içeriklerin güncel durumu." />
      <ul className={styles.stats}>
        {stats.map((stat) => (
          <li key={stat.label} className={`card ${styles.stat}`}>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
