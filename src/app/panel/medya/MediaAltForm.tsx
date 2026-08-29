'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/lib/validation'
import { updateMediaAlt } from './actions'
import styles from './MediaAltForm.module.css'

// Değer değil yalnız TİP alınıyor: validation.ts modül seviyesinde z.config çağırdığı için
// yan etkili, değer olarak import edilirse zod istemci paketine girer.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type MediaAltFormProps = { mediaId: number; altText: string }

/**
 * Seçili görselin alt metnini düzenleyen form (devir tasarımı 5d, medya detay paneli).
 *
 * Alan DENETİMLİ ve `key` ile sıfırlanıyor: seçim değiştiğinde React aynı bileşeni yeniden
 * kullanıyor ve denetimsiz bir alan önceki görselin metnini gösterirdi — kullanıcı
 * farkında olmadan yanlış kaydın metnini kaydedebilirdi. Anahtar sayfa tarafında
 * (mediaId) veriliyor.
 */
export function MediaAltForm({ mediaId, altText }: MediaAltFormProps) {
  const [state, formAction, isPending] = useActionState(updateMediaAlt, INITIAL_STATE)
  const [value, setValue] = useState(altText)

  const fieldError = state.errors.altText?.join(' ')

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="id" value={mediaId} readOnly />
      {/* Kimlikler "-edit" ekiyle: YÜKLEME formunda da id="media-alt" var ve aynı sayfada
          iki kez çizilince belge geçersiz HTML üretiyor, <label> yanlış alana bağlanıyordu.
          (Testte yakalandı: detay panelindeki alan hiç bulunamıyordu.) */}
      {/* Etiket "Alt metin" DEĞİL: yükleme formundaki alan da o adı taşıyor ve aynı
          sayfada iki alanın erişilebilir adı birebir aynı olunca hem ekran okuyucu
          kullanıcısı hangisinde olduğunu ayırt edemiyor hem de otomasyon iki eşleşme
          buluyordu. */}
      <label htmlFor="media-alt-edit" className={styles.label}>
        Alt metni düzenle
      </label>
      <textarea
        id="media-alt-edit"
        name="altText"
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={styles.textarea}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? 'media-alt-edit-error' : 'media-alt-edit-hint'}
      />
      <p id="media-alt-edit-hint" className={styles.hint}>
        Zorunlu. Görselin ne gösterdiğini yazın; ekran okuyucu bunu okur.
      </p>
      {/* role="alert": aria-describedby hatayı yalnız girdiye odaklanınca okutur; formu
          gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı sonucu duymaz. */}
      {fieldError ? (
        <p id="media-alt-edit-error" role="alert" className={styles.error}>
          {fieldError}
        </p>
      ) : null}
      {/* Başarı yolunda buraya hiç dönülmez: eylem yönlendiriyor ve bildirim sayfanın tek
          canlı bölgesinde veriliyor (notices.ts). Buraya yalnız HATA döner. */}
      {!state.ok && state.message ? (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={isPending}>
        Alt metni kaydet
      </button>
    </form>
  )
}
