'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { MediaOption } from '@/db/queries/media'
import { mediaUrl } from '@/lib/media-url'
import { useFormResult } from './EntityForm'
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
  // Senaryo gerçek: editör A bu formu açıkken B aynı görseli kitaplıktan siliyor. Liste
  // sunucudan A'nın sayfa yüklemesiyle geldiği için seçenek duruyor ama dosya gitti;
  // yedek olmadan kullanıcı kırık bir görsel simgesi görüyor ve neyi seçtiğini anlamıyor.
  // Kimlikler kümede tutuluyor: bir seçeneğin düşmesi diğerlerini etkilemesin.
  const [brokenIds, setBrokenIds] = useState<ReadonlySet<number>>(new Set())
  const markBroken = (id: number) => setBrokenIds((current) => new Set(current).add(id))

  // Radyolar denetimsiz ve her sonuçta yeniden kuruluyor; gerekçesi FormResultProvider'da:
  // React 19 form action'dan sonra formu sıfırlıyor ve denetimli `checked` geri gelmiyor.
  const resultKey = useFormResult()

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
            key={resultKey}
            type="radio"
            name={name}
            value=""
            defaultChecked={value === ''}
            onChange={() => onChange('')}
            className={styles.radio}
          />
          <span className={styles.optionText}>{emptyOptionLabel}</span>
        </label>

        {options.map((option) => (
          <label key={option.id} className={styles.option}>
            <input
              key={resultKey}
              type="radio"
              name={name}
              value={option.id}
              defaultChecked={value === String(option.id)}
              onChange={() => onChange(String(option.id))}
              className={styles.radio}
            />
            {brokenIds.has(option.id) ? (
              // Yedek GÖRÜNÜR metin taşıyor ve aria-hidden DEĞİL: eksik dosya kullanıcının
              // bilmesi gereken bir durum, süs değil. Alt metin yanındaki etikette zaten
              // okunuyor, bu yüzden burada yalnız eksiklik yazıyor.
              <span className={styles.thumbFallback}>Görsel yok</span>
            ) : (
              /* alt="" bilinçli: alt metin hemen yanında GÖRÜNÜR etiket olarak duruyor,
                 görsele de yazılsaydı ekran okuyucu aynı cümleyi iki kez okurdu. */
              <Image
                src={mediaUrl(option.path)}
                alt=""
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                className={styles.thumb}
                onError={() => markBroken(option.id)}
              />
            )}
            <span className={styles.optionText}>{option.altText}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
