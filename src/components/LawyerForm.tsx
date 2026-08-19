'use client'

import { useState } from 'react'
import type { MediaOption } from '@/db/queries/media'
import {
  CheckboxField, EntityForm, FieldBlock, FieldError, FieldLabel, FieldRow, TextField,
  useEntityValues, type EntityAction,
} from './EntityForm'
import { MediaPicker } from './MediaPicker'
import { PublishChecklist } from './PublishChecklist'
import { RichTextEditor } from './RichTextEditor'

export type LawyerFormValues = {
  id: number | null
  fullName: string
  title: string
  slug: string
  barAssociation: string
  barRegistryNo: string
  tbbRegistryNo: string
  /** "YYYY-MM-DD" veya boş; sütun (mode: 'string') tam olarak bunu saklıyor. */
  practiceStartDate: string
  university: string
  languages: string
  email: string
  sortOrder: string
  /** Seçim yapılmadığında boş dize; sütun NULL bekliyor. */
  photoMediaId: string
  bio: string
  isPublished: boolean
}

export const EMPTY_LAWYER: LawyerFormValues = {
  id: null, fullName: '', title: '', slug: '', barAssociation: '', barRegistryNo: '',
  tbbRegistryNo: '', practiceStartDate: '', university: '', languages: '', email: '',
  sortOrder: '0', photoMediaId: '', bio: '', isPublished: false,
}

type LawyerFormProps = {
  action: EntityAction
  values?: LawyerFormValues
  /** Fotoğraf seçicisinin kaynağı; kitaplık boşsa seçici açıklama gösterir. */
  mediaOptions: MediaOption[]
  /** Yeni kayıttan sonraki yönlendirmeyle taşınan bildirim. */
  initialMessage?: string
}

export function LawyerForm({ action, values = EMPTY_LAWYER, mediaOptions, initialMessage }: LawyerFormProps) {
  const { values: form, set } = useEntityValues({
    fullName: values.fullName,
    title: values.title,
    slug: values.slug,
    barAssociation: values.barAssociation,
    barRegistryNo: values.barRegistryNo,
    tbbRegistryNo: values.tbbRegistryNo,
    practiceStartDate: values.practiceStartDate,
    university: values.university,
    languages: values.languages,
    email: values.email,
    sortOrder: values.sortOrder,
    photoMediaId: values.photoMediaId,
  })
  const [isPublished, setIsPublished] = useState(values.isPublished)
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    <EntityForm action={action} initialMessage={initialMessage}>
      {({ fieldError, state }) => (
        <>
          {values.id === null ? null : <input type="hidden" name="id" value={values.id} readOnly />}

          <FieldRow>
            <TextField
              id="lawyer-full-name" name="fullName" label="Ad soyad"
              value={form.fullName} onChange={set('fullName')} error={fieldError('fullName')}
            />
            <TextField
              id="lawyer-title" name="title" label="Unvan"
              value={form.title} onChange={set('title')} error={fieldError('title')}
            />
          </FieldRow>

          <TextField
            id="lawyer-slug" name="slug" label="Adres (slug)"
            value={form.slug} onChange={set('slug')} error={fieldError('slug')}
            hint="Boş bırakılırsa ad soyaddan üretilir."
          />

          {/* Avukatlık Kanunu ve TBB düzenlemelerinin kadro tanıtımında saydığı alanlar;
              hepsi isteğe bağlı çünkü büro bilgileri kademeli olarak dolduruyor. */}
          <FieldRow>
            <TextField
              id="lawyer-bar" name="barAssociation" label="Baro"
              value={form.barAssociation} onChange={set('barAssociation')} error={fieldError('barAssociation')}
            />
            <TextField
              id="lawyer-bar-no" name="barRegistryNo" label="Baro sicil no"
              value={form.barRegistryNo} onChange={set('barRegistryNo')} error={fieldError('barRegistryNo')}
            />
          </FieldRow>

          <FieldRow>
            <TextField
              id="lawyer-tbb-no" name="tbbRegistryNo" label="TBB sicil no"
              value={form.tbbRegistryNo} onChange={set('tbbRegistryNo')} error={fieldError('tbbRegistryNo')}
            />
            <TextField
              id="lawyer-practice-start" name="practiceStartDate" label="Mesleğe başlama tarihi" type="date"
              value={form.practiceStartDate} onChange={set('practiceStartDate')}
              error={fieldError('practiceStartDate')}
            />
          </FieldRow>

          <FieldRow>
            <TextField
              id="lawyer-university" name="university" label="Üniversite"
              value={form.university} onChange={set('university')} error={fieldError('university')}
            />
            <TextField
              id="lawyer-languages" name="languages" label="Diller"
              value={form.languages} onChange={set('languages')} error={fieldError('languages')}
              hint="Virgülle ayırın: Türkçe, İngilizce"
            />
          </FieldRow>

          <FieldRow>
            <TextField
              id="lawyer-email" name="email" label="E-posta" type="email"
              value={form.email} onChange={set('email')} error={fieldError('email')}
            />
            <TextField
              id="lawyer-sort-order" name="sortOrder" label="Sıra"
              value={form.sortOrder} onChange={set('sortOrder')} error={fieldError('sortOrder')}
              hint="Küçük sayı önce gösterilir."
            />
          </FieldRow>

          <FieldBlock>
            <MediaPicker
              name="photoMediaId"
              legend="Fotoğraf"
              emptyOptionLabel="Fotoğraf yok"
              options={mediaOptions}
              value={form.photoMediaId}
              onChange={set('photoMediaId')}
              describedBy={fieldError('photoMediaId') ? 'lawyer-photo-error' : undefined}
            />
            {fieldError('photoMediaId') ? (
              <FieldError id="lawyer-photo-error">{fieldError('photoMediaId')}</FieldError>
            ) : null}
          </FieldBlock>

          <FieldBlock>
            <FieldLabel>Özgeçmiş</FieldLabel>
            <RichTextEditor
              name="bio"
              defaultValue={values.bio}
              label="Özgeçmiş"
              invalid={fieldError('bio') ? true : undefined}
              describedBy={fieldError('bio') ? 'lawyer-bio-error' : undefined}
            />
            {fieldError('bio') ? <FieldError id="lawyer-bio-error">{fieldError('bio')}</FieldError> : null}
          </FieldBlock>

          <CheckboxField
            id="lawyer-published" name="isPublished" label="Yayında"
            checked={isPublished} onChange={setIsPublished}
            hint="İşaretlenmeyen kayıt sitede görünmez."
          />

          {/* Reklam yasağı taraması kadro formunda da çalışıyor: avukat özgeçmişi bu
              yasağın en hassas alanı. İlk gönderimde kayıt YAPILMAZ. */}
          <PublishChecklist
            warnings={state.warnings ?? []}
            acknowledged={acknowledged}
            onAcknowledgedChange={setAcknowledged}
          />
        </>
      )}
    </EntityForm>
  )
}
