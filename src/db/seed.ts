import { eq } from 'drizzle-orm'
// Uzantılı ve göreli yollar bilinçli: scripts/seed.mts bu dosyayı doğrudan Node ESM ile
// yüklüyor; Node ne `@/` takma adını çözer ne de uzantısız göreli belirteci kabul eder.
import { db } from './client.ts'
import { categories, lawyers, pages, practiceAreas, settings, users } from './schema.ts'
import { hashPassword } from '../lib/password.ts'
import { SETTINGS_ID } from '../lib/settings-id.ts'
import { USERNAME_ERROR, USERNAME_PATTERN } from '../lib/username.ts'
// Müşterinin teslim ettiği ve avukat tarafından onaylanmış metinler ayrı modülde; gerekçesi
// o dosyanın başında yazılı (kurulum mantığı ile onaylı düzyazı aynı dosyada durmasın).
import {
  SEED_ABOUT_PAGE,
  SEED_CATEGORIES,
  SEED_LAWYER,
  SEED_COOKIE_PAGE,
  SEED_KVKK_PAGE,
  SEED_PRACTICE_AREAS,
  SEED_SETTINGS,
} from './seed-content.ts'

// KVKK VE ÇEREZ METNİ — ÖNCEKİ KARAR DEĞİŞTİ (27.08.2026).
//
// Burada eskiden "hukuki metin üretilmiyor" diye bağlayıcı bir karar ve tek satırlık bir
// yer tutucu vardı; gerekçesi, üretilmiş bir metnin gerçek belge gibi görünme riskiydi.
// Karar site sahibinin açık talimatıyla değişti: bir hukuk bürosunun sitesinde BOŞ bir
// KVKK sayfası, eksik bir metinden daha kötü görünüyor ve site o hâliyle yayına çıkamıyordu.
//
// Riski azaltan şey metnin kaynağı — her cümle kodun gerçeğinden türetildi, şablondan
// değil: işlenen veri kalemleri `messages` tablosunun sütunlarıyla birebir, çerez bölümü
// ise kod taranarak yazıldı (sitede yalnız next-auth oturum çerezi var, analitik yok).
// Ayrıntılı gerekçe `seed-content.ts` içinde SEED_KVKK_PAGE'in başında.
//
// METİN YİNE DE AVUKAT ONAYI BEKLİYOR: saklama süresi gibi kalemler büronun kendi
// politikasına bağlı ve kod onu bilemez. Bu tohum idempotent olduğu için Av. Tolga Akil
// panelden düzelttiği anda buradaki metin onun yazdığının üstüne YAZMAZ.
const SEED_PAGES = [
  { slug: 'hakkimizda', title: 'Hakkımızda', content: SEED_ABOUT_PAGE },
  { slug: 'kvkk', title: 'KVKK Aydınlatma Metni', content: SEED_KVKK_PAGE },
  { slug: 'cerez-politikasi', title: 'Çerez Politikası', content: SEED_COOKIE_PAGE },
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
    await db.insert(settings).values({ id: SETTINGS_ID, ...SEED_SETTINGS })
  }

  // Büronun tek avukatı. Idempotent: slug varsa dokunulmaz, yani panelden düzenlenmiş
  // özgeçmiş ikinci tohumlamada geri alınmaz.
  const existingLawyer = await db.select().from(lawyers).where(eq(lawyers.slug, SEED_LAWYER.slug))
  if (existingLawyer.length === 0) {
    await db.insert(lawyers).values({ ...SEED_LAWYER, isPublished: true })
  }

  // Idempotent: var olan satırın İÇERİĞİNİ EZMEZ. Aksi hâlde tohumu ikinci kez koşturmak
  // avukatın panelden girdiği gerçek KVKK metnini yer tutucuyla değiştirirdi.
  for (const page of SEED_PAGES) {
    const existing = await db.select().from(pages).where(eq(pages.slug, page.slug))
    if (existing.length === 0) await db.insert(pages).values(page)
  }
}
