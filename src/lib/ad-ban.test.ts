import { describe, expect, it } from 'vitest'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'

describe('findBannedPhrases', () => {
  it('yasaklı ifadeyi konumuyla birlikte döner', () => {
    const metin = 'Bu konuda uzman kadromuzla çalışıyoruz.'
    const [bulgu] = findBannedPhrases(metin)
    expect(bulgu.phrase).toBe('uzman')
    expect(metin.slice(bulgu.index, bulgu.index + 'uzman'.length)).toBe('uzman')
  })

  // Türkçe büyük harf katlaması tuzağı: 'İ'.toLowerCase() İKİ karakter üretir ve indeksleri
  // kaydırır. toLocaleLowerCase('tr') kullanılmazsa hem eşleşme kaçar hem de bulunan konum
  // özgün metinde başka bir yeri gösterir — aşağıdaki dilim iddiası bunu yakalar.
  it('Türkçe büyük harfli yazımda konum özgün metinle hizalı kalır', () => {
    const metin = 'BÖLGENİN EN İYİ BÜROSU olduğumuzu söylemiyoruz.'
    const [bulgu] = findBannedPhrases(metin)
    expect(bulgu.phrase).toBe('en iyi')
    expect(metin.slice(bulgu.index, bulgu.index + 'en iyi'.length)).toBe('EN İYİ')
  })

  it('aynı ifadenin her geçtiği yeri ayrı ayrı bildirir', () => {
    const bulgular = findBannedPhrases('ücret bilgisi ve ücret tarifesi')
    expect(bulgular.filter((b) => b.phrase === 'ücret')).toHaveLength(2)
  })

  it('bulguları metindeki sıraya göre döner', () => {
    const bulgular = findBannedPhrases('Ücretsiz görüşme sonrası %90 başarı oranı')
    expect(bulgular.map((b) => b.index)).toEqual([...bulgular.map((b) => b.index)].sort((a, b) => a - b))
  })

  it('temiz metinde boş dizi döner', () => {
    expect(findBannedPhrases('İşe iade davasında bir aylık süre koşulu.')).toEqual([])
  })
})

describe('formatBannedMatch', () => {
  it('ifadeyi, konumu ve bağlamı tek satırda gösterir', () => {
    const metin = 'Bu konuda uzman kadromuzla çalışıyoruz.'
    const satir = formatBannedMatch(findBannedPhrases(metin)[0])
    expect(satir).toContain('uzman')
    expect(satir).toContain('10. karakter')
    expect(satir).toContain('kadromuzla')
  })
})
