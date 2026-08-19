import { describe, expect, it } from 'vitest'
import { formatDate } from '@/lib/date'

describe('formatDate', () => {
  it('ISO tarihi Türkçe uzun biçime çevirir', () => {
    expect(formatDate('2026-08-12')).toBe('12 Ağustos 2026')
  })

  // timeZone: 'UTC' sabitlemesi düşerse negatif ofsetli bir makinede 01 Ağustos'a kayar.
  it('ayın ilk günü bir gün geriye kaymaz', () => {
    expect(formatDate('2026-08-01')).toBe('01 Ağustos 2026')
  })
})
