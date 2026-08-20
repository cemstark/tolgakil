import { describe, expect, it } from 'vitest'
import { canAccess } from '@/lib/permissions'

describe('canAccess', () => {
  it('editor makale ve medya yönetir', () => {
    expect(canAccess('editor', 'articles')).toBe(true)
    expect(canAccess('editor', 'media')).toBe(true)
  })

  // Spec §3: kadro, alanlar, kategoriler, ayarlar, mesajlar ve kullanıcılar admin'e ait.
  it.each(['lawyers', 'practiceAreas', 'categories', 'settings', 'messages', 'users', 'pages'] as const)(
    'editor %s kaynağına erişemez',
    (resource) => {
      expect(canAccess('editor', resource)).toBe(false)
    },
  )

  it.each(['articles', 'media', 'lawyers', 'practiceAreas', 'categories', 'settings', 'messages', 'users', 'pages'] as const)(
    'admin %s kaynağına erişir',
    (resource) => {
      expect(canAccess('admin', resource)).toBe(true)
    },
  )
})
