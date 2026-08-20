import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { media, users, type Media } from '@/db/schema'

/** Kapak görseli seçicisinin ihtiyaç duyduğu en küçük biçim (bkz. MediaPicker). */
export type MediaOption = { id: number; path: string; altText: string }

/**
 * Seçiciye verilen görsel sayısının tavanı.
 *
 * Seçici bir radyo grubu: her seçenek bir küçük resim indiriyor ve tüm liste RSC yüküyle
 * birlikte istemciye serileşiyor. Tavan yoksa kitaplık büyüdükçe dört form sayfasının da
 * ilk yükü onunla birlikte büyür.
 *
 * BEDELİ AÇIK: kitaplıkta bu sayıdan fazla görsel varsa en eskiler seçicide görünmez
 * (sıralama en yeniden eskiye). Büronun kullanımında kapak görselleri güncel yüklemelerden
 * seçiliyor, yani pratikte erişilemeyen bir görsel kalmıyor. Kitaplık bu tavanı gerçekten
 * aşarsa doğru çözüm tavanı yükseltmek değil, seçiciye arama/sayfalama koymaktır (Plan 3).
 */
const MEDIA_OPTION_LIMIT = 200

/**
 * Seçici için yalnız gereken üç sütun, tavanlı.
 *
 * `listMedia()` DEĞİL: o dokuz sütun döndürüyor (boyut, ölçüler, yükleyen adı) ve seçicinin
 * hiçbirine ihtiyacı yok — hepsi RSC yüküne serileşiyordu.
 */
export async function listMediaOptions(): Promise<MediaOption[]> {
  return db
    .select({ id: media.id, path: media.path, altText: media.altText })
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(MEDIA_OPTION_LIMIT)
}

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
