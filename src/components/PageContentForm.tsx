'use client'

import {
  EntityForm, FieldBlock, FieldError, FieldLabel, TextField, useEntityValues, type EntityAction,
} from './EntityForm'
import { PublishChecklist } from './PublishChecklist'
import { RichTextEditor } from './RichTextEditor'

export type PageContentFormValues = {
  slug: string
  title: string
  content: string
}

type PageContentFormProps = {
  action: EntityAction
  values: PageContentFormValues
  secondaryAction?: React.ReactNode
}

// Slug alanı YOK: sabit satırlı tabloda adres düzenlenemez, gizli alanla taşınıyor.
export function PageContentForm({ action, values, secondaryAction }: PageContentFormProps) {
  const { values: form, set } = useEntityValues({ title: values.title })

  return (
    <EntityForm action={action} submitLabel="Kaydet" secondaryAction={secondaryAction}>
      {({ fieldError, state }) => (
        <>
          <input type="hidden" name="slug" value={values.slug} readOnly />

          <TextField
            id="page-title" name="title" label="Başlık"
            value={form.title} onChange={set('title')} error={fieldError('title')}
            hint="Sayfanın en üstündeki başlık ve sekme adı."
          />

          <FieldBlock>
            <FieldLabel>İçerik</FieldLabel>
            <RichTextEditor
              name="content"
              defaultValue={values.content}
              label="İçerik"
              invalid={fieldError('content') ? true : undefined}
              describedBy={fieldError('content') ? 'page-content-error' : undefined}
            />
            {fieldError('content') ? <FieldError id="page-content-error">{fieldError('content')}</FieldError> : null}
          </FieldBlock>

          <PublishChecklist warnings={state.warnings} />
        </>
      )}
    </EntityForm>
  )
}
