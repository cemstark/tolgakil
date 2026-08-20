import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { messages, type Message } from '@/db/schema'

/**
 * Panelde tek seferde listelenen en fazla mesaj.
 *
 * İletişim formu Plan 3'te açılıyor ve spam'e maruz kalabilir; sınırsız bir sorgu binlerce
 * satırı GÖVDELERİYLE birlikte belleğe alıp tek sayfaya basardı. 100, elle taranabilecek
 * en büyük liste: bunun ötesi zaten arama/sayfalama işi ve Plan 3'ün konusu.
 */
export const MESSAGE_LIST_LIMIT = 100

// Gövde de listeye giriyor: mesaj panelde yalnızca okunuyor (yanıt gönderme Plan 3'te),
// yani ayrı bir ayrıntı sayfası açmanın tek kazancı ekstra bir tıklama olurdu.
export async function listMessages(limit: number = MESSAGE_LIST_LIMIT): Promise<Message[]> {
  // Sıra yeniden eskiye: sınıra takıldığında kesilenler EN ESKİ mesajlar olsun.
  return db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit)
}

export async function getMessageById(id: number): Promise<Message | null> {
  const [row] = await db.select().from(messages).where(eq(messages.id, id))
  return row ?? null
}

export async function markMessageRead(id: number): Promise<void> {
  await db.update(messages).set({ isRead: true }).where(eq(messages.id, id))
}

export async function deleteMessage(id: number): Promise<void> {
  await db.delete(messages).where(eq(messages.id, id))
}
