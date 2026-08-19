import { eq } from 'drizzle-orm'
import argon2 from 'argon2'
// Uzantılı ve göreli yollar bilinçli: scripts/seed.mts bu dosyayı doğrudan Node ESM ile
// yüklüyor; Node ne `@/` takma adını çözer ne de uzantısız göreli belirteci kabul eder.
import { db } from './client.ts'
import { categories, practiceAreas, settings, users } from './schema.ts'
import { SETTINGS_ID } from '../lib/settings-id.ts'

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

function requiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`${key} tanımlı değil; tohum verisi parolayı uyduramaz.`)
  return value
}

// Idempotent: var olan kullanıcının parolasını veya rolünü EZMEZ, yalnız eksikse ekler.
// Aksi hâlde tohumu ikinci kez koşturmak panelden değiştirilmiş parolayı geri alırdı.
async function addUser(email: string, password: string, name: string, role: 'admin' | 'editor') {
  const existing = await db.select().from(users).where(eq(users.email, email))
  if (existing.length > 0) return
  await db.insert(users).values({
    email, name, role, isActive: true,
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
  })
}

export async function seed(): Promise<void> {
  await addUser(requiredEnv('SEED_ADMIN_EMAIL'), requiredEnv('SEED_ADMIN_PASSWORD'), 'Büro Yöneticisi', 'admin')
  await addUser(requiredEnv('SEED_EDITOR_EMAIL'), requiredEnv('SEED_EDITOR_PASSWORD'), 'Yazar Avukat', 'editor')

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
}
