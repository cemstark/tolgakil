'use client'

import { useState } from 'react'
import {
  CheckboxField, EntityForm, FieldBlock, FieldError, FieldLabel, FieldRow, TextAreaField,
  TextField, useEntityValues, type EntityAction,
} from './EntityForm'
import { PublishChecklist } from './PublishChecklist'
import { RichTextEditor } from './RichTextEditor'

export type PracticeAreaFormValues = {
  id: number | null
  name: string
  slug: string
  summary: string
  content: string
  sortOrder: string
  isPublished: boolean
}

export const EMPTY_PRACTICE_AREA: PracticeAreaFormValues = {
  id: null, name: '', slug: '', summary: '', content: '', sortOrder: '0', isPublished: false,
}

type PracticeAreaFormProps = {
  action: EntityAction
  values?: PracticeAreaFormValues
  initialMessage?: string
}

export function PracticeAreaForm({ action, values = EMPTY_PRACTICE_AREA, initialMessage }: PracticeAreaFormProps) {
  const { values: form, set } = useEntityValues({
    name: values.name,
    slug: values.slug,
    summary: values.summary,
    sortOrder: values.sortOrder,
  })
  const [isPublished, setIsPublished] = useState(values.isPublished)

  return (
    <EntityForm action={action} initialMessage={initialMessage}>
      {({ fieldError, state }) => (
        <>
          {values.id === null ? null : <input type="hidden" name="id" value={values.id} readOnly />}

          <FieldRow>
            <TextField
              id="area-name" name="name" label="Alan adı"
              value={form.name} onChange={set('name')} error={fieldError('name')}
            />
            <TextField
              id="area-sort-order" name="sortOrder" label="Sıra"
              value={form.sortOrder} onChange={set('sortOrder')} error={fieldError('sortOrder')}
              hint="Küçük sayı önce gösterilir."
            />
          </FieldRow>

          <TextField
            id="area-slug" name="slug" label="Adres (slug)"
            value={form.slug} onChange={set('slug')} error={fieldError('slug')}
            hint="Boş bırakılırsa alan adından üretilir."
          />

          {/* Özet DÜZ METİN: çalışma alanları listesinde kart altına basılıyor ve orada
              biçimlendirmeye yer yok. */}
          <TextAreaField
            id="area-summary" name="summary" label="Özet"
            value={form.summary} onChange={set('summary')} error={fieldError('summary')}
          />

          <FieldBlock>
            <FieldLabel>İçerik</FieldLabel>
            <RichTextEditor
              name="content"
              defaultValue={values.content}
              label="İçerik"
              invalid={fieldError('content') ? true : undefined}
              describedBy={fieldError('content') ? 'area-content-error' : undefined}
            />
            {fieldError('content') ? <FieldError id="area-content-error">{fieldError('content')}</FieldError> : null}
          </FieldBlock>

          <CheckboxField
            id="area-published" name="isPublished" label="Yayında"
            checked={isPublished} onChange={setIsPublished}
            hint="İşaretlenmeyen kayıt sitede görünmez."
          />

          {/* Çalışma alanı metni reklam yasağının en olası girdiği kutu: "boşanma
              davalarında en yüksek başarı oranı" cümlesi tam olarak buraya yazılır.
              Makale ve özgeçmişle aynı sözleşme: ilk gönderimde kayıt YAPILMAZ. */}
          <PublishChecklist warnings={state.warnings} />
        </>
      )}
    </EntityForm>
  )
}
