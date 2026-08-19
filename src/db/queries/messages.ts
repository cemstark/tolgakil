import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { messages, type Message } from '@/db/schema'

// Gövde de listeye giriyor: mesaj panelde yalnızca okunuyor (yanıt gönderme Plan 3'te),
// yani ayrı bir ayrıntı sayfası açmanın tek kazancı ekstra bir tıklama olurdu.
export async function listMessages(): Promise<Message[]> {
  return db.select().from(messages).orderBy(desc(messages.createdAt))
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
