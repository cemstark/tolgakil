import { z } from 'zod'
import { slugify } from '@/lib/slug'
import { USERNAME_ERROR, USERNAME_PATTERN } from '@/lib/username'

// Özel mesaj verilmeyen kuralların (eksik alan, yanlış tip, bilinmeyen enum) varsayılan
// metinleri İngilizce üretiliyordu ve doğrudan kullanıcıya gidiyordu; global kısıt hata
// mesajlarının Türkçe olmasını şart koşuyor. Kendi verdiğimiz mesajlar bundan etkilenmez.
z.config(z.locales.tr())

export type FieldErrors = Record<string, string[]>
/**
 * `values` YALNIZ halka açık iletişim formu tarafından kullanılıyor ve isteğe bağlı.
 *
 * Gerekçe: React 19'da `<form action={fn}>` ile gönderilen KONTROLSÜZ form, eylem
 * çalıştırılmadan önce otomatik sıfırlanıyor (react-dom kaynağında `requestFormReset`).
 * Panel formları kontrollü olduğu için (`useEntityValues`) bundan etkilenmiyor; iletişim
 * formu ilk sürümde kontrolsüzdü ve doğrulama hatasında ziyaretçinin yazdığı HER ŞEY
 * siliniyordu — 2000 karakter yazıp onay kutusunu unutan kullanıcı baştan başlıyordu.
 * Değerler eylemden geri taşınıp forma yeniden yazılıyor.
 */
export type FormState = {
  ok: boolean
  errors: FieldErrors
  message?: string
  warnings?: string[]
  values?: Record<string, string>
}

// Başlangıç durumu için bir sabit DIŞA AKTARILMIYOR: istemci bileşenleri bu modülden yalnız
// TİP alabiliyor. Değer olarak import edilen tek bir sabit bile modülü istemci paketine
// çeker ve modül seviyesindeki z.config(z.locales.tr()) yan etkisi tree-shaking'i kapatır —
// ölçüldü (Görev 3): zod ve bütün panel şemaları istemci paketine giriyordu (289 KB).
// Bileşenler kendi { ok: false, errors: {} } sabitlerini tanımlıyor.

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

// İşaretlenmemiş onay kutusu FormData'ya hiç girmez; bu yüzden alan isteğe bağlı ve yokluğu
// false. `nullish` ZORUNLU, yalnız `optional` DEĞİL: `FormData.get()` bulunmayan alan için
// `undefined` değil **null** döndürüyor. Yalnız optional yazıldığında (Görev 1) kutuyu
// işaretlemeden kaydeden kullanıcı, hiçbir alana bağlanamayan bir "beklenen string" hatası
// alıyordu — ekranda hiçbir şey görünmüyor, kayıt da yapılmıyordu. Görev 7'de ölçüldü:
// kadro formunun ilk gönderimi bu yüzden sessizce düşüyordu.
//
// 'on' de kabul ediliyor: <input type="checkbox"> value yazılmazsa HTML varsayılanı olarak
// 'on' gönderir; yalnız 'evet' aransaydı kullanıcı kutuyu işaretler, "Kaydedildi" görür,
// kayıt yayına girmezdi — sessiz veri kaybı.
const checkbox = z
  .string()
  .nullish()
  .transform((v) => v === 'evet' || v === 'on')

// Harita koordinatı boş bırakılabilir. Sütun varchar olduğu için (schema.ts) değer metin olarak
// geri veriliyor; yalnızca sayıya çevrilebilirliği doğrulanıyor.
// `nullish`: FormData.get() gönderilmeyen alan için null döndürüyor (bkz. checkbox).
const coordinate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v ?? '')
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Koordinat sayı olmalı.')
  .transform((v) => (v === '' ? null : v))

// Panel formları alanı boş bırakılsa bile FormData'ya "" olarak koyar; sütunlar ise NULL
// bekliyor. `.nullish()` ayrıca alanın hiç gönderilmediği durumu da karşılıyor: yeni bir
// alan eklendiğinde açık duran eski bir sekme, kullanıcının hiç görmediği bir alan için
// "Beklenen dize" hatası almasın (settingsSchema.mapLat'ta yaşanan tuzağın ta kendisi).
// `optional` DEĞİL `nullish`: FormData.get() bulunmayan alan için null döndürüyor (bkz. checkbox).
function optionalText(max: number, alanAdi: string) {
  return z
    .string()
    .trim()
    .max(max, `${alanAdi} en fazla ${max} karakter olabilir.`)
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v))
}

// Boş bırakılabilen e-posta. z.email() boş dizeyi reddettiği için önce boşluk elenip
// sonra biçim denetleniyor.
const optionalEmail = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === undefined || v === null || v === '' ? null : v))
  .refine((v) => v === null || z.email().safeParse(v).success, 'Geçerli bir e-posta adresi girin.')

// <input type="date"> daima "YYYY-MM-DD" gönderir ve sütun (mode: 'string') tam olarak bunu
// saklıyor; dönüşüm yok, dolayısıyla dilim kayması da yok. Takvimsel geçerlilik ayrıca
// denetleniyor: "2026-02-31" desene uyar ama böyle bir gün yoktur ve MariaDB
// STRICT_TRANS_TABLES altında satırı reddeder — kullanıcı hata sayfası görürdü.
const optionalIsoDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === undefined || v === null || v === '' ? null : v))
  .refine((v) => v === null || isTakvimGunu(v), 'Tarihi GG.AA.YYYY takvim günü olarak seçin.')

function isTakvimGunu(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

// Sıra alanı sütunda NOT NULL DEFAULT 0; boş bırakmak "sıralama verilmedi" demek.
// Negatif ve ondalık değerler eleniyor: sütun int ve sıra bir sayaç, ölçü değil.
const sortOrder = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v ?? '')
  .refine((v) => v === '' || /^\d{1,4}$/.test(v), 'Sıra 0 ile 9999 arasında bir tam sayı olmalı.')
  .transform((v) => (v === '' ? 0 : Number(v)))

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

// Rota segmentiyle çakışan slug'lar. Liste TAM EŞLEŞME ile karşılaştırılır: "kategoriler"
// gibi yalnızca benzeyen bir slug'ın çakışması yok, onu da yasaklamak içerik kaybettirir.
export const RESERVED_ARTICLE_SLUGS = ['kategori'] as const

function rejectReservedSlug(slug: string, ctx: z.RefinementCtx): void {
  if ((RESERVED_ARTICLE_SLUGS as readonly string[]).includes(slug)) {
    ctx.addIssue({
      code: 'custom',
      path: ['slug'],
      // Neden yasak olduğu yazılıyor: kullanıcı keyfî bir kısıt değil, adres çakışması
      // gördüğünü anlasın ve başka bir slug seçsin.
      message: 'Bu adres kategori arşivi için ayrılmıştır; başka bir slug yazın.',
    })
  }
}

/**
 * Kullanıcı adı alanı. Biçim kuralı ve ASCII kısıtının gerekçesi lib/username.ts'te.
 *
 * `.trim()` var, `.toLowerCase()` YOK ve bu bilinçli: büyük harf sessizce düzeltilseydi
 * "Admin" ile "admin" aynı hesabı gösterir, kullanıcı da kaydettiği adın ne olduğunu
 * ekranda göremezdi. Kural yerine geçen bir sessiz dönüşüm yerine görünür bir hata
 * veriliyor — hata metni neyin kabul edildiğini söylüyor.
 */
const usernameField = z.string().trim().regex(USERNAME_PATTERN, USERNAME_ERROR)

export const loginSchema = z.object({
  username: usernameField,
  password: z.string().min(1, 'Parola zorunlu.'),
})

// articles.content sütunu TEXT: 65.535 BAYT (information_schema'dan ölçüldü).
// Sınır KARAKTER değil BAYT: Türkçe harfler UTF-8'de iki bayt tutuyor, yani karakter
// sayan bir kontrol "ş" dolu bir makaleyi geçirir, veritabanı ise STRICT_TRANS_TABLES
// altında "Data too long" fırlatır. Fırlatma buradaki asıl zarar değil — hata sunucu
// sınırına düşer, kullanıcı hata sayfası görür ve saatlerce yazdığı metin taslak olarak
// bile kaydedilemeden gider.
//
// Denetim articleSchema'nın İÇİNDE DEĞİL, kasıtlı olarak dışında: sütuna yazılan dize
// ham girdi değil, sanitizeArticleHtml'den geçmiş hâlidir. Temizleme hem küçültüyor
// (script atılıyor) hem büyütüyor (bağlantılara rel ekleniyor); ham girdiyi ölçen bir
// kural yanlış tarafa düşer. Bu yüzden server action temizlenmiş çıktıyı ölçüyor.
export const ARTICLE_CONTENT_MAX_BYTES = 65_535

// TextEncoder, Buffer'a tercih edildi: bu modül istemci bileşenlerince (yalnız tip olarak
// da olsa) import ediliyor, Node'a özgü bir küresel eklemek o sınırı bulanıklaştırır.
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

/**
 * Sınırı aşıyorsa Türkçe alan hatası, aşmıyorsa null.
 *
 * Aynı denetim avukat özgeçmişi ve çalışma alanı içeriği için de gerekli (Görev 7): üçü de
 * TEXT sütunu ve üçü de zengin metin editöründen besleniyor. Alan adı çağırandan geliyor ki
 * kullanıcı hatanın hangi kutuyu işaret ettiğini bilsin.
 */
export function textColumnLengthError(value: string, alanAdi: string): string | null {
  const bytes = byteLength(value)
  if (bytes <= ARTICLE_CONTENT_MAX_BYTES) return null
  return `${alanAdi} çok uzun: en fazla ${ARTICLE_CONTENT_MAX_BYTES} bayt olabilir, şu an ${bytes} bayt. Yazıyı bölün veya kısaltın.`
}

export function articleContentLengthError(content: string): string | null {
  return textColumnLengthError(content, 'İçerik')
}

export const articleSchema = z
  .object({
    title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalı.').max(220, 'Başlık en fazla 220 karakter olabilir.'),
    slug: z.string().trim(),
    excerpt: z.string().trim().min(20, 'Özet en az 20 karakter olmalı.').max(400, 'Özet en fazla 400 karakter olabilir.'),
    content: z.string().trim().min(1, 'İçerik boş olamaz.'),
    status: z.enum(['draft', 'published']),
    categoryId: optionalId,
    // Çalışma alanı bağı İSTEĞE BAĞLI, yayımda bile: kategori yazının yayın rafı ve
    // yayımlamak için zorunlu, bu ise konu bağı. Genel bilgilendirme yazılarının hiçbir
    // alana ait olmaması meşru bir durum.
    practiceAreaId: optionalId,
    authorId: optionalId,
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.title) }))
  .superRefine((v, ctx) => {
    requireSlug(v.slug, 'Başlıktan', ctx)
    rejectReservedSlug(v.slug, ctx)
    // Yayımlanan makale kategori sayfasından erişilebilir olmalı; taslakta bu zorunluluk yok.
    if (v.status === 'published' && v.categoryId === null) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Yayımlamak için kategori seçin.' })
    }
  })

// Zorunlu alanlar yalnız ad soyad ve unvan. Mevzuatın saydığı diğer alanlar (baro, sicil
// numaraları, mesleğe başlama tarihi, üniversite, diller) isteğe bağlı: büro bu bilgileri
// kademeli olarak dolduruyor ve eksik bir sicil numarası kaydı bloke etmemeli.
export const lawyerSchema = z
  .object({
    slug: z.string().trim(),
    fullName: z.string().trim().min(3, 'Ad soyad en az 3 karakter olmalı.').max(160, 'Ad soyad en fazla 160 karakter olabilir.'),
    title: z.string().trim().min(2, 'Unvan en az 2 karakter olmalı.').max(120, 'Unvan en fazla 120 karakter olabilir.'),
    barAssociation: optionalText(120, 'Baro'),
    barRegistryNo: optionalText(40, 'Baro sicil no'),
    tbbRegistryNo: optionalText(40, 'TBB sicil no'),
    practiceStartDate: optionalIsoDate,
    university: optionalText(160, 'Üniversite'),
    languages: optionalText(255, 'Diller'),
    email: optionalEmail,
    sortOrder,
    isPublished: checkbox,
  })
  .transform((v) => ({ ...v, slug: resolveSlug(v.slug, v.fullName) }))
  .superRefine((v, ctx) => requireSlug(v.slug, 'Ad soyad alanından', ctx))

export const practiceAreaSchema = z
  .object({
    slug: z.string().trim(),
    name: z.string().trim().min(3, 'Alan adı en az 3 karakter olmalı.').max(160, 'Alan adı en fazla 160 karakter olabilir.'),
    summary: z.string().trim().min(20, 'Özet en az 20 karakter olmalı.').max(400, 'Özet en fazla 400 karakter olabilir.'),
    sortOrder,
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

// Slug ŞEMADA YOK: sabit satırlı tabloda slug kullanıcı girdisi değil, rota parametresi.
// Server action onu isPageSlug ile daraltıyor; şemaya konsaydı "uydurma" bir slug şemadan
// geçer ve UPDATE hiçbir satırı etkilemeden "kaydedildi" denirdi.
export const pageSchema = z.object({
  title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalı.').max(220, 'Başlık en fazla 220 karakter olabilir.'),
})

// mapLat/mapLng zorunlu bir ANAHTAR (değer boş bırakılabilir) ve bu bilinçli: ayarlar
// formunun tek çağıran olduğu ve formun bu alanları GERÇEKTEN çizdiği için şemayı
// gevşetmeye gerek yok. Aynı gerekçeyle whatsapp/kep/sosyal/alt bilgi alanları da burada:
// sütunları var, tohum verisi dolduruyor ve panelden düzenlenemeselerdi büro alt bilgi
// metnini hiçbir yerden değiştiremezdi.
export const settingsSchema = z.object({
  officeName: z.string().trim().min(2, 'Büro adı en az 2 karakter olmalı.').max(160, 'Büro adı en fazla 160 karakter olabilir.'),
  address: z.string().trim().min(10, 'Adres en az 10 karakter olmalı.').max(400, 'Adres en fazla 400 karakter olabilir.'),
  phone: z.string().trim().min(7, 'Telefon numarası en az 7 karakter olmalı.').max(40, 'Telefon numarası en fazla 40 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.'),
  // İkinci telefon ve çalışma saatleri isteğe bağlı: her büronun ikinci hattı yoktur ve
  // saatlerini yayımlamak istemeyebilir. Boş bırakıldıklarında ekranda hiç çizilmiyorlar.
  phoneSecondary: optionalText(40, 'İkinci telefon numarası'),
  workingHours: optionalText(200, 'Çalışma saatleri'),
  whatsapp: optionalText(40, 'WhatsApp numarası'),
  kep: optionalText(190, 'KEP adresi'),
  mapLat: coordinate,
  mapLng: coordinate,
  socialLinks: optionalText(500, 'Sosyal medya adresleri'),
  footerText: optionalText(500, 'Alt bilgi metni'),
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
  username: usernameField,
  name: z.string().trim().min(2, 'Ad en az 2 karakter olmalı.').max(120, 'Ad en fazla 120 karakter olabilir.'),
  password: z.string().min(12, 'Parola en az 12 karakter olmalı.'),
  role: z.enum(['admin', 'editor']),
})

export const userUpdateSchema = z.object({
  role: z.enum(['admin', 'editor']),
  isActive: checkbox,
  // Boş bırakılırsa parola değişmez; doldurulursa aynı asgari uzunluk kuralı geçerli.
  // `nullish` + boş dizeye indirgeme: FormData.get() gönderilmeyen alan için null
  // döndürüyor ve çıktı tipi `string` kalmalı — çağıran `=== ''` ile karşılaştırıyor.
  password: z
    .string()
    .nullish()
    .transform((v) => v ?? '')
    .refine((v) => v === '' || v.length >= 12, 'Parola en az 12 karakter olmalı.'),
})

/**
 * Halka açık iletişim formu. Panel şemalarından FARKLI bir güven sınırında: gönderen
 * kimliği doğrulanmamış bir ziyaretçi, yani her alan düşmanca kabul edilir ve üst sınırlar
 * sütun genişliklerine göre değil, sütun genişliklerinden ÖNCE dayatılır (aşırı uzun bir
 * gövde veritabanına gitmeden burada reddedilsin).
 *
 * `subject` ve `kvkkAccepted` müşterinin istediği dört alanın (ad, e-posta, telefon, mesaj)
 * ÜSTÜNE eklendi:
 *   - subject: `messages.subject` sütunu NOT NULL. Sabit bir değerle doldurulsaydı panelde
 *     bütün mesajlar aynı başlıkla listelenir ve liste okunamaz hâle gelirdi.
 *   - kvkkAccepted: form kişisel veri (ad, e-posta, telefon) topluyor; açık rıza olmadan
 *     kaydetmek KVKK'ya aykırı olurdu. Onay anı `messages.kvkkAcceptedAt` sütununa yazılıyor
 *     — sütun zaten bu amaçla açılmış.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Ad soyad en az 2 karakter olmalı.')
    .max(160, 'Ad soyad en fazla 160 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.').max(190, 'E-posta en fazla 190 karakter olabilir.'),
  // Telefon isteğe bağlı: ziyaretçi yalnız e-postayla da ulaşılmak isteyebilir. Biçim
  // dayatılmıyor — sabit hat, cep ve uluslararası yazımlar farklı ve reddedilen geçerli bir
  // numara, kaybedilmiş bir başvuru demek.
  phone: optionalText(40, 'Telefon numarası'),
  subject: z
    .string()
    .trim()
    .min(3, 'Konu en az 3 karakter olmalı.')
    .max(220, 'Konu en fazla 220 karakter olabilir.'),
  body: z
    .string()
    .trim()
    .min(20, 'Mesaj en az 20 karakter olmalı.')
    .max(5000, 'Mesaj en fazla 5000 karakter olabilir.'),
  // `checkbox` işaretsizken false üretiyor; burada literal true isteniyor ki onay
  // verilmeden gönderim şemada dursun, action'da ayrıca kontrol gerekmesin.
  kvkkAccepted: checkbox.refine((v) => v === true, 'Devam etmek için aydınlatma metnini onaylamalısınız.'),
})
