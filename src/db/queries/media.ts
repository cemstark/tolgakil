import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { media, users, type Media } from '@/db/schema'

/** Kapak görseli seçicisinin ihtiyaç duyduğu en küçük biçim (bkz. MediaPicker). */
export type MediaOption = { id: number; path: string; altText: string }

export type MediaListItem = {
  id: number
  path: string
  altText: string
  width: number
  height: number
  sizeBytes: number
  createdAt: Date
  uploaderName: string | null
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün,
// panel sessizce boş kitaplık göstermesin.
export async function listMedia(): Promise<MediaListItem[]> {
  return db
    .select({
      id: media.id,
      path: media.path,
      altText: media.altText,
      width: media.width,
      height: media.height,
      sizeBytes: media.sizeBytes,
      createdAt: media.createdAt,
      uploaderName: users.name,
    })
    .from(media)
    // leftJoin: yükleyen kullanıcı silinmişse (FK ON DELETE SET NULL) görsel yine listelenir.
    .leftJoin(users, eq(media.uploadedBy, users.id))
    .orderBy(desc(media.createdAt))
}

export async function getMediaById(id: number): Promise<Media | null> {
  const [row] = await db.select().from(media).where(eq(media.id, id))
  return row ?? null
}

// Dosya adı içerik özeti olduğu için aynı görselin ikinci yüklemesi aynı yola düşer ve
// media.path UNIQUE. Kısıt hatası kullanıcıya 500 olarak dönmesin diye önceden bakılıyor.
export async function getMediaByPath(path: string): Promise<Media | null> {
  const [row] = await db.select().from(media).where(eq(media.path, path))
  return row ?? null
}

export async function deleteMediaRow(id: number): Promise<void> {
  await db.delete(media).where(eq(media.id, id))
}
