'use client'

import { useActionState } from 'react'
import type { FormState } from '@/lib/validation'
import { movePracticeArea } from './actions'
import styles from './MoveButtons.module.css'

// Değer değil yalnız TİP alınıyor: validation.ts modül seviyesinde z.config çağırdığı için
// yan etkili, değer olarak import edilirse zod istemci paketine girer.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type MoveButtonsProps = {
  areaId: number
  name: string
  /** Listenin ilk kaydında "yukarı" çizilmez. */
  isFirst: boolean
  /** Listenin son kaydında "aşağı" çizilmez. */
  isLast: boolean
}

/**
 * Çalışma alanını listede bir sıra yukarı/aşağı taşıyan düğme çifti.
 *
 * **Neden sürükle-bırak değil:** sürükleme tek başına klavyeyle ve ekran okuyucuyla
 * yapılamaz; WCAG 2.5.7 sürüklemeyle yapılan her işlem için tek işaretçili bir alternatif
 * istiyor. Bu iki düğme fare, dokunmatik ve klavyede aynı şekilde çalışıyor — alternatif
 * değil, doğrudan çözüm. Sunucu tarafındaki gerekçe movePracticeArea'nın başında.
 *
 * Uçtaki düğme ÇİZİLMİYOR, `disabled` değil: devre dışı bir düğme klavye sırasında yer
 * tutup hiçbir şey yapmıyor ve ekran okuyucuya "buton, devre dışı" diye okunuyor. Yokluk
 * daha az gürültülü.
 */
export function MoveButtons({ areaId, name, isFirst, isLast }: MoveButtonsProps) {
  const [state, formAction, isPending] = useActionState(movePracticeArea, INITIAL_STATE)

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="id" value={areaId} readOnly />
      <div className={styles.group}>
        {/* Erişilebilir ad kaydın adını taşıyor: listede yan yana duran onlarca ok
            düğmesinin hangisinin hangi alana ait olduğu yalnız görsel konumdan
            anlaşılmamalı. Görünen içerik ok işareti, o yüzden aria-hidden. */}
        {isFirst ? null : (
          <button
            type="submit"
            name="direction"
            value="up"
            className={styles.button}
            aria-label={`Yukarı taşı: ${name}`}
            disabled={isPending}
          >
            <span aria-hidden="true">↑</span>
          </button>
        )}
        {isLast ? null : (
          <button
            type="submit"
            name="direction"
            value="down"
            className={styles.button}
            aria-label={`Aşağı taşı: ${name}`}
            disabled={isPending}
          >
            <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>
      {/* Durum BURADA duyuruluyor, sayfa bildirimi olarak DEĞİL. Diğer panel eylemleri
          bildirimi adres üzerinden taşıyor (?kaydedildi=/?silindi=) çünkü yönlendirme
          useActionState durumunu sıfırlıyor; taşıma ise yönlendirmiyor — revalidatePath
          listeyi yeniden çiziyor ve bu bileşenin durumu ayakta kalıyor. panelNoticeState
          yalnız o iki anahtarı tanıdığı için üçüncüsünü eklemek sunucu sözleşmesine
          dokunmak olurdu.

          Sıra değişimi GÖRSEL bir olay: ekran okuyucu kullanıcısı satırın yer
          değiştirdiğini göremez, bu yüzden role="status" ile duyurulması şart. */}
      {state.message ? (
        <p role={state.ok ? 'status' : 'alert'} className={state.ok ? styles.status : styles.error}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
