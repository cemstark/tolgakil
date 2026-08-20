import { eq } from 'drizzle-orm'
// Uzantılı ve göreli yollar bilinçli: scripts/seed.mts bu dosyayı doğrudan Node ESM ile
// yüklüyor; Node ne `@/` takma adını çözer ne de uzantısız göreli belirteci kabul eder.
import { db } from './client.ts'
import { categories, pages, practiceAreas, settings, users } from './schema.ts'
import { hashPassword } from '../lib/password.ts'
import { SETTINGS_ID } from '../lib/settings-id.ts'
import { USERNAME_ERROR, USERNAME_PATTERN } from '../lib/username.ts'

const SEED_CATEGORIES = [
  { slug: 'aile-hukuku', name: 'Aile Hukuku' },
  { slug: 'is-hukuku', name: 'İş Hukuku' },
  { slug: 'ticaret-hukuku', name: 'Ticaret Hukuku' },
  { slug: 'kira-hukuku', name: 'Kira Hukuku' },
]

// Plan 1'in sabit içeriğiyle birebir aynı metinler; reklam yasağına uygun, iddia içermez.
const SEED_PRACTICE_AREAS = [
  { slug: 'aile-hukuku', name: 'Aile Hukuku', summary: 'Boşanma, velayet, nafaka ve mal rejimi süreçleri.', sortOrder: 0 },
  { slug: 'is-hukuku', name: 'İş Hukuku', summary: 'İşçi ve işveren uyuşmazlıkları, alacak ve işe iade davaları.', sortOrder: 1 },
  { slug: 'ticaret-hukuku', name: 'Ticaret Hukuku', summary: 'Şirketler, sözleşmeler ve ticari uyuşmazlıklar.', sortOrder: 2 },
]

// HUKUKİ METİN ÜRETİLMİYOR — bağlayıcı karar. KVKK aydınlatma metni ve çerez politikası
// hukuki belgedir; model üretimi bir metin, gerçek bir belge gibi görüneceği için burada
// yalnız yer tutucu duruyor. Müvekkilin gerçek metni panelden girmesi spec §13'te açık
// madde olarak kayıtlı.
const YER_TUTUCU = '<p>Bu metin büro tarafından panelden girilecektir.</p>'

const SEED_PAGES = [
  { slug: 'hakkimizda', title: 'Hakkımızda', content: YER_TUTUCU },
  { slug: 'kvkk', title: 'KVKK Aydınlatma Metni', content: YER_TUTUCU },
  { slug: 'cerez-politikasi', title: 'Çerez Politikası', content: YER_TUTUCU },
]

function requiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`${key} tanımlı değil; tohum verisi parolayı uyduramaz.`)
  return value
}

// Ortamdan gelen kullanıcı adını giriş formuyla AYNI kurala sokar.
//
// Doğrulama olmadan `SEED_ADMIN_USERNAME="Büro@ornek.com"` gibi bir değer sessizce
// kaydedilir, sonra giriş formu aynı değeri biçim hatası diye reddederdi: hesap var,
// ama hiç kimse o hesapla giremez. Sessiz geri düşüş yerine burada duruluyor.
// Kural zod şemasıyla ORTAK bir modülden geliyor (lib/username.ts); kopyalanan bir
// desen, bir tarafta gevşetildiğinde tam olarak bu sessiz uyuşmazlığı üretirdi.
function requiredUsername(key: string): string {
  const value = requiredEnv(key).trim()
  if (!USERNAME_PATTERN.test(value)) throw new Error(`${key} geçersiz. ${USERNAME_ERROR}`)
  return value
}

// Idempotent: var olan kullanıcının parolasını veya rolünü EZMEZ, yalnız eksikse ekler.
// Aksi hâlde tohumu ikinci kez koşturmak panelden değiştirilmiş parolayı geri alırdı.
async function addUser(username: string, password: string, name: string, role: 'admin' | 'editor') {
  const existing = await db.select().from(users).where(eq(users.username, username))
  if (existing.length > 0) return
  await db.insert(users).values({
    username, name, role, isActive: true,
    // Tek kaynak: sahte özet de dahil bütün argon2 parametreleri lib/password.ts'te.
    passwordHash: await hashPassword(password),
  })
}

export async function seed(): Promise<void> {
  // Eski SEED_*_EMAIL adları BİLİNÇLİ olarak okunmuyor: sessiz geri düşüş, ortam değişkeni
  // güncellenmemiş bir dağıtımda giriş yapılamayan bir hesap oluştururdu. requiredEnv yoksa
  // fırlatıyor, yani eksik yeniden adlandırma dağıtımda görünür bir hata olarak çıkıyor.
  await addUser(requiredUsername('SEED_ADMIN_USERNAME'), requiredEnv('SEED_ADMIN_PASSWORD'), 'Büro Yöneticisi', 'admin')
  await addUser(requiredUsername('SEED_EDITOR_USERNAME'), requiredEnv('SEED_EDITOR_PASSWORD'), 'Yazar Avukat', 'editor')

  for (const category of SEED_CATEGORIES) {
    const existing = await db.select().from(categories).where(eq(categories.slug, category.slug))
    if (existing.length === 0) await db.insert(categories).values(category)
  }

  for (const area of SEED_PRACTICE_AREAS) {
    const existing = await db.select().from(practiceAreas).where(eq(practiceAreas.slug, area.slug))
    if (existing.length === 0) await db.insert(practiceAreas).values({ ...area, isPublished: true })
  }

  const existingSettings = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID))
  if (existingSettings.length === 0) {
    // Plan 1'deki SITE sabitinin aynısı; gerçek bilgiler müşteriden gelince panelden değişecek.
    await db.insert(settings).values({
      id: SETTINGS_ID,
      officeName: 'Akıl Hukuk Bürosu',
      address: 'Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul',
      phone: '+90 216 000 00 00',
      email: 'info@example.com',
      footerText: 'Bu sitedeki bilgiler hukuki tavsiye niteliği taşımaz.',
    })
  }

  // Idempotent: var olan satırın İÇERİĞİNİ EZMEZ. Aksi hâlde tohumu ikinci kez koşturmak
  // avukatın panelden girdiği gerçek KVKK metnini yer tutucuyla değiştirirdi.
  for (const page of SEED_PAGES) {
    const existing = await db.select().from(pages).where(eq(pages.slug, page.slug))
    if (existing.length === 0) await db.insert(pages).values(page)
  }
}
