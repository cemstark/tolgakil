'use client'

import { useEffect } from 'react'
import { PageHeading } from '@/components/PageHeading'
import { SITE } from '@/content/site'
import styles from './error.module.css'

// Next 16.3'te `retry` stabilleşti; `reset` artık yeniden veri çekmeden yeniden çizer
// (bkz. node_modules/next/dist/docs/.../error.md "retry"/"reset" bölümleri). Plan 2'de
// bir MySQL sorgusu patlarsa reset() aynı hatayı anında geri getirir — retry() içeriği
// yeniden çekip render eder, kurtarma düğmesi gerçekten işlevli olur.
type ErrorPageProps = { error: Error & { digest?: string }; retry: () => void }

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  // Hata yutulmaz: konsola loglanır, kullanıcıya telefonla ulaşma alternatifi sunulur.
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="pageShell">
      <PageHeading eyebrow="Hata" title="Bir hata oluştu" />
      <p>
        Sayfa yüklenemedi. Tekrar deneyebilir veya bize telefonla ulaşabilirsiniz:{' '}
        <a href={SITE.phoneHref} className="textLink">{SITE.phone}</a>.
      </p>
      <button type="button" onClick={() => retry()} className={styles.retry}>
        Tekrar dene
      </button>
    </section>
  )
}
