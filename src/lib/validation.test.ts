import { describe, expect, it } from 'vitest'
import {
  articleSchema, categorySchema, lawyerSchema, loginSchema, toFieldErrors, toFormState,
  userCreateSchema, userUpdateSchema,
} from '@/lib/validation'

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

  // Kimlikler autoincrement; negatif veya üstel gösterimli değer var olmayan satıra
  // referans üretip kullanıcıya 500 gösterirdi.
  it('negatif ve üstel gösterimli kimliği reddeder', () => {
    for (const categoryId of ['-5', '3e2', '1.5']) {
      const sonuc = articleSchema.safeParse({ ...gecerliMakale, categoryId })
      expect(sonuc.success, `categoryId=${categoryId} kabul edilmemeliydi`).toBe(false)
    }
  })
})

describe('slug üretilemediğinde gösterilen alan adı', () => {
  it('avukat formunda "ad soyad" alanını işaret eder', () => {
    const sonuc = lawyerSchema.safeParse({ slug: '', fullName: '!!! ???', title: 'Avukat' })
    expect(toFieldErrors(sonuc.error!).slug).toContain(
      'Ad soyad alanından adres üretilemedi; slug alanını elle doldurun.',
    )
  })

  it('kategori formunda "kategori adı" alanını işaret eder', () => {
    const sonuc = categorySchema.safeParse({ slug: '', name: '!!! ???' })
    expect(toFieldErrors(sonuc.error!).slug).toContain(
      'Kategori adından adres üretilemedi; slug alanını elle doldurun.',
    )
  })
})

describe('onay kutusu', () => {
  // <input type="checkbox"> value yazılmazsa tarayıcı 'on' gönderir; yalnız 'evet' aransaydı
  // kullanıcı kutuyu işaretler, "Kaydedildi" görür ama kayıt yayına girmezdi.
  it('tarayıcının varsayılan "on" değerini de işaretli sayar', () => {
    expect(lawyerSchema.safeParse({ slug: '', fullName: 'Tolga Akıl', title: 'Avukat', isPublished: 'on' }).data?.isPublished).toBe(true)
    expect(lawyerSchema.safeParse({ slug: '', fullName: 'Tolga Akıl', title: 'Avukat', isPublished: 'evet' }).data?.isPublished).toBe(true)
  })

  it('alan hiç gönderilmezse işaretsiz sayar', () => {
    expect(userUpdateSchema.safeParse({ role: 'editor', password: '' }).data?.isActive).toBe(false)
  })
})

describe('hata mesajları', () => {
  // Global kısıt: kullanıcıya giden her mesaj Türkçe. Özel mesaj verilmeyen kurallarda
  // (eksik alan, bilinmeyen enum) zod'un varsayılanı İngilizce üretiyordu.
  it('özel mesaj verilmeyen kurallarda da Türkçe döner', () => {
    const eksikAlan = loginSchema.safeParse({})
    const bilinmeyenRol = userCreateSchema.safeParse({
      email: 'yeni@ornek.test', name: 'Yeni Kullanıcı', password: 'yeterince-uzun-parola', role: 'superadmin',
    })
    const mesajlar = [...eksikAlan.error!.issues, ...bilinmeyenRol.error!.issues].map((i) => i.message)
    expect(mesajlar.length).toBeGreaterThan(0)
    for (const mesaj of mesajlar) {
      expect(mesaj, `İngilizce mesaj sızdı: ${mesaj}`).not.toMatch(/Invalid|expected|received/)
    }
  })

  // toFieldErrors yalnız alana bağlı hataları görür; path'siz hatalar orada kaybolur.
  it('alana bağlanamayan hata yutulmaz, mesaja taşınır', () => {
    const sonuc = articleSchema.safeParse('form verisi değil')
    expect(toFieldErrors(sonuc.error!)).toEqual({})
    expect(toFormState(sonuc.error!).message).toBeTruthy()
    expect(toFormState(sonuc.error!).ok).toBe(false)
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
