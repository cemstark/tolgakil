import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, closeDb } from '@/db/client'
import { PAGE_SLUGS, articles, isPageSlug, pages } from '@/db/schema'
import { getPage } from '@/db/queries/public/pages'
import { listPages, updatePageContent } from '@/db/queries/pages'

// Testler tek bir gerçek şemayı paylaşıyor; her test kendi zeminini sıfırdan kurar
// (src/db/schema.test.ts ile aynı desen).
beforeEach(async () => {
  await db.delete(pages)
})

// Havuz globalThis üzerinde önbelleklendi; çağrılmazsa Vitest çıkışta asılır.
afterAll(async () => {
  await db.delete(pages)
  await db.delete(articles)
  await closeDb()
})

async function sayfaEkle(slug: string, baslik: string, icerik: string) {
  await db.insert(pages).values({ slug, title: baslik, content: icerik })
}

describe('PAGE_SLUGS', () => {
  // Sabit satırlı tablo: yeni satır oluşturulamıyor, silinemiyor. Liste kod tarafında
  // sabit olmasaydı panel var olmayan bir slug'a düzenleme formu açardı.
  it('spec §4 ile istenen üç sayfayı sayar', () => {
    expect([...PAGE_SLUGS]).toEqual(['hakkimizda', 'kvkk', 'cerez-politikasi'])
  })

  // Adres çubuğundan gelen slug kullanıcı verisidir; tanınmayan değer forma dönüşmemeli.
  it('tanınmayan slug reddedilir', () => {
    expect(isPageSlug('kvkk')).toBe(true)
    expect(isPageSlug('uydurma')).toBe(false)
  })
})

describe('getPage', () => {
  it('var olan sayfanın başlığını ve içeriğini döndürür', async () => {
    await sayfaEkle('kvkk', 'KVKK Aydınlatma Metni', '<p>Yer tutucu.</p>')
    const sayfa = await getPage('kvkk')
    expect(sayfa?.title).toBe('KVKK Aydınlatma Metni')
    expect(sayfa?.content).toBe('<p>Yer tutucu.</p>')
    expect(sayfa?.updatedAt).toBeInstanceOf(Date)
  })

  // Tohum verisi eksikse sayfa 404 olmalı; boş bir kabuk basılmamalı.
  it('satırı olmayan slug için null döndürür', async () => {
    expect(await getPage('cerez-politikasi')).toBeNull()
  })

  it('Türkçe harfleri kayıpsız taşır', async () => {
    await sayfaEkle('hakkimizda', 'Hakkımızda', '<p>Büro çalışma şeklimiz.</p>')
    const sayfa = await getPage('hakkimizda')
    expect(sayfa?.title).toBe('Hakkımızda')
    expect(sayfa?.content).toBe('<p>Büro çalışma şeklimiz.</p>')
  })
})

describe('listPages / updatePageContent', () => {
  it('sayfaları PAGE_SLUGS sırasında listeler', async () => {
    await sayfaEkle('cerez-politikasi', 'Çerez Politikası', '<p>c</p>')
    await sayfaEkle('hakkimizda', 'Hakkımızda', '<p>h</p>')
    await sayfaEkle('kvkk', 'KVKK', '<p>k</p>')

    // Ekleme sırası kasten karışık: liste veritabanı sırasına değil, sabit listeye uymalı;
    // aksi hâlde panelde sayfaların yeri her kayıttan sonra değişirdi.
    expect((await listPages()).map((p) => p.slug)).toEqual(['hakkimizda', 'kvkk', 'cerez-politikasi'])
  })

  it('içeriği günceller, yeni satır AÇMAZ ve diğer sayfalara dokunmaz', async () => {
    await sayfaEkle('kvkk', 'KVKK', '<p>eski</p>')
    // İkinci satır ZORUNLU: tabloda tek satır varken kapsamı olmayan bir UPDATE de doğru
    // sonucu üretir ve test hiçbir şey iddia etmemiş olur (ölçüldü — `where` düşürüldüğünde
    // tek satırlı kurulum yeşil kalıyordu). Komşu satır, kapsamın gerçekten daraltıldığının
    // tek kanıtı.
    await sayfaEkle('hakkimizda', 'Hakkımızda', '<p>dokunulmadı</p>')

    await updatePageContent('kvkk', { title: 'KVKK Aydınlatma Metni', content: '<p>yeni</p>' })

    const satirlar = await db.select().from(pages).where(eq(pages.slug, 'kvkk'))
    expect(satirlar).toHaveLength(1)
    expect(satirlar[0].content).toBe('<p>yeni</p>')
    expect(satirlar[0].title).toBe('KVKK Aydınlatma Metni')

    const komsu = await db.select().from(pages).where(eq(pages.slug, 'hakkimizda'))
    expect(komsu[0].title).toBe('Hakkımızda')
    expect(komsu[0].content).toBe('<p>dokunulmadı</p>')
  })
})
