'use client'

import { useActionState, useRef } from 'react'
import { deleteMedia } from '@/app/panel/medya/actions'
import type { FormState } from '@/lib/validation'
import styles from './MediaDeleteDialog.module.css'

// Değer değil yalnız TİP alınıyor: validation.ts modül seviyesinde z.config çağırdığı için
// yan etkili, değer olarak import edilirse zod ve bütün panel şemaları istemci paketine girer.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type MediaDeleteDialogProps = { mediaId: number; altText: string }

export function MediaDeleteDialog({ mediaId, altText }: MediaDeleteDialogProps) {
  const [state, formAction, isPending] = useActionState(deleteMedia, INITIAL_STATE)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = `delete-media-dialog-${mediaId}`

  // Başarı yolunda buraya hiç dönülmez: deleteMedia listeye yönlendiriyor ve bildirim orada,
  // odaklanan bir role="status" bölgesinde veriliyor (bkz. notices.ts). Bu bileşene yalnız
  // HATA döner; o zaman kip pencere açık kalıp gerekçeyi gösteriyor.
  return (
    <>
      {/* Görünen metin her kartta "Sil" olduğu için erişilebilir ad alt metinle
          ayrıştırılıyor; ekran okuyucu kullanıcısı hangi görseli sildiğini bilmeli. */}
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-label={`${altText} görselini sil`}
        onClick={() => dialogRef.current?.showModal()}
      >
        Sil
      </button>

      {/* Yerleşik <dialog> + showModal(): odak tuzağı, Escape ve arka planın inert olması
          tarayıcıdan geliyor. Kapanışta odak açıkça tetikleyene döndürülüyor. */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
      >
        <h2 id={titleId} className={styles.heading}>
          Görseli sil
        </h2>
        <p className={styles.body}>
          “{altText}” görseli ve dosyası kalıcı olarak silinecek. Görseli kapak olarak kullanan
          makaleler kapaksız kalır. Bu işlem geri alınamaz.
        </p>

        {!state.ok && state.message ? (
          <p role="alert" className={styles.error}>
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className={styles.actions}>
          <input type="hidden" name="id" value={mediaId} readOnly />
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
