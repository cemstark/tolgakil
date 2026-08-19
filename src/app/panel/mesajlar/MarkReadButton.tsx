'use client'

import { useActionState } from 'react'
import type { FormState } from '@/lib/validation'
import { markRead } from './actions'
import styles from './MarkReadButton.module.css'

// Değer değil yalnız TİP alınıyor: validation.ts modül seviyesinde z.config çağırdığı için
// yan etkili, değer olarak import edilirse zod istemci paketine girer.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type MarkReadButtonProps = { messageId: number; subject: string }

export function MarkReadButton({ messageId, subject }: MarkReadButtonProps) {
  const [state, formAction, isPending] = useActionState(markRead, INITIAL_STATE)

  // Başarı yolunda buraya hiç dönülmez: action listeye yönlendiriyor ve bildirim orada,
  // odaklanan bir role="status" bölgesinde veriliyor. Buraya yalnız HATA döner.
  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="id" value={messageId} readOnly />
      {/* Görünen metin kısa, erişilebilir ad konuyu taşıyor: listede onlarca "Okundu
          işaretle" düğmesi yan yana durduğunda hangisinin hangi mesaja ait olduğu yalnız
          görsel konumdan anlaşılmamalı. */}
      <button
        type="submit"
        className={styles.button}
        aria-label={`Okundu işaretle: ${subject}`}
        disabled={isPending}
      >
        Okundu işaretle
      </button>
      {!state.ok && state.message ? (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
