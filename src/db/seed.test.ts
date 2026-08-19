import { afterAll, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, db } from '@/db/client'
import { seed } from '@/db/seed'
import { settings, users } from '@/db/schema'
import { SETTINGS_ID } from '@/lib/settings-id'

afterAll(async () => {
  await closeDb()
})

it('iki kez koşturulunca kayıtları çoğaltmaz', async () => {
  await seed()
  await seed()
  const kullanicilar = await db.select().from(users)
  const ayarlar = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID))
  expect(kullanicilar.filter((u) => u.role === 'admin')).toHaveLength(1)
  expect(ayarlar).toHaveLength(1)
})

it('tohum kullanıcıları etkin başlar', async () => {
  await seed()
  const kullanicilar = await db.select().from(users)
  expect(kullanicilar.every((u) => u.isActive)).toBe(true)
})
