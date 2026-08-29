import type { Metadata } from 'next'
import Link from 'next/link'
import { MESSAGE_LIST_LIMIT, listMessages, splitMessagePage } from '@/db/queries/messages'
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
import { SwipeableRow } from './SwipeableRow'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Mesajlar',
  robots: { index: false, follow: false },
}

// `sec` = önizleme bölmesinde gösterilecek mesajın kimliği; seçim adres çubuğunda
// taşınıyor, istemci durumunda DEĞİL (makale listesiyle aynı sözleşme).
type MessagePageProps = { searchParams: Promise<PanelNoticeQuery & { sec?: string }> }

export default async function MessagePage({ searchParams }: MessagePageProps) {
  await requireAccess('messages')
  // Sınırdan BİR fazlası çekiliyor; ayırma kuralı ve gerekçesi splitMessagePage'te.
  const [fetched, query] = await Promise.all([listMessages(MESSAGE_LIST_LIMIT + 1), searchParams])
  const { messages, isTruncated } = splitMessagePage(fetched)
  const { key, message: notice } = panelNoticeState(query, {
    saved: 'Mesaj okundu olarak işaretlendi.',
    deleted: 'Mesaj silindi.',
  })

  // Seçili kayıt: adres çubuğundaki `sec` geçerli bir kimliği gösteriyorsa o, aksi hâlde
  // listenin ilki. Kullanıcı yazabildiği için değer sayıya çevrilip listede ARANIYOR.
  // Gövde zaten liste sorgusunda geliyor (listMessages tam satırı döndürüyor), yani
  // önizleme için ikinci bir okuma gerekmiyor.
  const secilenId = Number.parseInt(query.sec ?? '', 10)
  const secili = messages.find((m) => m.id === secilenId) ?? messages[0] ?? null

  return (
    <>
      {notice ? <PanelNotice key={key} message={notice} /> : null}

      <PanelHeading
        title="Mesajlar"
        description="İletişim formundan gelen başvurular. Bu ekrandan yanıt gönderilmez."
      />

      {/* Kesilme SESSİZ olmamalı: kullanıcı listeyi eksiksiz sanıp eski bir başvuruyu
          gözden kaçırabilir. */}
      {isTruncated ? (
        <p className={styles.limitNotice}>
          En yeni {MESSAGE_LIST_LIMIT} mesaj listeleniyor; daha eskileri bu ekranda görünmez.
        </p>
      ) : null}

      {messages.length === 0 ? (
        <PanelEmptyState>Henüz mesaj yok.</PanelEmptyState>
      ) : (
        <div className={styles.split}>
        <PanelTable
          label="Mesaj listesi"
          caption="Geliş tarihine göre yeniden eskiye dizili mesajlar"
          columns={['Tarih', 'Gönderen', 'Konu', 'Durum', 'İşlem']}
        >
          {messages.map((message) => (
            // Satır bir istemci bileşeni: mobilde sola kaydırma "Okundu işaretle"yi
            // tetikliyor (devir tasarımı 4a). Düğmeler GİZLENMİYOR — kaydırma yalnızca
            // kısayol; gerekçesi SwipeableRow'un başında (WCAG 2.5.7).
            <SwipeableRow
              key={message.id}
              isCurrent={secili?.id === message.id}
              canMarkRead={!message.isRead}
            >
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
                {/* Gövde artık satır içindeki <details> yerine SAĞDAKİ ÖNİZLEME
                    bölmesinde (devir tasarımı 5d): beş sütunlu tabloda açılan uzun bir
                    metin satırı, tablonun kendi ızgarasını bozuyordu. Konu bağlantısı
                    seçimi değiştiriyor. scroll={false}: seçim değişince sayfa başa
                    sıçramasın. */}
                <Link href={`?sec=${message.id}`} scroll={false} className={styles.subjectLink}>
                  {message.subject}
                </Link>
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
            </SwipeableRow>
          ))}
        </PanelTable>

        {/* ÖNİZLEME BÖLMESİ (5d). Gövde React tarafından kaçırılıyor — mesaj güvenilmez
            veridir ve HTML olarak BASILMIYOR. `white-space: pre-wrap` gönderenin satır
            sonlarını koruyor. */}
        {secili !== null ? (
          <aside className={styles.preview} aria-label="Seçili mesajın önizlemesi">
            <p className={styles.previewEyebrow}>Mesaj</p>
            <h2 className={styles.previewSubject}>{secili.subject}</h2>
            <p className={styles.previewMeta}>{formatDateTime(secili.createdAt)}</p>

            <div className={styles.previewCard}>
              <p className={styles.previewName}>{secili.name}</p>
              {/* Yanıt gönderme yok; büro kendi posta istemcisiyle dönüyor, bu yüzden
                  adres ve numara tıklanabilir. */}
              <a href={`mailto:${secili.email}`} className={styles.contact}>
                {secili.email}
              </a>
              {secili.phone === null ? null : (
                <a href={`tel:${secili.phone}`} className={styles.contact}>
                  {secili.phone}
                </a>
              )}
            </div>

            <p className={styles.body}>{secili.body}</p>

            <p className={styles.consent}>
              {secili.kvkkAcceptedAt === null
                ? 'KVKK onayı kaydedilmemiş.'
                : `KVKK onayı: ${formatDateTime(secili.kvkkAcceptedAt)}`}
            </p>

            <p className={styles.previewNote}>
              Yanıtlar büro posta hesabından gönderilir; bu ekrandan yanıt gönderilmez.
            </p>
          </aside>
        ) : null}
        </div>
      )}
    </>
  )
}
