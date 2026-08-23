import { describe, expect, it } from 'vitest'
import { telHref, whatsappHref } from '@/lib/contact-links'

describe('telHref', () => {
  // Ayarlardaki telefon insan için biçimli yazılıyor; boşluklu hâli bazı çeviricilerde
  // hiç aranmıyor. Bu test biçimlemenin gerçekten söküldüğünü sabitler.
  it('boşluk ve parantezleri söker, artı işaretini korur', () => {
    expect(telHref('+90 216 000 00 00')).toBe('tel:+902160000000')
    expect(telHref('(0216) 000-00-00')).toBe('tel:02160000000')
  })

  it('baştaki artı yoksa uydurmaz', () => {
    expect(telHref('0216 000 00 00')).toBe('tel:02160000000')
  })
})

describe('whatsappHref', () => {
  // wa.me artı işaretini KABUL ETMEZ: yalnız ülke koduyla başlayan salt rakam ister.
  it('artı işaretini atar', () => {
    expect(whatsappHref('+90 532 000 00 00')).toBe('https://wa.me/905320000000')
  })
})

describe('whatsappHref ulusal biçim', () => {
  // Denetimde yakalanan hata: tohumdaki numara ulusal biçimdeydi (`0541 …`) ve üretilen
  // adres baştaki sıfırı taşıyordu; WhatsApp böyle bir adresi reddediyor. Testin eski tek
  // örneği zaten uluslararası biçimdeydi, bu yüzden hatayı hiç görmüyordu.
  it('baştaki sıfırı ülke koduyla değiştirir', () => {
    expect(whatsappHref('0541 643 50 55')).toBe('https://wa.me/905416435055')
  })

  it('zaten ülke kodlu numaraya dokunmaz', () => {
    expect(whatsappHref('+90 541 643 50 55')).toBe('https://wa.me/905416435055')
    expect(whatsappHref('90 541 643 50 55')).toBe('https://wa.me/905416435055')
  })
})
