'use client'

import { useEffect } from 'react'
import styles from './error.module.css'

type ErrorPageProps = { error: Error & { digest?: string }; reset: () => void }

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Hata yutulmaz: konsola loglanır, kullanıcıya telefonla ulaşma alternatifi sunulur.
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <h1>Bir hata oluştu</h1>
      <p>
        Sayfa yüklenemedi. Tekrar deneyebilir veya bize telefonla ulaşabilirsiniz:{' '}
        <a href="tel:+902160000000" className="textLink">+90 216 000 00 00</a>.
      </p>
      <button type="button" onClick={reset} className={styles.retry}>
        Tekrar dene
      </button>
    </section>
  )
}
