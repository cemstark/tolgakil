import { z } from 'zod'
import { slugify } from '@/lib/slug'

// Özel mesaj verilmeyen kuralların (eksik alan, yanlış tip, bilinmeyen enum) varsayılan
// metinleri İngilizce üretiliyordu ve doğrudan kullanıcıya gidiyordu; global kısıt hata
// mesajlarının Türkçe olmasını şart koşuyor. Kendi verdiğimiz mesajlar bundan etkilenmez.
z.config(z.locales.tr())

export type FieldErrors = Record<string, string[]>
export type FormState = { ok: boolean; errors: FieldErrors; message?: string; warnings?: string[] }
export const EMPTY_FORM_STATE: FormState = { ok: false, errors: {} }

// Yalnız alana bağlanabilen hataları döndürür. Server action'lar bunu DEĞİL, aşağıdaki
// toFormState'i kullanır: path taşımayan hatalar burada görünmez.
export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors
}

// z.flattenError, path'i olmayan hataları (ör. gövdenin tümü beklenen biçimde değilse)
// formErrors'a koyar. Yalnız fieldErrors okunursa bu hatalar yutulur: kullanıcı "Kaydet"e
// basar, hiçbir alanda uyarı çıkmaz ve hiçbir şey olmaz. Alansız hatalar mesaja taşınıyor.
export function toFormState(error: z.ZodError): FormState {
  const flat = z.flattenError(error)
  const formErrors = flat.formErrors as string[]
  return {
    ok: false,
    errors: flat.fieldErrors as FieldErrors,
    message: formErrors.length > 0 ? formErrors.join(' ') : undefined,
  }
}

// Formdan gelen ilişki alanları daima metin taşır: "" seçim yapılmadı demek, sütun NULL bekler.
// Biçim, sayıya çevrilmeden ÖNCE denetleniyor: Number('3e2') sessizce 300, Number('-5')
// negatif bir kimlik üretir ve ikisi de Number.isInteger'dan geçer. Kimlikler autoincrement,
// yani yalnız pozitif tam sayı olabilir; aksi hâlde var olmayan satıra referans verilip
// kullanıcıya 500 dönerdi.
const optionalId = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[1-9]\d*$/.test(v), 'Geçersiz kayıt seçildi.')
  .transform((v) => (v === '' ? null : Number(v)))

// İşaretlenmemiş onay kutusu FormData'ya hiç girmez; bu yüzden alan optional ve yokluğu false.
// 'on' de kabul ediliyor: <input type="checkbox"> value yazılmazsa HTML varsayılanı olarak
// 'on' gönderir; yalnız 'evet' aransaydı kullanıcı kutuyu işaretler, "Kaydedildi" görür,
// kayıt yayına girmezdi — sessiz veri kaybı.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'evet' || v === 'on')

// Harita koordinatı boş bırakılabilir. Sütun varchar olduğu için (schema.ts) değer metin olarak
// geri veriliyor; yalnızca sayıya çevrilebilirliği doğrulanıyor.
const coordinate = z
  .string()
  .trim()
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Koordinat sayı olmalı.')
  .transform((v) => (v === '' ? null : v))

// Slug boşsa kaynak alandan üretilir; slugify her iki durumda da uygulanır ki elle girilen
// "Kira Tespit Davası" da geçerli bir adrese dönüşsün.
function resolveSlug(slug: string, source: string): string {
  return slugify(slug === '' ? source : slug)
}

// slugify yalnızca noktalama içeren girdide boş string döner (Plan 1 borcu): boş slug rota
// üretemez, kullanıcıya söylenmeden kaydedilemez. Kaynak alanın adı çağıranca veriliyor;
// avukat formunda "Başlıktan" demek kullanıcıyı var olmayan bir alana yönlendirirdi.
function requireSlug(slug: string, sourcePhrase: string, ctx: z.RefinementCtx): void {
  if (slug === '') {
    ctx.addIssue({
      code: 'custom',
      path: ['slug'],
      message: `${sourcePhrase} adres üretilemedi; slug alanını elle doldurun.`,
    })
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
    requireSlug(v.slug, 'Başlıktan', ctx)
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
  .superRefine((v, ctx) => requireSlug(v.slug, 'Ad soyad alanından', ctx))

export const practiceAreaSchema = z
  .object({
    slug: z.string().trim(),
    name: z.string().trim().min(3, 'Alan adı en az 3 karakter olmalı.').max(160, 'Alan adı en fazla 160 karakter olabilir.'),
    summary: z.string().trim().min(20, 'Özet en az 20 karakter olmalı.').max(400, 'Özet en fazla 400 karakter olabilir.'),
    isPublished: checkbox,
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.name) }))
  .superRefine((v, ctx) => requireSlug(v.slug, 'Alan adından', ctx))

export const categorySchema = z
  .object({
    slug: z.string().trim(),
    name: z.string().trim().min(2, 'Kategori adı en az 2 karakter olmalı.').max(160, 'Kategori adı en fazla 160 karakter olabilir.'),
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.name) }))
  .superRefine((v, ctx) => requireSlug(v.slug, 'Kategori adından', ctx))

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
