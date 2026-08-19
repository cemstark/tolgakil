import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '@/lib/date'

describe('formatDate', () => {
  it('ISO tarihi Türkçe uzun biçime çevirir', () => {
    expect(formatDate('2026-08-12')).toBe('12 Ağustos 2026')
  })

  // timeZone: 'UTC' sabitlemesi düşerse negatif ofsetli bir makinede 01 Ağustos'a kayar.
  it('ayın ilk günü bir gün geriye kaymaz', () => {
    expect(formatDate('2026-08-01')).toBe('01 Ağustos 2026')
  })
})

describe('formatDateTime', () => {
  // Testler TZ=America/New_York altında koşuyor (vitest.config.mts), yani hem sunucu
  // dilimine düşen hem UTC'ye düşen bir gerçekleme bu iddiayı geçemez.
  it('UTC damgasını İstanbul saatiyle basar', () => {
    expect(formatDateTime(new Date('2026-08-19T11:05:00Z'))).toBe('19 Ağustos 2026 14:05')
  })

  // Gün sınırı, dilimin gerçekten uygulandığını gösteren en keskin durum: UTC'de 18
  // Ağustos'un son dakikası İstanbul'da 19 Ağustos.
  it('gün sınırında tarihi de kaydırır', () => {
    expect(formatDateTime(new Date('2026-08-18T22:30:00Z'))).toBe('19 Ağustos 2026 01:30')
  })
})
