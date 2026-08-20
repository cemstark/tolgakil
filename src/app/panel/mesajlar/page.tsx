import type { Metadata } from 'next'
import { MESSAGE_LIST_LIMIT, listMessages } from '@/db/queries/messages'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { panelNoticeState, type PanelNoticeQuery } from '@/lib/panel-notice'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelNotice } from '@/components/PanelNotice'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'
import { deleteMessage } from './actions'
import { MarkReadButton } from './MarkReadButton'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Mesajlar',
  robots: { index: false, follow: false },
}

type MessagePageProps = { searchParams: Promise<PanelNoticeQuery> }

export default async function MessagePage({ searchParams }: MessagePageProps) {
  await requireAccess('messages')
  const [messages, query] = await Promise.all([listMessages(), searchParams])
  const { key, message: notice } = panelNoticeState(query, {
    saved: 'Mesaj okundu olarak işaretlendi.',
    deleted: 'Mesaj silindi.',
  })

  return (
    <>
      {notice ? <PanelNotice key={key} message={notice} /> : null}

      <PanelHeading
        title="Mesajlar"
        description="İletişim formundan gelen başvurular. Bu ekrandan yanıt gönderilmez."
      />

      {/* Kesilme SESSİZ olmamalı: kullanıcı listeyi eksiksiz sanıp eski bir başvuruyu
          gözden kaçırabilir. Eşitlik yeterli — sorgu sınırdan fazlasını hiç getirmiyor. */}
      {messages.length === MESSAGE_LIST_LIMIT ? (
        <p className={styles.limitNotice}>
          En yeni {MESSAGE_LIST_LIMIT} mesaj listeleniyor; daha eskileri bu ekranda görünmez.
        </p>
      ) : null}

      {messages.length === 0 ? (
        <PanelEmptyState>Henüz mesaj yok.</PanelEmptyState>
      ) : (
        <PanelTable
          label="Mesaj listesi"
          caption="Geliş tarihine göre yeniden eskiye dizili mesajlar"
          columns={['Tarih', 'Gönderen', 'Konu', 'Durum', 'İşlem']}
        >
          {messages.map((message) => (
            <tr key={message.id}>
              {/* Veritabanı oturumu UTC; @/lib/date biçimlendiricileri timeZone'u açıkça
                  veriyor, ham toLocaleString sunucunun dilimine bağlı çıkardı. */}
              <td className={styles.dateCell}>{formatDateTime(message.createdAt)}</td>
              <th scope="row" className={table.nameCell}>
                {message.name}
                {/* Yanıt gönderme yok (Plan 3); büro kendi posta istemcisiyle dönüyor,
                    bu yüzden adres tıklanabilir. */}
                <a href={`mailto:${message.email}`} className={styles.contact}>
                  {message.email}
                </a>
                {message.phone === null ? null : (
                  <a href={`tel:${message.phone}`} className={styles.contact}>
                    {message.phone}
                  </a>
                )}
              </th>
              <td>
                {/* Yerleşik açılır bölüm: klavye erişimi ve durum duyurusu tarayıcıdan
                    geliyor. Gövde React tarafından kaçırılıyor — mesaj güvenilmez veridir
                    ve HTML olarak basılmıyor. */}
                <details className={styles.detail}>
                  <summary className={styles.summary}>{message.subject}</summary>
                  <p className={styles.body}>{message.body}</p>
                  <p className={styles.consent}>
                    {message.kvkkAcceptedAt === null
                      ? 'KVKK onayı kaydedilmemiş.'
                      : `KVKK onayı: ${formatDateTime(message.kvkkAcceptedAt)}`}
                  </p>
                </details>
              </td>
              <td>
                {/* Durum yalnız renkle değil metinle de ayrışıyor (WCAG 1.4.1). */}
                <span className={message.isRead ? table.off : table.on}>
                  {message.isRead ? 'Okundu' : 'Okunmadı'}
                </span>
              </td>
              <td>
                <div className={table.rowActions}>
                  {message.isRead ? null : (
                    <MarkReadButton messageId={message.id} subject={message.subject} />
                  )}
                  <ConfirmDeleteDialog
                    action={deleteMessage}
                    recordId={message.id}
                    heading="Mesajı sil"
                    recordName={message.subject}
                    triggerLabel={`Sil: ${message.subject}`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
