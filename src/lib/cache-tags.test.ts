import { describe, expect, it } from 'vitest'
import { TAGS, articleTag, pageTag } from '@/lib/cache-tags'

describe('önbellek etiketleri', () => {
  // Yazma tarafı revalidateTag'i, okuma tarafı cacheTag'i aynı dizeden alıyor. İki etiket
  // aynı değere düşerse bir bölümü tazelemek diğerini de sessizce düşürür; ters durumda
  // (elle yazılan bir dize) eşleşme hiç kurulmaz ve sayfa bayat kalır.
  it('sabit etiketlerin hepsi birbirinden farklı', () => {
    const degerler = Object.values(TAGS)
    expect(new Set(degerler).size).toBe(degerler.length)
  })

  it('sayfa metinleri için bir sabit etiket var', () => {
    expect(TAGS.pages).toBe('pages')
  })

  // Tekil sayfa, liste etiketinden bağımsız geçersizleştirilebilmeli: KVKK metnini
  // güncellemek /hakkimizda sayfasını da düşürmemeli.
  it('pageTag her slug için ayrı ve ön ekli etiket üretir', () => {
    expect(pageTag('kvkk')).toBe('page:kvkk')
    expect(pageTag('kvkk')).not.toBe(pageTag('hakkimizda'))
  })

  // İki ön ek çakışırsa 'article:kvkk' ile 'page:kvkk' aynı şeye düşerdi.
  it('makale ve sayfa etiketleri çakışmaz', () => {
    expect(pageTag('kvkk')).not.toBe(articleTag('kvkk'))
  })
})
