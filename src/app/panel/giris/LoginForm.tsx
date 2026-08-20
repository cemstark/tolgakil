'use client'

import { useActionState, useState } from 'react'
import { login } from './actions'
import type { FormState } from '@/lib/validation'
import styles from './LoginForm.module.css'

// validation.ts'ten yalnız TİP alınıyor, hiçbir değer alınmıyor. O modül seviyesinde
// z.config(z.locales.tr()) çağırdığı için yan etkisi var ve değer olarak import edilirse
// tree-shaking devre dışı kalıyor: ölçüldü, zod ve bütün panel şemaları istemci paketine
// giriyordu (Türkçe doğrulama metinleri .next/static/chunks içinde çıktı).
const INITIAL_STATE: FormState = { ok: false, errors: {} }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE)

  // Alanlar DENETİMLİ. Ölçüldü: React 19 form action tamamlanınca denetimsiz alanları
  // sıfırlıyor — parolayı yanlış giren kullanıcı yazdığı kullanıcı adını da kaybediyor ve
  // baştan yazmak zorunda kalıyordu.
  //
  // Parola da denetimli: yalnız kullanıcı adı korunsaydı sıfırlama yarışı sürerdi. Sıfırlama,
  // gönderim yanıtı geldikten SONRA düştüğü için araya giren bir yazma (kullanıcı ya da
  // otomatik test) silinip form boş gönderilebiliyor. E2E'de bu, "art arda başarısız
  // denemeler hız sınırına takılır" testini rastgele kırmızıya düşürüyordu.
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const usernameError = state.errors.username?.join(' ')
  const passwordError = state.errors.password?.join(' ')

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <p role="alert" className={styles.alert}>
          {state.message}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="username" className={styles.label}>
          Kullanıcı adı
        </label>
        {/* type="text", type="email" DEĞİL: tarayıcı e-posta girdisine kendi doğrulamasını
            dayatıyor ve "admin" gibi geçerli bir kullanıcı adını reddederdi. Biçim denetimi
            sunucuda (lib/username.ts); noValidate zaten tarayıcı balonlarını kapatıyor ama
            girdi tipini de doğru bırakmak mobil klavyeyi ve otomatik doldurmayı düzeltiyor. */}
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={styles.input}
          aria-invalid={usernameError ? true : undefined}
          aria-describedby={usernameError ? 'username-error' : undefined}
        />
        {/* role="alert": aria-describedby hatayı yalnız girdiye odaklanınca okutur. Formu
            gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı, canlı bölge olmadan
            hiçbir şey duymaz — bastığını bilir, sonucunu bilmez. axe bunu ihlal saymıyor. */}
        {usernameError ? (
          <p id="username-error" role="alert" className={styles.fieldError}>
            {usernameError}
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={styles.input}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'password-error' : undefined}
        />
        {passwordError ? (
          <p id="password-error" role="alert" className={styles.fieldError}>
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
