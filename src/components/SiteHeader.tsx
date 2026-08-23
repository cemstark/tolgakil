'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, CTA_LINK, isCurrentPath } from '@/lib/navigation'
import styles from './SiteHeader.module.css'

type SiteHeaderProps = { officeName: string }

// Büro adı prop: bileşen 'use client' ve veriyi kendisi okuyamaz. Elle yazılmış marka
// metni kaldırıldı — ad panelden değişince başlıkta eskisi kalmasın.
export function SiteHeader({ officeName }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const isCurrent = (href: string) => isCurrentPath(pathname, href)

  // Panelin dışına dokununca kapanır. Escape tek çıkış yolu olarak kalsaydı dokunmatik
  // cihazda geri dönüş yolu OLMAZDI — telefonda Escape tuşu yok ve menü düğmesine
  // yeniden basmak tek seçenekti.
  //
  // Dinleyici yalnız panel AÇIKKEN bağlanıyor; kapalıyken her sayfada boşuna çalışan
  // küresel bir dinleyici bırakmanın anlamı yok. `pointerdown` seçildi ('click' değil):
  // fare, dokunmatik ve kalem girdisini tek olayda karşılar ve kullanıcı parmağını
  // kaldırmadan tepki verir.
  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      // `Node` kontrolü zorunlu: olay hedefi her zaman bir DOM düğümü değildir
      // (ör. gölge sınırından gelen olaylar) ve `contains` böyle bir değerle patlar.
      if (!(target instanceof Node)) return
      if (pillRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // WAI-ARIA disclosure deseni: Escape paneli kapatır, odağı tetikleyen düğmeye döndürür.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      menuButtonRef.current?.focus()
    }
  }

  return (
    <header className={styles.header}>
      <div ref={pillRef} className={styles.pill} onKeyDown={handleKeyDown}>
        <Link href="/" className={styles.brand}>
          {officeName}
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Menüyü kapat' : 'Menüyü aç'}
        </button>

        {/* Gezinme sonrası menü KAPANIR. Next istemci tarafında yönlendirdiği için sayfa
            yeniden yüklenmiyor ve bileşen sökülmüyordu: mobilde bir bağlantıya
            dokunulduğunda yeni sayfa açılıyor ama panel açık kalıyor ve içeriğin üstünü
            örtüyordu.
            Kapatma, pathname'i izleyen bir effect ile DEĞİL doğrudan tıklamayla yapılıyor:
            effect içinde setState çağırmak zincirleme render tetikliyor (React'in
            react-hooks/set-state-in-effect kuralı bunu hata sayıyor). Üstelik tıklama
            daha doğru davranıyor — kullanıcı zaten bulunduğu sayfanın bağlantısına
            dokunduğunda pathname hiç değişmez, ama menünün yine de kapanması gerekir.
            Dinleyici tek tek bağlantılara değil kapsayıcıya bağlı; klavyeden Enter da
            tıklama olayı üretir.
            Hedef kontrolü şart: panelin kendi dolgusu (16px) ve kalemler arası aralığı
            (4px) var, oralara denk gelen bir dokunuş hiçbir bağlantıyı çalıştırmadan
            menüyü kapatıyordu — kullanıcı ıskaladığı için menünün kapanması, ıskaladığını
            fark etmeden gezinmeyi kaybetmesi demek. Yalnız bir alt öğeden KABARAN
            tıklamalar kapatır. */}
        <nav
          id="main-menu"
          aria-label="Ana gezinme"
          data-open={open}
          className={styles.nav}
          onClick={(event) => {
            if (event.target === event.currentTarget) return
            setOpen(false)
          }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.link}
              aria-current={isCurrent(l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={CTA_LINK.href}
            className={styles.cta}
            aria-current={isCurrent(CTA_LINK.href) ? 'page' : undefined}
          >
            {CTA_LINK.label}
          </Link>
        </nav>
      </div>
    </header>
  )
}
