'use client'

import { EntityForm, FieldRow, TextAreaField, TextField, useEntityValues, type EntityAction } from './EntityForm'
import { PublishChecklist } from './PublishChecklist'

export type SettingsFormValues = {
  officeName: string
  address: string
  phone: string
  email: string
  whatsapp: string
  kep: string
  mapLat: string
  mapLng: string
  socialLinks: string
  footerText: string
}

type SettingsFormProps = {
  action: EntityAction
  values: SettingsFormValues
}

/**
 * Büro iletişim ve alt bilgi ayarları. Tek satırlık `settings` tablosunu günceller.
 *
 * Harita koordinatları burada ÇİZİLİYOR çünkü şema onları zorunlu bir anahtar olarak
 * bekliyor; formdan düşürülselerdi kullanıcı hiç görmediği bir alan için hata alırdı
 * (Görev 1-2 sözleşmesi).
 */
export function SettingsForm({ action, values }: SettingsFormProps) {
  const { values: form, set } = useEntityValues(values)

  return (
    <EntityForm action={action}>
      {({ fieldError, state }) => (
        <>
          <TextField
            id="settings-office-name" name="officeName" label="Büro adı"
            value={form.officeName} onChange={set('officeName')} error={fieldError('officeName')}
          />

          <TextAreaField
            id="settings-address" name="address" label="Adres"
            value={form.address} onChange={set('address')} error={fieldError('address')}
          />

          <FieldRow>
            <TextField
              id="settings-phone" name="phone" label="Telefon" type="tel"
              value={form.phone} onChange={set('phone')} error={fieldError('phone')}
            />
            <TextField
              id="settings-whatsapp" name="whatsapp" label="WhatsApp numarası" type="tel"
              value={form.whatsapp} onChange={set('whatsapp')} error={fieldError('whatsapp')}
            />
          </FieldRow>

          <FieldRow>
            <TextField
              id="settings-email" name="email" label="E-posta" type="email"
              value={form.email} onChange={set('email')} error={fieldError('email')}
            />
            <TextField
              id="settings-kep" name="kep" label="KEP adresi"
              value={form.kep} onChange={set('kep')} error={fieldError('kep')}
            />
          </FieldRow>

          <FieldRow>
            <TextField
              id="settings-map-lat" name="mapLat" label="Harita enlemi"
              value={form.mapLat} onChange={set('mapLat')} error={fieldError('mapLat')}
              hint="Boş bırakılabilir. Örnek: 40.9905"
            />
            <TextField
              id="settings-map-lng" name="mapLng" label="Harita boylamı"
              value={form.mapLng} onChange={set('mapLng')} error={fieldError('mapLng')}
              hint="Boş bırakılabilir. Örnek: 29.0270"
            />
          </FieldRow>

          <TextAreaField
            id="settings-social-links" name="socialLinks" label="Sosyal medya adresleri"
            value={form.socialLinks} onChange={set('socialLinks')} error={fieldError('socialLinks')}
            hint="Her satıra bir adres yazın."
          />

          <TextAreaField
            id="settings-footer-text" name="footerText" label="Alt bilgi metni"
            value={form.footerText} onChange={set('footerText')} error={fieldError('footerText')}
          />

          {/* Büro adı ve alt bilgi metni sitenin her sayfasında görünüyor; reklam yasağı
              taraması makale/kadro/alan formlarıyla aynı onaylı uyarı desenini kullanıyor. */}
          <PublishChecklist warnings={state.warnings} />
        </>
      )}
    </EntityForm>
  )
}
