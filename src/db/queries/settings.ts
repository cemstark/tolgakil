import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { settings, type NewSettings, type Settings } from '@/db/schema'
import { SETTINGS_ID } from '@/lib/settings-id'

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID))
  if (!row) {
    // Sessizce boş ayar döndürmek, sitede boş telefon/adres yayımlamak demek olurdu.
    throw new Error('Ayar satırı bulunamadı; `npm run db:seed` çalıştırılmalı.')
  }
  return row
}

// Tablo tek satırlık: INSERT yolu bilinçli olarak yok. Satır yoksa bu bir kurulum
// eksikliğidir ve getSettings zaten gürültülü biçimde fırlatıyor; buradan sessizce
// ikinci bir satır üretmek "ayarlarım kayboldu" hatasının kaynağı olurdu.
export async function updateSettings(values: Partial<NewSettings>): Promise<void> {
  await db.update(settings).set(values).where(eq(settings.id, SETTINGS_ID))
}
