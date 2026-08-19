'use client'

import { useActionState } from 'react'
import { login } from './actions'
import type { FormState } from '@/lib/validation'
import styles from './LoginForm.module.css'

// EMPTY_FORM_STATE değeri değil, yalnız TİPİ alınıyor. validation.ts modül seviyesinde
// z.config(z.locales.tr()) çağırdığı için yan etkisi var ve değer olarak import edilirse
// tree-shaking devre dışı kalıyor: ölçüldü, zod ve bütün panel şemaları istemci paketine
// giriyordu (Türkçe doğrulama metinleri .next/static/chunks içinde çıktı).
const INITIAL_STATE: FormState = { ok: false, errors: {} }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE)
  const emailError = state.errors.email?.join(' ')
  const passwordError = state.errors.password?.join(' ')

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <p role="alert" className={styles.alert}>
          {state.message}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={styles.input}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError ? (
          <p id="email-error" className={styles.fieldError}>
            {emailError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          Parola
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'password-error' : undefined}
        />
        {passwordError ? (
          <p id="password-error" className={styles.fieldError}>
            {passwordError}
          </p>
        ) : null}
      </div>

      {/* Gönderim sırasında kilitleniyor: aynı istek iki kez gönderilirse hız sınırı
          kullanıcının kendi denemesini boşa harcar. */}
      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  )
}
