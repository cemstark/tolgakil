'use client'

import { useEffect, useRef } from 'react'
import styles from './DeleteNotice.module.css'

// Silme sonrası tek geri bildirim. Odak açıkça buraya taşınıyor ve bunun iki gerekçesi var:
//
// 1. Canlı bölgeler DEĞİŞİMİ duyurur. Bu bildirim yönlendirmeden sonraki ilk çizimde
//    zaten sayfada olduğu için ekran okuyucu onu kendiliğinden okumayabilir; odaklanan
//    öğe ise her durumda okunur.
// 2. Odağı tetikleyen "Sil" düğmesi satırla birlikte kalktı. Müdahale edilmezse odak
//    <body>'ye düşer: klavye kullanıcısı sekmeye bastığında sayfanın en başına döner ve
//    silmenin olup olmadığını hiç öğrenemez (WCAG 4.1.3).
export function DeleteNotice() {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <p ref={ref} tabIndex={-1} role="status" className={styles.notice}>
      Makale silindi.
    </p>
  )
}
