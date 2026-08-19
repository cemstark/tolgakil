'use client'

import { useActionState, useState } from 'react'
import { saveArticle } from '@/app/panel/makaleler/actions'
import type { SelectOption } from '@/db/queries/articles'
import type { FormState } from '@/lib/validation'
import { PublishChecklist } from './PublishChecklist'
import { RichTextEditor } from './RichTextEditor'
import styles from './ArticleForm.module.css'

// Değer değil yalnız TİP alınıyor (bkz. LoginForm): validation.ts modül seviyesinde
// z.config çağırdığı için yan etkili ve değer import'u zod'u istemci paketine sokuyor.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

export type ArticleFormValues = {
  id: number | null
  title: string
  slug: string
  excerpt: string
  content: string
  /** Seçim yapılmadığında boş dize; sütun NULL bekliyor. */
  categoryId: string
  authorId: string
}

const EMPTY_VALUES: ArticleFormValues = {
  id: null, title: '', slug: '', excerpt: '', content: '', categoryId: '', authorId: '',
}

type ArticleFormProps = {
  values?: ArticleFormValues
  categories: SelectOption[]
  authors: SelectOption[]
  /** Yeni kayıttan sonraki yönlendirmeyle taşınan bildirim. */
  initialMessage?: string
}

export function ArticleForm({ values = EMPTY_VALUES, categories, authors, initialMessage }: ArticleFormProps) {
  const [state, formAction, isPending] = useActionState(saveArticle, INITIAL_STATE)

  // Alanlar denetimli tutuluyor: React 19 form action'dan sonra denetimsiz alanları
  // defaultValue'suna döndürebiliyor. Reklam yasağı uyarısı geldiğinde form yeniden
  // gönderilmek zorunda; başlık ve özet o arada sıfırlanırsa kullanıcı yazdığını kaybeder.
  const [title, setTitle] = useState(values.title)
  const [slug, setSlug] = useState(values.slug)
  const [excerpt, setExcerpt] = useState(values.excerpt)
  const [categoryId, setCategoryId] = useState(values.categoryId)
  const [authorId, setAuthorId] = useState(values.authorId)
  const [acknowledged, setAcknowledged] = useState(false)

  // INITIAL_STATE bir modül sabiti; useActionState action çözülene kadar tam o nesneyi
  // geri veriyor. Referans karşılaştırması "action henüz koşmadı" bilgisini veriyor:
  // aksi hâlde uyarı ekranında yönlendirmeden kalan "kaydedildi" bildirimi asılı kalır
  // ve kullanıcı kaydedilmeyen bir metni kaydedilmiş sanır.
  const actionRan = state !== INITIAL_STATE
  const notice = actionRan ? (state.ok ? state.message : undefined) : initialMessage
  const formError = actionRan && !state.ok ? state.message : undefined
  const fieldError = (field: string): string | undefined => state.errors[field]?.join(' ')

  const titleError = fieldError('title')
  const slugError = fieldError('slug')
  const excerptError = fieldError('excerpt')
  const contentError = fieldError('content')
  const categoryError = fieldError('categoryId')
  const authorError = fieldError('authorId')

  return (
    <form action={formAction} className={styles.form} noValidate>
      {values.id === null ? null : <input type="hidden" name="id" value={values.id} readOnly />}

      {notice ? (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" className={styles.alert}>
          {formError}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="article-title" className={styles.label}>
          Başlık
        </label>
        <input
          id="article-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={styles.input}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? 'article-title-error' : undefined}
        />
        {/* role="alert": aria-describedby hatayı yalnız girdiye odaklanınca okutur; formu
            gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı sonucu duymaz. */}
        {titleError ? (
          <p id="article-title-error" role="alert" className={styles.fieldError}>
            {titleError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="article-slug" className={styles.label}>
          Adres (slug)
        </label>
        <input
          id="article-slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className={styles.input}
          aria-invalid={slugError ? true : undefined}
          aria-describedby={slugError ? 'article-slug-error' : 'article-slug-hint'}
        />
        <p id="article-slug-hint" className={styles.hint}>
          Boş bırakılırsa başlıktan üretilir.
        </p>
        {slugError ? (
          <p id="article-slug-error" role="alert" className={styles.fieldError}>
            {slugError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="article-excerpt" className={styles.label}>
          Özet
        </label>
        <textarea
          id="article-excerpt"
          name="excerpt"
          rows={3}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className={styles.textarea}
          aria-invalid={excerptError ? true : undefined}
          aria-describedby={excerptError ? 'article-excerpt-error' : undefined}
        />
        {excerptError ? (
          <p id="article-excerpt-error" role="alert" className={styles.fieldError}>
            {excerptError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>İçerik</span>
        <RichTextEditor
          name="content"
          defaultValue={values.content}
          label="İçerik"
          invalid={contentError ? true : undefined}
          describedBy={contentError ? 'article-content-error' : undefined}
        />
        {contentError ? (
          <p id="article-content-error" role="alert" className={styles.fieldError}>
            {contentError}
          </p>
        ) : null}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="article-category" className={styles.label}>
            Kategori
          </label>
          <select
            id="article-category"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={styles.select}
            aria-invalid={categoryError ? true : undefined}
            aria-describedby={categoryError ? 'article-category-error' : undefined}
          >
            <option value="">Seçilmedi</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {categoryError ? (
            <p id="article-category-error" role="alert" className={styles.fieldError}>
              {categoryError}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="article-author" className={styles.label}>
            Yazar
          </label>
          <select
            id="article-author"
            name="authorId"
            value={authorId}
            onChange={(event) => setAuthorId(event.target.value)}
            className={styles.select}
            aria-invalid={authorError ? true : undefined}
            aria-describedby={authorError ? 'article-author-error' : 'article-author-hint'}
          >
            <option value="">Seçilmedi</option>
            {authors.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {authors.length === 0 ? (
            <p id="article-author-hint" className={styles.hint}>
              Kadro kaydı eklendikçe burada listelenir.
            </p>
          ) : null}
          {authorError ? (
            <p id="article-author-error" role="alert" className={styles.fieldError}>
              {authorError}
            </p>
          ) : null}
        </div>
      </div>

      <PublishChecklist
        warnings={state.warnings ?? []}
        acknowledged={acknowledged}
        onAcknowledgedChange={setAcknowledged}
      />

      {/* İki gönderme düğmesi: basılan düğmenin name/value çifti FormData'ya girer ve
          durumu belirler. Gönderim sırasında ikisi de kilitleniyor. */}
      <div className={styles.actions}>
        <button type="submit" name="status" value="draft" className={styles.secondary} disabled={isPending}>
          Taslak olarak kaydet
        </button>
        <button type="submit" name="status" value="published" className={styles.primary} disabled={isPending}>
          Yayımla
        </button>
      </div>
    </form>
  )
}
