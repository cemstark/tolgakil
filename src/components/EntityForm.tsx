'use client'

import { useActionState, useCallback, useState, type ReactNode } from 'react'
import type { FormState } from '@/lib/validation'
import styles from './EntityForm.module.css'

// Değer değil yalnız TİP alınıyor (bkz. ArticleForm): validation.ts modül seviyesinde
// z.config çağırdığı için yan etkili ve değer import'u zod'u istemci paketine sokuyor.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

export type EntityAction = (prev: FormState, formData: FormData) => Promise<FormState>

export type EntityFormRender = {
  /** Sunucunun o alan için döndürdüğü hata; yoksa undefined. */
  fieldError: (field: string) => string | undefined
  state: FormState
  isPending: boolean
}

type EntityFormProps = {
  /**
   * Server action, sunucu bileşeninden prop olarak geçilir. Doğrudan import edilmiyor:
   * aynı kabuk altı ayrı modülün action'ını çalıştırıyor ve her biri kendi dosyasında
   * `requireAccess` çağırıyor.
   */
  action: EntityAction
  /** Yönlendirmeyle taşınan bildirim (bkz. makaleler/save-messages.ts deseni). */
  initialMessage?: string
  submitLabel?: string
  /** Gönderme satırının yanına konan ikincil eylem (ör. "Listeye dön" bağlantısı). */
  secondaryAction?: ReactNode
  children: (render: EntityFormRender) => ReactNode
}

/**
 * Panel formlarının ortak kabuğu: durum yönetimi, bildirim/hata canlı bölgeleri ve
 * gönderme satırı. Alanlar çağırandan geliyor çünkü altı formun alan kümesi birbirinin
 * aynısı değil; ortaklaştırılan şey yerleşim ve erişilebilirlik sözleşmesi.
 */
export function EntityForm({
  action,
  initialMessage,
  submitLabel = 'Kaydet',
  secondaryAction,
  children,
}: EntityFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE)

  // INITIAL_STATE bir modül sabiti; useActionState action çözülene kadar tam o nesneyi
  // geri veriyor. Referans karşılaştırması "action henüz koşmadı" bilgisini veriyor:
  // aksi hâlde hata ekranında yönlendirmeden kalan "kaydedildi" bildirimi asılı kalır ve
  // kullanıcı kaydedilmeyen bir formu kaydedilmiş sanır (ArticleForm ile aynı gerekçe).
  const actionRan = state !== INITIAL_STATE
  const notice = actionRan ? (state.ok ? state.message : undefined) : initialMessage
  const formError = actionRan && !state.ok ? state.message : undefined
  const fieldError = (field: string): string | undefined => state.errors[field]?.join(' ')

  // Ardışık iki kaydetme aynı metni üretiyor ("Kullanıcı kaydedildi."). Aynı DOM düğümünde
  // metin hiç değişmediği için canlı bölge duyuru yapmaz ve kullanıcı ikinci kaydın olup
  // olmadığını öğrenemez — Görev 6'da liste bildirimlerinde ölçülen durumun formdaki eşi.
  // useActionState her sonuçta YENİ bir nesne döndürüyor; kimlik değişimi sayaca çevrilip
  // bildirim öğesinin anahtarı yapılıyor, böylece öğe her sonuçta yeniden kuruluyor.
  // Render sırasında durum ayarlamak React'in belgelediği "önceki render'dan bilgi tutma"
  // deseni; effect kullanmak araya fazladan bir çizim sokardı.
  const [previousState, setPreviousState] = useState(state)
  const [noticeKey, setNoticeKey] = useState(0)
  if (previousState !== state) {
    setPreviousState(state)
    setNoticeKey(noticeKey + 1)
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {notice ? (
        <p key={`bildirim-${noticeKey}`} role="status" className={styles.notice}>
          {notice}
        </p>
      ) : null}

      {formError ? (
        <p key={`hata-${noticeKey}`} role="alert" className={styles.alert}>
          {formError}
        </p>
      ) : null}

      {children({ fieldError, state, isPending })}

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={isPending}>
          {isPending ? 'Kaydediliyor…' : submitLabel}
        </button>
        {secondaryAction}
      </div>
    </form>
  )
}

/**
 * Form alanlarını tek bir durumda toplar.
 *
 * Alanlar denetimli tutulmak zorunda: React 19 form action'dan sonra denetimsiz alanları
 * defaultValue'suna döndürebiliyor. Reklam yasağı uyarısı geldiğinde form yeniden
 * gönderiliyor; alanlar o arada sıfırlanırsa kullanıcı yazdığını kaybeder.
 */
export function useEntityValues<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const set = useCallback(
    <K extends keyof T & string>(key: K) =>
      (value: string) =>
        setValues((current) => ({ ...current, [key]: value })),
    [],
  )
  return { values, set }
}

type FieldProps = {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  /** Alanın altında duran açıklama; hata varsa yerini hataya bırakmaz, ikisi de okunur. */
  hint?: string
}

// Hata metni role="alert" taşıyor: aria-describedby hatayı yalnız girdiye odaklanınca
// okutur, formu gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı sonucu duymaz.
function FieldMessages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </>
  )
}

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter((v) => v !== null)
  return ids.length > 0 ? ids.join(' ') : undefined
}

type TextFieldProps = FieldProps & {
  type?: 'text' | 'email' | 'password' | 'date' | 'tel'
  autoComplete?: string
  /** Değeri gösterir ama düzenlemeye kapatır; ekran okuyucu da salt okunur duyurur. */
  readOnly?: boolean
}

export function TextField({
  id, name, label, value, onChange, error, hint, type = 'text', autoComplete, readOnly,
}: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`${styles.input}${readOnly ? ` ${styles.readOnly}` : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

export function TextAreaField({ id, name, label, value, onChange, error, hint, rows = 3 }: FieldProps & { rows?: number }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.textarea}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

export function SelectField({
  id, name, label, value, onChange, error, hint, options,
}: FieldProps & { options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.select}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

type CheckboxFieldProps = {
  id: string
  name: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}

// value="evet" bilinçli: şemadaki `checkbox` dönüştürücüsü hem 'evet' hem tarayıcının
// varsayılan 'on' değerini kabul ediyor, ama gönderilen değeri açıkça yazmak formun
// ne ilettiğini okunur bırakıyor.
export function CheckboxField({ id, name, label, checked, onChange, hint }: CheckboxFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.checkboxLabel}>
        <input
          id={id}
          name={name}
          type="checkbox"
          value="evet"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** İki alanı geniş ekranda yan yana, dar ekranda alt alta yerleştiren satır. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

/** Zengin metin ve seçici gibi kendi etiketini taşıyan alanların sarmalayıcısı. */
export function FieldBlock({ children }: { children: ReactNode }) {
  return <div className={styles.field}>{children}</div>
}

/**
 * <label> kullanamayan alanların (zengin metin editörü, radyo grubu) görünen başlığı.
 * Bağ `aria-label`/`aria-labelledby` ile bileşenin kendi içinde kuruluyor.
 */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className={styles.label}>{children}</span>
}

/** FieldBlock içindeki alanların hata metni; TextField'ınkiyle aynı sözleşme. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className={styles.fieldError}>
      {children}
    </p>
  )
}
