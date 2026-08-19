import { describe, expect, it } from 'vitest'
import { isCurrentPath } from './navigation'

describe('isCurrentPath', () => {
  it('tam eşleşmede etkin sayar', () => {
    expect(isCurrentPath('/kadro', '/kadro')).toBe(true)
  })

  it('alt sayfada üst bölümü etkin sayar', () => {
    expect(isCurrentPath('/kadro/tolga-akil', '/kadro')).toBe(true)
    expect(isCurrentPath('/panel/makaleler/yeni', '/panel/makaleler')).toBe(true)
  })

  it('başka bir bölümü etkin saymaz', () => {
    expect(isCurrentPath('/kadro', '/makaleler')).toBe(false)
  })

  // Sınır `/` ile çekilmezse /kadro öneki /kadrolar ile de eşleşir ve iki bölüm
  // aynı anda aria-current taşır.
  it('aynı önekle başlayan komşu bölümü etkin saymaz', () => {
    expect(isCurrentPath('/kadrolar', '/kadro')).toBe(false)
    expect(isCurrentPath('/panel/makaleler-arsivi', '/panel/makaleler')).toBe(false)
  })

  it('ana sayfa yüklemi diğer sayfalara taşmaz', () => {
    expect(isCurrentPath('/', '/')).toBe(true)
    expect(isCurrentPath('/kadro', '/')).toBe(false)
  })
})
