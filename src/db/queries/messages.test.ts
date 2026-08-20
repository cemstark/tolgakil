import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { messages } from '@/db/schema'
import { MESSAGE_LIST_LIMIT, listMessages } from './messages'

// Testler tek bir gerçek şemayı paylaşıyor; her test kendi zeminini sıfırdan kurar
// (src/db/schema.test.ts ile aynı desen).
beforeEach(async () => {
  await db.delete(messages)
})

// Havuz globalThis üzerinde önbelleklendi; çağrılmazsa Vitest çıkışta asılır (Görev 1-2 sözleşmesi).
afterAll(async () => {
  await db.delete(messages)
  await closeDb()
})

async function mesajEkle(konu: string, dakika: number) {
  await db.insert(messages).values({
    name: 'Deneme Kişi',
    email: 'deneme@ornek.test',
    subject: konu,
    body: 'Gövde',
    isRead: false,
    // Sıralama createdAt'e göre; sütunun varsayılanı aynı saniyeye düşebildiği için
    // değerler açıkça veriliyor, aksi hâlde "en yenisi" iddiası rastgele olurdu.
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, dakika)),
  })
}

describe('listMessages', () => {
  it('varsayılan olarak sınırsız değil', () => {
    expect(MESSAGE_LIST_LIMIT).toBeGreaterThan(0)
  })

  // İletişim formu Plan 3'te açılıyor ve spam'e maruz kalabilir. Sınırsız sorgu binlerce
  // satırı belleğe alıp gövdeleriyle birlikte HTML'e basardı; sayfa da sunucu da düşerdi.
  it('verilen sınırdan fazla satır döndürmez', async () => {
    for (const dakika of [1, 2, 3]) await mesajEkle(`Konu ${dakika}`, dakika)

    const sonuc = await listMessages(2)
    expect(sonuc).toHaveLength(2)
  })

  it('sınıra takılırken en YENİ mesajları tutar', async () => {
    for (const dakika of [1, 2, 3]) await mesajEkle(`Konu ${dakika}`, dakika)

    const sonuc = await listMessages(2)
    expect(sonuc.map((m) => m.subject)).toEqual(['Konu 3', 'Konu 2'])
  })
})
