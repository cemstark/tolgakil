import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, closeDb } from '@/db/client'
import { articles, categories, lawyers, messages } from '@/db/schema'

// Testler tek bir gerçek şemayı paylaşıyor; her test kendi zeminini sıfırdan kurar.
async function temizle() {
  await db.delete(articles)
  await db.delete(lawyers)
  await db.delete(categories)
  await db.delete(messages)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

// drizzle-orm 0.45.2 sürücü hatasını DrizzleQueryError içine sarıyor; message yalnızca
// "Failed query: ..." diyor, MariaDB'nin kodu cause içinde kalıyor (ölçüldü). İşlem hata
// vermeden geçerse burada patlıyoruz: kısıt kalkarsa test sessizce yeşile dönmesin.
async function hataKodu(islem: Promise<unknown>, islemAdi: string): Promise<string> {
  try {
    await islem
  } catch (hata) {
    const neden = (hata as { cause?: { code?: string } }).cause
    return neden?.code ?? (hata as Error).message
  }
  throw new Error(`${islemAdi} hata vermesi gerekirken başarıyla tamamlandı.`)
}

async function kategoriEkle(slug: string) {
  await db.insert(categories).values({ slug, name: 'İş Hukuku' })
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug))
  return row.id
}

describe('şema', () => {
  it('Türkçe harfleri kayıpsız saklar', async () => {
    await db.insert(lawyers).values({
      slug: 'ozge-cinar',
      fullName: 'Özge Çınar Şahin',
      title: 'Avukat',
      isPublished: false,
      sortOrder: 0,
    })
    const [row] = await db.select().from(lawyers).where(eq(lawyers.slug, 'ozge-cinar'))
    expect(row.fullName).toBe('Özge Çınar Şahin')
  })

  it('aynı slug ile ikinci avukat eklenemez', async () => {
    const veri = { slug: 'tolga-akil', fullName: 'Tolga Akıl', title: 'Avukat', isPublished: false, sortOrder: 0 }
    await db.insert(lawyers).values(veri)
    expect(
      await hataKodu(
        db.insert(lawyers).values({ ...veri, fullName: 'Başka Kişi' }),
        'Aynı slug ile ikinci avukat eklemek',
      ),
    ).toBe('ER_DUP_ENTRY')
  })

  it('makalesi olan kategori silinemez', async () => {
    const categoryId = await kategoriEkle('is-hukuku')
    await db.insert(articles).values({
      slug: 'ise-iade', title: 'İşe iade', excerpt: 'özet', content: '<p>gövde</p>',
      categoryId, status: 'draft',
    })
    expect(
      await hataKodu(
        db.delete(categories).where(eq(categories.id, categoryId)),
        'Makalesi olan kategoriyi silmek',
      ),
    ).toBe('ER_ROW_IS_REFERENCED_2')
  })

  it('bilinmeyen durum değeri kabul edilmez', async () => {
    const categoryId = await kategoriEkle('ticaret-hukuku')
    // sql_mode STRICT_TRANS_TABLES açık; ENUM dışı değer hata verir.
    expect(
      await hataKodu(
        db.insert(articles).values({
          slug: 'yanlis-durum', title: 'Yanlış', excerpt: 'özet', content: '<p>x</p>',
          categoryId,
          status: 'yayinda' as never,
        }),
        'ENUM dışı bir durum değeri yazmak',
      ),
    ).toBe('WARN_DATA_TRUNCATED')
  })

  it('zaman damgasını sunucu dilimine kaymadan saklar', async () => {
    const oncesi = Date.now()
    await db.insert(messages).values({
      name: 'Deneme Kişi', email: 'deneme@ornek.test', subject: 'Konu', body: 'Gövde',
    })
    const [row] = await db.select().from(messages).where(eq(messages.email, 'deneme@ornek.test'))
    // Havuz oturumu UTC'ye sabitlemezse sunucunun SYSTEM dilimi (+03:00) yüzünden fark
    // 180 dakikaya fırlar; drizzle ham dizeyi koşulsuz UTC sayıyor.
    expect(Math.abs(row.createdAt.getTime() - oncesi)).toBeLessThan(60_000)
  })

  it('FULLTEXT indeksi makale gövdesinde önek araması yapar', async () => {
    const categoryId = await kategoriEkle('kira-hukuku')
    await db.insert(articles).values({
      slug: 'kira-tespit', title: 'Kira tespit davası',
      excerpt: 'Kira bedelinin belirlenmesi', content: '<p>Kiracının hakları</p>',
      categoryId, status: 'published',
    })
    const bulunan = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(sql`match(${articles.title}, ${articles.excerpt}, ${articles.content}) against ('dava*' in boolean mode)`)
    expect(bulunan.map((r) => r.slug)).toEqual(['kira-tespit'])
  })
})
