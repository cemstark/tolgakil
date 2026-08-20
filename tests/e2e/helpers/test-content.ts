import { randomBytes } from 'node:crypto'
import { temizlikciAc } from './db-cleanup'

export type TestIcerigi = {
  /** Başlıklara eklenen benzersiz ek; temizlik bu ekle eşleşen makaleleri siler. */
  damga: string
  /** Kategori seçicisinde aranacak görünen ad. */
  kategoriAdi: string
  temizle: () => Promise<void>
}

// Makale testleri kendi kategorisini üretir; tohumlanmış kategorilerin durduğu VARSAYILMIYOR.
// Ölçüldü: src/db/schema.test.ts her testten önce categories tablosunu boşaltıyor. Aynı
// boşaltma yarın geliştirme veritabanına da uygulanırsa, tohuma bel bağlayan bir e2e testi
// "Kira Hukuku seçeneği yok" diye anlaşılmaz biçimde kırılırdı.
export async function testIcerigiHazirla(): Promise<TestIcerigi> {
  const damga = `e2e${randomBytes(5).toString('hex')}`
  const kategoriAdi = `E2E Kategori ${damga}`
  const kategoriSlug = `e2e-kategori-${damga}`
  // Bağlantı ve DATABASE_URL okuması ortak sözleşmede (db-cleanup.ts): ham execute
  // kullanan bir temizlik, hiçbir satır silmediğinde bunu sessizce yutuyordu.
  const temizlikci = await temizlikciAc()

  await temizlikci.calistir('INSERT INTO categories (slug, name) VALUES (?, ?)', [kategoriSlug, kategoriAdi])

  return {
    damga,
    kategoriAdi,
    async temizle() {
      try {
        // Sıra zorunlu: articles.category_id kısıtı ON DELETE RESTRICT, önce makaleler gider.
        //
        // `silmeyeCalis`, `sil` DEĞİL: testlerin çoğu makalesini zaten arayüzden siliyor,
        // yani sıfır satır burada normal. Kategori ise her koşumda kurulduğu için `sil`
        // ile korunuyor — hiç eşleşmemesi sorgunun bayatladığı anlamına gelir.
        await temizlikci.silmeyeCalis('DELETE FROM articles WHERE title LIKE ?', [`%${damga}%`])
        await temizlikci.sil('DELETE FROM categories WHERE slug = ?', [kategoriSlug])
      } finally {
        // Bağlantı her durumda kapanmalı: silme fırlatırsa açık kalan bağlantı süiti
        // çıkışta askıda bırakır ve asıl hatayı örter.
        await temizlikci.kapat()
      }
    },
  }
}
