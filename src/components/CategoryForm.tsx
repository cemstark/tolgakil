'use client'

import { EntityForm, FieldRow, TextField, useEntityValues, type EntityAction } from './EntityForm'

type CategoryFormProps = {
  action: EntityAction
  initialMessage?: string
}

/**
 * Kategori ekleme formu. Tek satır: kategori yalnızca bir ad ve bir adresten ibaret,
 * ayrı bir düzenleme sayfası açacak kadar alanı yok.
 */
export function CategoryForm({ action, initialMessage }: CategoryFormProps) {
  const { values, set } = useEntityValues({ name: '', slug: '' })

  return (
    <EntityForm action={action} initialMessage={initialMessage} submitLabel="Kategori ekle">
      {({ fieldError }) => (
        <FieldRow>
          <TextField
            id="category-name" name="name" label="Kategori adı"
            value={values.name} onChange={set('name')} error={fieldError('name')}
          />
          <TextField
            id="category-slug" name="slug" label="Adres (slug)"
            value={values.slug} onChange={set('slug')} error={fieldError('slug')}
            hint="Boş bırakılırsa kategori adından üretilir."
          />
        </FieldRow>
      )}
    </EntityForm>
  )
}
