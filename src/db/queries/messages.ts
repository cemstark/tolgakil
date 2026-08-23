import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { messages, type Message, type NewMessage } from '@/db/schema'

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

/**
 * `listMessages(MESSAGE_LIST_LIMIT + 1)` çıktısını ekrana giden dilime ve kesilme bayrağına
 * ayırır.
 *
 * Sınırdan bir fazlası çekilmek ZORUNDA: "gelen satır sayısı sınıra eşit" denetimi tam
 * sınır kadar mesaj olduğunda yanlış pozitif verir — hiçbir şey kesilmediği hâlde ekran
 * "daha eskileri görünmez" der ve kullanıcı var olmayan bir mesajı arar. Sınır koşulu saf
 * bir fonksiyonda tutuluyor ki testle sabitlensin; hata tam olarak orada doğmuştu.
 */
export function splitMessagePage(fetched: Message[]): { messages: Message[]; isTruncated: boolean } {
  const isTruncated = fetched.length > MESSAGE_LIST_LIMIT
  return { messages: isTruncated ? fetched.slice(0, MESSAGE_LIST_LIMIT) : fetched, isTruncated }
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

/**
 * İletişim formundan gelen mesajı kaydeder.
 *
 * Bu, `messages` tablosuna yazan TEK üretim yolu; tabloyu şimdiye kadar yalnızca panel
 * okuyordu. Halka açık bir uçtan besleniyor, dolayısıyla çağıran taraf doğrulamayı
 * (contactSchema) ve hız sınırını YAPMIŞ olmalı — burada ikinci bir savunma katmanı yok,
 * sorgu katmanı iş kuralı taşımaz.
 *
 * `ip` ve `userAgent` sütunları kötüye kullanım incelemesi için var ve nullable: ters vekil
 * arkasında istemci adresi okunamayabilir, uydurulmuş bir değer yazmaktansa boş bırakılır.
 */
export async function createMessage(values: NewMessage): Promise<void> {
  await db.insert(messages).values(values)
}
