'use client'

import { useActionState, useRef } from 'react'
import { deleteArticle } from '@/app/panel/makaleler/actions'
import type { FormState } from '@/lib/validation'
import styles from './ConfirmDeleteDialog.module.css'

// Değer değil yalnız TİP alınıyor: validation.ts modül seviyesinde z.config çağırdığı için
// yan etkili, değer olarak import edilirse zod ve bütün panel şemaları istemci paketine girer.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type ConfirmDeleteDialogProps = { articleId: number; title: string }

export function ConfirmDeleteDialog({ articleId, title }: ConfirmDeleteDialogProps) {
  const [state, formAction, isPending] = useActionState(deleteArticle, INITIAL_STATE)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = `delete-dialog-${articleId}`

  // Başarı yolunda buraya hiç dönülmez: deleteArticle listeye yönlendiriyor ve bildirim
  // orada, odaklanan bir role="status" bölgesinde veriliyor (bkz. DeleteNotice). Bu
  // bileşene yalnız HATA döner; o zaman kip pencere açık kalıp gerekçeyi gösteriyor.
  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => dialogRef.current?.showModal()}
      >
        Sil
      </button>

      {/* Yerleşik <dialog> + showModal(): odak tuzağı, Escape ve arka planın inert olması
          tarayıcıdan geliyor. Kapanışta odak açıkça tetikleyene döndürülüyor — tarayıcılar
          bunu çoğunlukla kendi yapsa da davranış sözleşme, tesadüf değil. */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
      >
        <h2 id={titleId} className={styles.heading}>
          Makaleyi sil
        </h2>
        <p className={styles.body}>
          “{title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>

        {!state.ok && state.message ? (
          <p role="alert" className={styles.error}>
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className={styles.actions}>
          <input type="hidden" name="id" value={articleId} readOnly />
          <button type="button" className={styles.cancel} onClick={() => dialogRef.current?.close()}>
            Vazgeç
          </button>
          <button type="submit" className={styles.confirm} disabled={isPending}>
            {isPending ? 'Siliniyor…' : 'Evet, sil'}
          </button>
        </form>
      </dialog>
    </>
  )
}
