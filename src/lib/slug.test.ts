import { describe, it, expect } from 'vitest'
import { slugify } from '@/lib/slug'

describe('slugify', () => {
  it('Türkçe büyük harfleri doğru indirger', () => {
    expect(slugify('İşe İade Davası')).toBe('ise-iade-davasi')
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
})
