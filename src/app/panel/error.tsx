'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { PanelHeading } from '@/components/PanelHeading'
import styles from './boundary.module.css'

// Next 16.3'te `retry` içeriği yeniden çekip render eder; `reset` yalnız yeniden çizdiği
// için patlayan bir MySQL sorgusunda aynı hatayı anında geri getirirdi ((site)/error.tsx
// ile aynı gerekçe).
type PanelErrorProps = { error: Error & { digest?: string }; retry: () => void }

export default function PanelError({ error, retry }: PanelErrorProps) {
  // Hata yutulmaz: konsola loglanır, kullanıcıya iki çıkış yolu bırakılır.
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <PanelHeading title="Bir hata oluştu" description="İşlem tamamlanamadı. Tekrar deneyebilirsiniz." />
      <div className={styles.actions}>
        <button type="button" onClick={() => retry()} className={styles.retry}>
          Tekrar dene
        </button>
        <Link href="/panel" className="textLink">Panele dön</Link>
      </div>
    </>
  )
}
