import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { articles, lawyers } from '@/db/schema'
import { getPublicLawyerBySlug, listPublicLawyers } from './lawyers'

async function temizle() {
  await db.delete(articles)
  await db.delete(lawyers)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

async function avukatEkle(slug: string, ad: string, yayinda: boolean, sira = 0) {
  await db.insert(lawyers).values({
    slug, fullName: ad, title: 'Avukat', isPublished: yayinda, sortOrder: sira,
    practiceStartDate: '2010-03-15', bio: '<p>Özgeçmiş.</p>', email: 'a@ornek.test',
  })
}

describe('listPublicLawyers', () => {
  it('yayımlanmamış avukatı DÖNDÜRMEZ', async () => {
    await avukatEkle('gizli', 'Gizli Kişi', false)
    expect(await listPublicLawyers()).toHaveLength(0)
  })

  it('sort_order, sonra full_name sırasına uyar', async () => {
    await avukatEkle('c', 'Cem Yılmaz', true, 1)
    await avukatEkle('b', 'Berk Öz', true, 0)
    await avukatEkle('a', 'Ayşe Şahin', true, 0)

    expect((await listPublicLawyers()).map((l) => l.slug)).toEqual(['a', 'b', 'c'])
  })
})

describe('getPublicLawyerBySlug', () => {
  it('yayımlanmamış avukat için null döndürür', async () => {
    await avukatEkle('gizli', 'Gizli Kişi', false)
    expect(await getPublicLawyerBySlug('gizli')).toBeNull()
  })

  // Sütun mode:'string'; TZ=America/New_York altında Date'e çevrilseydi bir gün geriye kayardı.
  it('mesleğe başlama tarihini DİZE olarak taşır', async () => {
    await avukatEkle('tolga-akil', 'Tolga Akil', true)
    const avukat = await getPublicLawyerBySlug('tolga-akil')
    expect(avukat?.practiceStartDate).toBe('2010-03-15')
    expect(avukat?.bio).toBe('<p>Özgeçmiş.</p>')
    expect(avukat?.photoPath).toBeNull()
  })

  it('olmayan slug için null döndürür', async () => {
    expect(await getPublicLawyerBySlug('yok')).toBeNull()
  })
})
