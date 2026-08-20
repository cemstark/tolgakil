import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { articles, categories, lawyers } from '@/db/schema'
import {
  ARTICLES_PER_PAGE, getPublishedArticleBySlug, listArticleFeedEntries, listLatestArticles,
  listPublishedArticles, toBooleanModeTerm,
} from './articles'

// FK sırası: articles önce (author_id/category_id kısıtları RESTRICT).
async function temizle() {
  await db.delete(articles)
  await db.delete(lawyers)
  await db.delete(categories)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

async function kategoriEkle(slug: string, ad: string): Promise<number> {
  const [sonuc] = await db.insert(categories).values({ slug, name: ad })
  return sonuc.insertId
}

type MakaleGirdi = {
  slug: string
  baslik?: string
  ozet?: string
  icerik?: string
  arama?: string | null
  durum?: 'draft' | 'published'
  yayin?: Date | null
  kategoriId?: number | null
}

// Tarihler açıkça veriliyor: sütun varsayılanı aynı saniyeye düşebiliyor ve "en yenisi"
// iddiası rastgeleleşirdi (queries/messages.test.ts ile aynı gerekçe).
async function makaleEkle(girdi: MakaleGirdi) {
  await db.insert(articles).values({
    slug: girdi.slug,
    title: girdi.baslik ?? 'Kira Tespit Davası',
    excerpt: girdi.ozet ?? 'Kira bedelinin tespiti için açılan davanın aşamaları.',
    content: girdi.icerik ?? '<p>Gövde metni.</p>',
    searchText: girdi.arama === undefined ? 'Gövde metni.' : girdi.arama,
    status: girdi.durum ?? 'published',
    publishedAt: girdi.yayin === undefined ? new Date(Date.UTC(2026, 0, 1)) : girdi.yayin,
    categoryId: girdi.kategoriId ?? null,
  })
}

describe('listPublishedArticles — yayımlanmışlık yüklemi', () => {
  it('taslak makaleyi DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'taslak', durum: 'draft' })
    const sonuc = await listPublishedArticles({})
    expect(sonuc.items).toHaveLength(0)
    expect(sonuc.total).toBe(0)
  })

  // "Yayında" işaretli ama tarihi boş kayıt: Plan 2'de status yayına alınıp publishedAt
  // atanmadan kaydedilmiş bir satır teoride mümkün ve sıralaması belirsiz olurdu.
  it('published_at NULL olan makaleyi DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'tarihsiz', durum: 'published', yayin: null })
    expect((await listPublishedArticles({})).items).toHaveLength(0)
  })

  // İleri tarihli yayın: avukat metni bugün yazıp gelecek haftaya kurabilmeli ve o tarihe
  // kadar adres 404 vermeli.
  it('gelecek tarihli makaleyi DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'gelecek', yayin: new Date(Date.now() + 86_400_000) })
    expect((await listPublishedArticles({})).items).toHaveLength(0)
  })

  it('yayımlanmış makaleyi kartı doldurarak döndürür', async () => {
    const kategoriId = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    await makaleEkle({ slug: 'kira-tespit', kategoriId })

    const [kart] = (await listPublishedArticles({})).items
    expect(kart.slug).toBe('kira-tespit')
    expect(kart.categoryName).toBe('Kira Hukuku')
    expect(kart.categorySlug).toBe('kira-hukuku')
    expect(kart.publishedAt).toBeInstanceOf(Date)
    expect(kart.coverPath).toBeNull()
  })
})

describe('listPublishedArticles — sayfalama', () => {
  it('sayfa boyutunu aşmaz ve pageCount hesaplar', async () => {
    for (let i = 0; i < ARTICLES_PER_PAGE + 2; i += 1) {
      await makaleEkle({ slug: `makale-${i}`, yayin: new Date(Date.UTC(2026, 0, 1, 0, i)) })
    }
    const ilk = await listPublishedArticles({ page: 1 })
    expect(ilk.items).toHaveLength(ARTICLES_PER_PAGE)
    expect(ilk.total).toBe(ARTICLES_PER_PAGE + 2)
    expect(ilk.pageCount).toBe(2)

    const ikinci = await listPublishedArticles({ page: 2 })
    expect(ikinci.items).toHaveLength(2)
  })

  // ?sayfa=0, ?sayfa=-3, ?sayfa=abc → hepsi adres çubuğundan gelebilir. Hata sayfası değil,
  // ilk sayfa gösterilmeli.
  it.each([0, -3, 1.5, Number.NaN])('geçersiz sayfa değeri %s ilk sayfaya çekilir', async (deger) => {
    await makaleEkle({ slug: 'tek' })
    expect((await listPublishedArticles({ page: deger })).page).toBe(1)
  })

  // Kayıt yokken bile bölme sonucu 0 olmamalı: "1 / 0" yazan bir sayfalama çizilirdi.
  it('hiç kayıt yokken pageCount en az 1', async () => {
    expect((await listPublishedArticles({})).pageCount).toBe(1)
  })
})

describe('toBooleanModeTerm', () => {
  // Temizlenmezse MariaDB "syntax error" fırlatır ve kullanıcı arama kutusuna ")" yazdığı
  // için hata sayfası görür.
  it('boolean mode özel karakterlerini atar', () => {
    expect(toBooleanModeTerm('+kira -tespit* (x) ~y "z" @w >a <b')).toBe('kira tespit x y z w a b')
  })

  it('yalnız özel karakterden oluşan girdide boş dize döndürür', () => {
    expect(toBooleanModeTerm('  +*~()  ')).toBe('')
  })
})

describe('listPublishedArticles — arama', () => {
  it('search_text içindeki kelimeyi bulur', async () => {
    await makaleEkle({ slug: 'bulunacak', arama: 'ihtarname gönderme usulü anlatılıyor' })
    await makaleEkle({ slug: 'bulunmayacak', arama: 'velayet düzenlemesi anlatılıyor' })

    const sonuc = await listPublishedArticles({ q: 'ihtarname' })
    expect(sonuc.items.map((i) => i.slug)).toEqual(['bulunacak'])
  })

  // Görev 2'nin asıl gerekçesi: indeks artık HTML'i kapsamıyor.
  it('HTML etiket adı arandığında sonuç DÖNMEZ', async () => {
    await makaleEkle({ slug: 'kalin', icerik: '<p><strong>Kalın</strong> metin.</p>', arama: 'Kalın metin.' })
    expect((await listPublishedArticles({ q: 'strong' })).items).toHaveLength(0)
  })

  it('arama sonucunda TASLAK makale DÖNMEZ', async () => {
    await makaleEkle({ slug: 'taslak-ihtar', durum: 'draft', arama: 'ihtarname gönderme usulü' })
    expect((await listPublishedArticles({ q: 'ihtarname' })).items).toHaveLength(0)
  })

  // Sözdizimi hatası fırlatmamalı; sonuç boş olabilir ama süreç ayakta kalmalı.
  it('yalnız özel karakterden oluşan arama süzgeci uygulamaz', async () => {
    await makaleEkle({ slug: 'tek' })
    expect((await listPublishedArticles({ q: '+*~()' })).items).toHaveLength(1)
  })
})

describe('listPublishedArticles — kategori süzgeci', () => {
  it('yalnız o kategorinin makalelerini döndürür', async () => {
    const kira = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    const aile = await kategoriEkle('aile-hukuku', 'Aile Hukuku')
    await makaleEkle({ slug: 'kira-1', kategoriId: kira })
    await makaleEkle({ slug: 'aile-1', kategoriId: aile })

    const sonuc = await listPublishedArticles({ categorySlug: 'kira-hukuku' })
    expect(sonuc.items.map((i) => i.slug)).toEqual(['kira-1'])
    expect(sonuc.total).toBe(1)
  })

  it('kategori süzgecinde de TASLAK DÖNMEZ', async () => {
    const kira = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    await makaleEkle({ slug: 'kira-taslak', durum: 'draft', kategoriId: kira })
    expect((await listPublishedArticles({ categorySlug: 'kira-hukuku' })).items).toHaveLength(0)
  })
})

describe('getPublishedArticleBySlug', () => {
  it('taslak makale için null döndürür — taslak adresi 404 olmalı', async () => {
    await makaleEkle({ slug: 'gizli-taslak', durum: 'draft' })
    expect(await getPublishedArticleBySlug('gizli-taslak')).toBeNull()
  })

  it('yayımlanmış makalenin yazarını ve kategorisini birlikte döndürür', async () => {
    const kategoriId = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    const [avukat] = await db.insert(lawyers).values({
      slug: 'tolga-akil', fullName: 'Tolga Akıl', title: 'Avukat', isPublished: true, sortOrder: 0,
    })
    await db.insert(articles).values({
      slug: 'kira-tespit', title: 'Kira Tespit Davası', excerpt: 'Özet metni burada duruyor.',
      content: '<p>Gövde.</p>', searchText: 'Gövde.', status: 'published',
      publishedAt: new Date(Date.UTC(2026, 0, 1)), categoryId: kategoriId, authorId: avukat.insertId,
    })

    const makale = await getPublishedArticleBySlug('kira-tespit')
    expect(makale?.authorName).toBe('Tolga Akıl')
    expect(makale?.authorSlug).toBe('tolga-akil')
    expect(makale?.categoryName).toBe('Kira Hukuku')
    expect(makale?.content).toBe('<p>Gövde.</p>')
    expect(makale?.updatedAt).toBeInstanceOf(Date)
  })

  it('olmayan slug için null döndürür', async () => {
    expect(await getPublishedArticleBySlug('yok-boyle-bir-sey')).toBeNull()
  })
})

describe('listLatestArticles / listArticleFeedEntries', () => {
  it('en yeniden eskiye sıralar ve sınırı aşmaz', async () => {
    for (const dakika of [1, 2, 3]) {
      await makaleEkle({ slug: `m-${dakika}`, yayin: new Date(Date.UTC(2026, 0, 1, 0, dakika)) })
    }
    expect((await listLatestArticles(2)).map((a) => a.slug)).toEqual(['m-3', 'm-2'])
  })

  it('listLatestArticles TASLAK DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'taslak', durum: 'draft' })
    expect(await listLatestArticles(5)).toHaveLength(0)
  })

  // Sessizce boş liste döndürmek yerine gürültü: çağıran kod hatası kullanıcıya "makale yok"
  // olarak görünmemeli.
  it('geçersiz limit ile çağrılırsa fırlatır', async () => {
    await expect(listLatestArticles(0)).rejects.toThrow()
  })

  it('listArticleFeedEntries yalnız yayımlanmışları verir', async () => {
    await makaleEkle({ slug: 'yayin', yayin: new Date(Date.UTC(2026, 0, 2)) })
    await makaleEkle({ slug: 'taslak', durum: 'draft' })
    expect((await listArticleFeedEntries()).map((a) => a.slug)).toEqual(['yayin'])
  })
})
