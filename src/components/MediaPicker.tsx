'use client'

import Image from 'next/image'
import type { MediaOption } from '@/db/queries/media'
import { mediaUrl } from '@/lib/media-url'
import styles from './MediaPicker.module.css'

const THUMB_SIZE = 96

type MediaPickerProps = {
  name: string
  options: MediaOption[]
  /** Seçim yapılmadığında boş dize; sütun NULL bekliyor. */
  value: string
  onChange: (value: string) => void
  /** Hata metninin kimliği; gruba girildiğinde ekran okuyucu bunu da okur. */
  describedBy?: string
  /** Grubun görünen adı. Kadro formunda seçilen şey kapak değil avukat fotoğrafı. */
  legend?: string
  /** "Seçim yok" seçeneğinin metni; grubun adıyla uyumlu olmalı. */
  emptyOptionLabel?: string
}

/**
 * Kapak görseli seçici. Radyo grubu seçildi: tek seçim semantiği, ok tuşlarıyla gezinme ve
 * grup adının okunması tarayıcıdan geliyor; özel bir ızgara bunların hepsini elle
 * kurmak zorunda kalırdı.
 */
export function MediaPicker({
  name,
  options,
  value,
  onChange,
  describedBy,
  legend = 'Kapak görseli',
  emptyOptionLabel = 'Kapak yok',
}: MediaPickerProps) {
  return (
    <fieldset className={styles.group} aria-describedby={describedBy}>
      <legend className={styles.legend}>{legend}</legend>

      {options.length === 0 ? (
        <p className={styles.empty}>
          Kitaplıkta görsel yok. Medya bölümünden görsel yükledikten sonra burada seçebilirsiniz.
        </p>
      ) : null}

      <div className={styles.options}>
        <label className={styles.option}>
          <input
            type="radio"
            name={name}
            value=""
            checked={value === ''}
            onChange={() => onChange('')}
            className={styles.radio}
          />
          <span className={styles.optionText}>{emptyOptionLabel}</span>
        </label>

        {options.map((option) => (
          <label key={option.id} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === String(option.id)}
              onChange={() => onChange(String(option.id))}
              className={styles.radio}
            />
            {/* alt="" bilinçli: alt metin hemen yanında GÖRÜNÜR etiket olarak duruyor,
                görsele de yazılsaydı ekran okuyucu aynı cümleyi iki kez okurdu. */}
            <Image
              src={mediaUrl(option.path)}
              alt=""
              width={THUMB_SIZE}
              height={THUMB_SIZE}
              className={styles.thumb}
            />
            <span className={styles.optionText}>{option.altText}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
