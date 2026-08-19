import { describe, it, expect } from 'vitest'
import { slugify, SLUG_MAX_LENGTH } from '@/lib/slug'

describe('slugify', () => {
  it('Türkçe büyük harfleri doğru indirger', () => {
    expect(slugify('İşe İade Davası')).toBe('ise-iade-davasi')
  })

  it('düzeltme işaretli harfleri sadeleştirir', () => {
    expect(slugify('Hukukî Görüş')).toBe('hukuki-gorus')
    expect(slugify('Kâzım Bey')).toBe('kazim-bey')
  })

  it('noktalama ve fazla boşluğu tek tireye çevirir', () => {
    expect(slugify('Şirketler Hukuku & Ortaklık')).toBe('sirketler-hukuku-ortaklik')
    expect(slugify('Çağrı   Merkezi')).toBe('cagri-merkezi')
  })

  it('baş ve sondaki tireleri kırpar', () => {
    expect(slugify('  --Ğüney Ofisi--  ')).toBe('guney-ofisi')
  })

  it('boş girdide boş döner', () => {
    expect(slugify('   ')).toBe('')
  })

  // slug sütunları varchar(190) (ölçüldü). Kesme olmazsa 220 karaktere kadar geçerli
  // bir başlık STRICT_TRANS_TABLES altında "Data too long" fırlatır, hata kullanıcıya
  // hata sayfası olarak döner ve yazdığı metin kaydedilemeden gider.
  it('190 karakterden uzun çıktıyı keser', () => {
    // 'ab-' deseni 299 karakterlik bir slug üretir ve 190. karakter harfe denk gelir.
    const uretilen = slugify('ab '.repeat(100))
    expect(uretilen).toHaveLength(SLUG_MAX_LENGTH)
  })

  it('kesme tam tireye denk gelirse sonda tire bırakmaz', () => {
    // 'kira-' beşer karakter; 190. karakter tam tire oluyor.
    const uretilen = slugify('kira '.repeat(60))
    expect(uretilen.endsWith('-')).toBe(false)
    expect(uretilen).toHaveLength(SLUG_MAX_LENGTH - 1)
  })

  it('sınırın altındaki çıktıya dokunmaz', () => {
    expect(slugify('Kira Tespit Davası')).toBe('kira-tespit-davasi')
  })
})
