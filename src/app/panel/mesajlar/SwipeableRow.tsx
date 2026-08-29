'use client'

import { useRef, useState, type ReactNode } from 'react'
import styles from './SwipeableRow.module.css'

type SwipeableRowProps = {
  children: ReactNode
  /** Seçili satır işareti; sunucu tarafında hesaplanıp buraya geçiliyor. */
  isCurrent: boolean
  /** Okunmamış mesajda sola kaydırma "Okundu işaretle"yi tetikler; okunmuşta işlevsiz. */
  canMarkRead: boolean
}

// Kaydırmanın eylemi tetiklemesi için gereken yatay mesafe. 64px ölçüldü: daha küçüğü
// listeyi dikey kaydırırken parmağın doğal yatay sapmasıyla yanlışlıkla tetikleniyor,
// daha büyüğü dar ekranda satırın dışına taşıyor.
const ESIK = 64

// Dikey kaydırma önceliği: parmak yatayda ESIK'e ulaşmadan dikeyde bu kadar yol aldıysa
// hareket "listeyi kaydırma" sayılıyor ve satır hiç tepki vermiyor.
const DIKEY_IPTAL = 12

/**
 * Mesaj satırı: mobilde sola kaydırınca "Okundu işaretle"yi tetikler.
 *
 * **Eylemler GİZLENMİYOR.** Devir tasarımı (4a) satırın altından açılan iki düğme
 * gösteriyor; burada düğmeler satırda GÖRÜNÜR kalıyor ve kaydırma yalnızca bir KISAYOL.
 * Gerekçe erişilebilirlik: kaydırmayla açılan bir eylem klavyeyle, ekran okuyucuyla ve
 * kaba motor becerisiyle kullanılamaz (WCAG 2.5.7 her sürükleme için tek işaretçili
 * alternatif istiyor). Düğmeleri gizleyip "isteyen kaydırsın" demek, o alternatifi yok
 * etmek olurdu. Bu haliyle kaydırma hızlı yol, düğme ise herkesin yolu.
 *
 * Yalnızca DOKUNMA olaylarını dinliyor: farede kaydırma jesti yok, orada düğme zaten
 * tek adım.
 */
export function SwipeableRow({ children, isCurrent, canMarkRead }: SwipeableRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  // Konum HEM ref'te HEM durumda: durum yalnız çizim için, karar ref'ten okunuyor.
  // Yalnız duruma bakılsaydı hızlı bir jestte React güncellemeyi henüz uygulamamış olur
  // ve touchend anında değer hâlâ 0 görünürdü — eşik hiç aşılmamış sayılırdı. Testte de
  // tam bu yakalandı: üç olay ardışık gönderildiğinde araya render girmiyor.
  const offsetRef = useRef(0)
  const [offset, setOffset] = useState(0)

  function konumla(deger: number) {
    offsetRef.current = deger
    setOffset(deger)
  }

  function onTouchStart(event: React.TouchEvent<HTMLTableRowElement>) {
    if (!canMarkRead) return
    const t = event.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchMove(event: React.TouchEvent<HTMLTableRowElement>) {
    const s = start.current
    if (s === null) return
    const t = event.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y

    // Dikey niyet: kullanıcı listeyi kaydırıyor, satırı değil.
    if (Math.abs(dy) > DIKEY_IPTAL && Math.abs(dy) > Math.abs(dx)) {
      start.current = null
      konumla(0)
      return
    }
    // Yalnız SOLA kaydırma anlamlı; sağa çekmek satırı yerinden oynatmıyor.
    konumla(dx < 0 ? Math.max(dx, -ESIK) : 0)
  }

  function onTouchEnd() {
    const tetiklendi = offsetRef.current <= -ESIK
    start.current = null
    konumla(0)
    if (!tetiklendi) return

    // Satırın kendi "Okundu işaretle" formu gönderiliyor — kaydırma ayrı bir yol değil,
    // aynı sunucu eyleminin kısayolu. Form bulunamazsa (okunmuş mesaj) sessizce hiçbir
    // şey olmuyor.
    const form = rowRef.current?.querySelector('form')
    form?.requestSubmit()
  }

  return (
    <tr
      ref={rowRef}
      className={styles.row}
      aria-current={isCurrent ? 'true' : undefined}
      style={offset === 0 ? undefined : { transform: `translateX(${offset}px)` }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {children}
    </tr>
  )
}
