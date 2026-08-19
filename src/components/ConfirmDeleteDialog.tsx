'use client'

import { useActionState, useId, useRef } from 'react'
import type { FormState } from '@/lib/validation'
import styles from './ConfirmDeleteDialog.module.css'

// Değer değil yalnız TİP alınıyor: validation.ts modül seviyesinde z.config çağırdığı için
// yan etkili, değer olarak import edilirse zod ve bütün panel şemaları istemci paketine girer.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type ConfirmDeleteDialogProps = {
  /**
   * Silme action'ı sunucu bileşeninden prop olarak geliyor. Doğrudan import edilseydi bu
   * bileşen tek bir kaynağa çivilenirdi; kadro, çalışma alanı, kategori ve mesaj listeleri
   * aynı kip pencereyi kendi action'larıyla kullanıyor.
   */
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  recordId: number
  /** Kip pencerenin h2 başlığı, ör. "Makaleyi sil". */
  heading: string
  /** Silinecek kaydın kullanıcıya görünen adı; onay metnine tırnak içinde giriyor. */
  recordName: string
  /** Satırdaki tetikleyicinin erişilebilir adı; birden çok satırda "Sil" yalnız başına yetersiz. */
  triggerLabel?: string
}

export function ConfirmDeleteDialog({
  action,
  recordId,
  heading,
  recordName,
  triggerLabel,
}: ConfirmDeleteDialogProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // useId(): kimlik İÇERİKTEN türetilmiyor. Başlıktan üretilen bir kimlik ("Kadro kaydını
  // sil") BOŞLUK taşıyordu; `aria-labelledby` boşlukla ayrılmış bir IDREF LİSTESİ olduğu
  // için tarayıcı onu üç ayrı kimliğe bölüyor, hiçbiri eşleşmiyor ve kip pencere ADSIZ
  // duyuruluyordu — kullanıcı neyi sildiğini duymadan onaylıyordu. ASCII boşluk HTML
  // `id` içinde zaten geçersiz. Kayıt kimliği de yetmez: aynı satırda ileride ikinci bir
  // pencere açılırsa çakışırdı.
  const titleId = useId()

  // Başarı yolunda buraya hiç dönülmez: action listeye yönlendiriyor ve bildirim orada,
  // odaklanan bir role="status" bölgesinde veriliyor (bkz. DeleteNotice). Bu bileşene
  // yalnız HATA döner; o zaman kip pencere açık kalıp gerekçeyi gösteriyor.
  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-label={triggerLabel}
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
          {heading}
        </h2>
        <p className={styles.body}>
          “{recordName}” kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>

        {!state.ok && state.message ? (
          <p role="alert" className={styles.error}>
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className={styles.actions}>
          <input type="hidden" name="id" value={recordId} readOnly />
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
