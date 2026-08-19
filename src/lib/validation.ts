import { z } from 'zod'
import { slugify } from '@/lib/slug'

export type FieldErrors = Record<string, string[]>
export type FormState = { ok: boolean; errors: FieldErrors; message?: string; warnings?: string[] }
export const EMPTY_FORM_STATE: FormState = { ok: false, errors: {} }

export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors
}

// Formdan gelen ilişki alanları daima metin taşır: "" seçim yapılmadı demek, sütun NULL bekler.
const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || Number.isInteger(v), 'Geçersiz kayıt seçildi.')

// İşaretlenmemiş onay kutusu FormData'ya hiç girmez; bu yüzden alan optional ve yokluğu false.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'evet')

// Harita koordinatı boş bırakılabilir. Sütun varchar olduğu için (schema.ts) değer metin olarak
// geri veriliyor; yalnızca sayıya çevrilebilirliği doğrulanıyor.
const coordinate = z
  .string()
  .trim()
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Koordinat sayı olmalı.')
  .transform((v) => (v === '' ? null : v))

const SLUG_EMPTY_MESSAGE = 'Başlıktan adres üretilemedi; slug alanını elle doldurun.'

// Slug boşsa kaynak alandan üretilir; slugify her iki durumda da uygulanır ki elle girilen
// "Kira Tespit Davası" da geçerli bir adrese dönüşsün.
function resolveSlug(slug: string, source: string): string {
  return slugify(slug === '' ? source : slug)
}

// slugify yalnızca noktalama içeren girdide boş string döner (Plan 1 borcu): boş slug rota
// üretemez, kullanıcıya söylenmeden kaydedilemez.
function requireSlug(slug: string, ctx: z.RefinementCtx): void {
  if (slug === '') {
    ctx.addIssue({ code: 'custom', path: ['slug'], message: SLUG_EMPTY_MESSAGE })
  }
}

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Parola zorunlu.'),
})

export const articleSchema = z
  .object({
    title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalı.').max(220, 'Başlık en fazla 220 karakter olabilir.'),
    slug: z.string().trim(),
    excerpt: z.string().trim().min(20, 'Özet en az 20 karakter olmalı.').max(400, 'Özet en fazla 400 karakter olabilir.'),
    content: z.string().trim().min(1, 'İçerik boş olamaz.'),
    status: z.enum(['draft', 'published']),
    categoryId: optionalId,
    authorId: optionalId,
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.title) }))
  .superRefine((v, ctx) => {
    requireSlug(v.slug, ctx)
    // Yayımlanan makale kategori sayfasından erişilebilir olmalı; taslakta bu zorunluluk yok.
    if (v.status === 'published' && v.categoryId === null) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Yayımlamak için kategori seçin.' })
    }
  })

export const lawyerSchema = z
  .object({
    slug: z.string().trim(),
    fullName: z.string().trim().min(3, 'Ad soyad en az 3 karakter olmalı.').max(160, 'Ad soyad en fazla 160 karakter olabilir.'),
    title: z.string().trim().min(2, 'Unvan en az 2 karakter olmalı.').max(120, 'Unvan en fazla 120 karakter olabilir.'),
    isPublished: checkbox,
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.fullName) }))
  .superRefine((v, ctx) => requireSlug(v.slug, ctx))

export const practiceAreaSchema = z
  .object({
    slug: z.string().trim(),
    name: z.string().trim().min(3, 'Alan adı en az 3 karakter olmalı.').max(160, 'Alan adı en fazla 160 karakter olabilir.'),
    summary: z.string().trim().min(20, 'Özet en az 20 karakter olmalı.').max(400, 'Özet en fazla 400 karakter olabilir.'),
    isPublished: checkbox,
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.name) }))
  .superRefine((v, ctx) => requireSlug(v.slug, ctx))

export const categorySchema = z
  .object({
    slug: z.string().trim(),
    name: z.string().trim().min(2, 'Kategori adı en az 2 karakter olmalı.').max(160, 'Kategori adı en fazla 160 karakter olabilir.'),
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.name) }))
  .superRefine((v, ctx) => requireSlug(v.slug, ctx))

export const settingsSchema = z.object({
  officeName: z.string().trim().min(2, 'Büro adı en az 2 karakter olmalı.').max(160, 'Büro adı en fazla 160 karakter olabilir.'),
  address: z.string().trim().min(10, 'Adres en az 10 karakter olmalı.').max(400, 'Adres en fazla 400 karakter olabilir.'),
  phone: z.string().trim().min(7, 'Telefon numarası en az 7 karakter olmalı.').max(40, 'Telefon numarası en fazla 40 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.'),
  mapLat: coordinate,
  mapLng: coordinate,
})

export const mediaSchema = z.object({
  // spec §8: alt metin panelde zorunlu — ekran okuyucu için görselin ne gösterdiği yazılmalı.
  altText: z
    .string()
    .trim()
    .min(3, 'Alt metin zorunlu — görselin ne gösterdiğini yazın.')
    .max(255, 'Alt metin en fazla 255 karakter olabilir.'),
})

export const userCreateSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
  name: z.string().trim().min(2, 'Ad en az 2 karakter olmalı.').max(120, 'Ad en fazla 120 karakter olabilir.'),
  password: z.string().min(12, 'Parola en az 12 karakter olmalı.'),
  role: z.enum(['admin', 'editor']),
})

export const userUpdateSchema = z.object({
  role: z.enum(['admin', 'editor']),
  isActive: checkbox,
  // Boş bırakılırsa parola değişmez; doldurulursa aynı asgari uzunluk kuralı geçerli.
  password: z.string().refine((v) => v === '' || v.length >= 12, 'Parola en az 12 karakter olmalı.'),
})
