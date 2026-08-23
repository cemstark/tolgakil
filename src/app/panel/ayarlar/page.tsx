import type { Metadata } from 'next'
import { getSettings } from '@/db/queries/settings'
import { requireAccess } from '@/lib/auth-guards'
import { PanelHeading } from '@/components/PanelHeading'
import { SettingsForm } from '@/components/SettingsForm'
import { saveSettings } from './actions'

export const metadata: Metadata = {
  title: 'Ayarlar',
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  await requireAccess('settings')
  // getSettings satır yoksa FIRLATIR ve hata sınırına düşer; sessiz varsayılan üretmiyor,
  // çünkü boş bir telefon/adres sitede yayımlanmış olurdu.
  const settings = await getSettings()

  return (
    <>
      <PanelHeading
        title="Ayarlar"
        description="Sitenin iletişim bilgileri ve alt bilgi metni bu formdan yönetilir."
      />

      <SettingsForm
        action={saveSettings}
        values={{
          officeName: settings.officeName,
          address: settings.address,
          phone: settings.phone,
          phoneSecondary: settings.phoneSecondary ?? '',
          workingHours: settings.workingHours ?? '',
          email: settings.email,
          whatsapp: settings.whatsapp ?? '',
          kep: settings.kep ?? '',
          mapLat: settings.mapLat ?? '',
          mapLng: settings.mapLng ?? '',
          socialLinks: settings.socialLinks ?? '',
          footerText: settings.footerText ?? '',
        }}
      />
    </>
  )
}
