import { describe, expect, it } from 'vitest'
import { articleSchema, loginSchema, toFieldErrors, userCreateSchema } from '@/lib/validation'

const gecerliMakale = {
  title: 'İşe iade davasında süre koşulu',
  slug: '',
  excerpt: 'Bir aylık hak düşürücü süre üzerine not.',
  content: '<p>Gövde</p>',
  status: 'draft' as const,
  categoryId: '3',
  authorId: '',
}

describe('articleSchema', () => {
  it('boş slug alanını başlıktan üretir', () => {
    const sonuc = articleSchema.safeParse(gecerliMakale)
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.slug).toBe('ise-iade-davasinda-sure-kosulu')
  })

  it('slugify boş dönerse başlığı reddeder', () => {
    // "!!! ???" slugify'dan boş string döner; boş slug rota üretemez (Plan 1 borcu).
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, title: '!!! ???' })
    expect(sonuc.success).toBe(false)
    expect(toFieldErrors(sonuc.error!).slug).toContain(
      'Başlıktan adres üretilemedi; slug alanını elle doldurun.',
    )
  })

  it('elle girilen slug da normalize edilir', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, slug: 'Kira Tespit Davası' })
    expect(sonuc.data?.slug).toBe('kira-tespit-davasi')
  })

  it('yayımlanacak makalede kategori zorunlu', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, status: 'published', categoryId: '' })
    expect(sonuc.success).toBe(false)
    expect(toFieldErrors(sonuc.error!).categoryId).toContain('Yayımlamak için kategori seçin.')
  })

  it('taslakta kategori boş bırakılabilir', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, categoryId: '' })
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.categoryId).toBeNull()
  })
})

describe('loginSchema', () => {
  it('geçersiz e-postayı Türkçe mesajla reddeder', () => {
    const sonuc = loginSchema.safeParse({ email: 'yok', password: 'parola-uzun-1' })
    expect(toFieldErrors(sonuc.error!).email).toContain('Geçerli bir e-posta adresi girin.')
  })

  it('boş parolayı reddeder', () => {
    const sonuc = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(toFieldErrors(sonuc.error!).password).toContain('Parola zorunlu.')
  })
})

describe('userCreateSchema', () => {
  it('kısa parolayı reddeder', () => {
    const sonuc = userCreateSchema.safeParse({
      email: 'yeni@ornek.test', name: 'Yeni Kullanıcı', password: 'kisa', role: 'editor',
    })
    expect(toFieldErrors(sonuc.error!).password).toContain('Parola en az 12 karakter olmalı.')
  })

  it('bilinmeyen rolü reddeder', () => {
    const sonuc = userCreateSchema.safeParse({
      email: 'yeni@ornek.test', name: 'Yeni Kullanıcı', password: 'yeterince-uzun-parola', role: 'superadmin',
    })
    expect(sonuc.success).toBe(false)
  })
})
