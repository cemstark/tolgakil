import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { articles, categories } from '@/db/schema'
import { getPublicCategoryBySlug, listPublicCategories } from './categories'

async function temizle() {
  await db.delete(articles)
  await db.delete(categories)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

async function kategoriEkle(slug: string, ad: string, aciklama?: string): Promise<number> {
  const [sonuc] = await db.insert(categories).values({ slug, name: ad, description: aciklama ?? null })
  return sonuc.insertId
}

async function makaleEkle(slug: string, kategoriId: number, durum: 'draft' | 'published') {
  await db.insert(articles).values({
    slug, title: 'Başlık metni', excerpt: 'Özet metni burada duruyor ve yeterince uzun.',
    content: '<p>Gövde.</p>', searchText: 'Gövde.', status: durum,
    publishedAt: durum === 'published' ? new Date(Date.UTC(2026, 0, 1)) : null,
    categoryId: kategoriId,
  })
}

describe('listPublicCategories', () => {
  it('yayımlanmış makale sayısını verir', async () => {
    const id = await kategoriEkle('kira-hukuku', 'Kira Hukuku', 'Kira uyuşmazlıkları.')
    await makaleEkle('a', id, 'published')
    await makaleEkle('b', id, 'published')

    const [kategori] = await listPublicCategories()
    expect(kategori.articleCount).toBe(2)
    expect(kategori.description).toBe('Kira uyuşmazlıkları.')
  })

  // Boş bir arşiv sayfasına giden bağlantı üretilmemeli (sözleşme §3.2).
  it('hiç makalesi olmayan kategoriyi LİSTELEMEZ', async () => {
    await kategoriEkle('bos-kategori', 'Boş Kategori')
    expect(await listPublicCategories()).toHaveLength(0)
  })

  it('yalnız TASLAK makalesi olan kategoriyi LİSTELEMEZ', async () => {
    const id = await kategoriEkle('taslak-kategori', 'Taslak Kategori')
    await makaleEkle('taslak', id, 'draft')
    expect(await listPublicCategories()).toHaveLength(0)
  })

  it('taslakları saymaz', async () => {
    const id = await kategoriEkle('karisik', 'Karışık')
    await makaleEkle('yayin', id, 'published')
    await makaleEkle('taslak', id, 'draft')
    expect((await listPublicCategories())[0].articleCount).toBe(1)
  })
})

describe('getPublicCategoryBySlug', () => {
  it('olmayan slug için null döndürür', async () => {
    expect(await getPublicCategoryBySlug('yok')).toBeNull()
  })

  it('sayımda taslakları hesaba katmaz', async () => {
    const id = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    await makaleEkle('yayin', id, 'published')
    await makaleEkle('taslak', id, 'draft')
    expect((await getPublicCategoryBySlug('kira-hukuku'))?.articleCount).toBe(1)
  })
})
