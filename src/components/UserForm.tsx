'use client'

import { useState } from 'react'
import {
  CheckboxField, EntityForm, SelectField, TextField, useEntityValues, type EntityAction,
} from './EntityForm'

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Editör — yalnız makale ve medya' },
  { value: 'admin', label: 'Yönetici — bütün bölümler' },
] as const

export type UserFormValues = {
  id: number | null
  email: string
  name: string
  role: string
  isActive: boolean
}

export const EMPTY_USER: UserFormValues = { id: null, email: '', name: '', role: 'editor', isActive: true }

type UserFormProps = {
  action: EntityAction
  values?: UserFormValues
  /** Yönlendirmeyle taşınan kayıt bildirimi (bkz. lib/panel-notice.ts). */
  initialMessage?: string
}

/**
 * Panel kullanıcısı ekleme ve düzenleme formu.
 *
 * Kullanıcı SİLİNMEZ, pasifleştirilir: yüklediği medyanın `uploaded_by` bağı ve
 * `last_login_at` izi kaybolmasın. Silme düğmesi bilinçli olarak yok.
 */
export function UserForm({ action, values = EMPTY_USER, initialMessage }: UserFormProps) {
  const yeniKayit = values.id === null
  const { values: form, set } = useEntityValues({
    email: values.email,
    name: values.name,
    role: values.role,
    password: '',
  })
  const [isActive, setIsActive] = useState(values.isActive)

  return (
    <EntityForm action={action} initialMessage={initialMessage}>
      {({ fieldError }) => (
        <>
          {yeniKayit ? null : <input type="hidden" name="id" value={values.id ?? ''} readOnly />}

          {/* E-posta yalnız yeni kayıtta düzenlenebilir: userUpdateSchema onu içermiyor,
              çünkü oturum açmış bir kullanıcının kimliğini değiştirmek parola sıfırlama
              akışı olmadan güvenli bir işlem değil (Plan 3). */}
          {yeniKayit ? (
            <TextField
              id="user-email" name="email" label="E-posta" type="email" autoComplete="off"
              value={form.email} onChange={set('email')} error={fieldError('email')}
            />
          ) : (
            <TextField
              id="user-email" name="email" label="E-posta" type="email" readOnly
              value={form.email} onChange={set('email')}
              hint="E-posta adresi bu ekrandan değiştirilemez."
            />
          )}

          {yeniKayit ? (
            <TextField
              id="user-name" name="name" label="Ad soyad"
              value={form.name} onChange={set('name')} error={fieldError('name')}
            />
          ) : null}

          <TextField
            id="user-password" name="password" label="Parola" type="password" autoComplete="new-password"
            value={form.password} onChange={set('password')} error={fieldError('password')}
            hint={yeniKayit ? 'En az 12 karakter.' : 'Boş bırakılırsa mevcut parola korunur.'}
          />

          <SelectField
            id="user-role" name="role" label="Rol"
            value={form.role} onChange={set('role')} error={fieldError('role')}
            options={ROLE_OPTIONS}
          />

          {/* Yeni kayıt daima etkin açılıyor; pasif bir hesabı ilk anda kurmanın bir
              kullanımı yok ve "Etkin" kutusunu iki ekranda da göstermek karmaşa yaratırdı. */}
          {yeniKayit ? null : (
            <CheckboxField
              id="user-active" name="isActive" label="Etkin"
              checked={isActive} onChange={setIsActive}
              hint="İşareti kaldırılan kullanıcı doğru parolayla da giriş yapamaz."
            />
          )}
        </>
      )}
    </EntityForm>
  )
}
