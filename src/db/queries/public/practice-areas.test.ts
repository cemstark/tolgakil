import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { practiceAreas } from '@/db/schema'
import { getPublicPracticeAreaBySlug, listPublicPracticeAreas } from './practice-areas'

beforeEach(async () => {
  await db.delete(practiceAreas)
})

afterAll(async () => {
  await db.delete(practiceAreas)
  await closeDb()
})

async function alanEkle(slug: string, ad: string, yayinda: boolean, sira = 0, icerik: string | null = null) {
  await db.insert(practiceAreas).values({
    slug, name: ad, summary: 'Bu alanın kapsamını anlatan yeterince uzun bir özet.',
    content: icerik, isPublished: yayinda, sortOrder: sira,
  })
}

describe('listPublicPracticeAreas', () => {
  it('yayımlanmamış alanı DÖNDÜRMEZ', async () => {
    await alanEkle('gizli', 'Gizli Alan', false)
    expect(await listPublicPracticeAreas()).toHaveLength(0)
  })

  it('sort_order, sonra name sırasına uyar', async () => {
    await alanEkle('ticaret', 'Ticaret Hukuku', true, 1)
    await alanEkle('is', 'İş Hukuku', true, 0)
    await alanEkle('aile', 'Aile Hukuku', true, 0)

    expect((await listPublicPracticeAreas()).map((a) => a.slug)).toEqual(['aile', 'is', 'ticaret'])
  })

  // Sözleşme §2: bileşen prop tipi { slug, name, summary } — kart bunun dışında alan almaz.
  it('kart yalnız slug, name ve summary taşır', async () => {
    await alanEkle('aile', 'Aile Hukuku', true, 0, '<p>Uzun içerik.</p>')
    expect(Object.keys((await listPublicPracticeAreas())[0]).sort()).toEqual(['name', 'slug', 'summary'])
  })
})

describe('getPublicPracticeAreaBySlug', () => {
  it('yayımlanmamış alan için null döndürür', async () => {
    await alanEkle('gizli', 'Gizli Alan', false)
    expect(await getPublicPracticeAreaBySlug('gizli')).toBeNull()
  })

  it('içeriği olmayan alanda content null döner', async () => {
    await alanEkle('aile', 'Aile Hukuku', true)
    expect((await getPublicPracticeAreaBySlug('aile'))?.content).toBeNull()
  })

  it('olmayan slug için null döndürür', async () => {
    expect(await getPublicPracticeAreaBySlug('yok')).toBeNull()
  })
})
