'use client'

import { useEffect, useRef } from 'react'
import styles from './PanelNotice.module.css'

// Kaydetme ve silme sonrası tek geri bildirim. Odak açıkça buraya taşınıyor ve bunun iki
// gerekçesi var (makaleler/DeleteNotice ile aynı ölçüm):
//
// 1. Canlı bölgeler DEĞİŞİMİ duyurur. Bu bildirim yönlendirmeden sonraki ilk çizimde
//    zaten sayfada olduğu için ekran okuyucu onu kendiliğinden okumayabilir; odaklanan
//    öğe ise her durumda okunur.
// 2. Silmede odağı tetikleyen "Sil" düğmesi satırla birlikte kalkıyor. Müdahale edilmezse
//    odak <body>'ye düşer: klavye kullanıcısı sekmeye bastığında sayfanın en başına döner
//    ve işlemin olup olmadığını hiç öğrenemez (WCAG 4.1.3).
//
// Çağıran, panelNoticeState'in ürettiği `key` ile çiziyor: ardışık işlemlerde bileşen
// yeniden kuruluyor ve effect yeniden koşuyor.
export function PanelNotice({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <p ref={ref} tabIndex={-1} role="status" className={styles.notice}>
      {message}
    </p>
  )
}
