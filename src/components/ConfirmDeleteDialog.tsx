'use client'

import { useActionState, useEffect, useRef } from 'react'
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

  // Silme başarısızsa kip pencere açık kalır ve gerekçe orada okunur; başarılıysa satır
  // zaten yeniden çizimle kaybolur, ama başka bir hata durumunda kilitli kalmasın diye
  // kapanış açıkça yapılıyor.
  useEffect(() => {
    if (state.ok) dialogRef.current?.close()
  }, [state.ok])

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
