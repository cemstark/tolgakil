'use client'

import { useEffect } from 'react'
import { SITE } from '@/content/site'

// error.tsx kök layout'un İÇİNDEKİ hataları yakalar; layout.tsx'in kendisi patlarsa
// (Plan 2'de settings sorgusu gibi) devreye giren tek yer burasıdır. Bu dosya kendi
// <html>/<body>'sini yazmak ZORUNDA ve globals.css/next-font hiç yüklenmez (bkz.
// node_modules/next/dist/docs/.../error.md "Global Error" bölümü) — bu yüzden token
// değerleri burada var(--token) değil, aynı token'ların birebir kopyası olarak
// sabitlenmiştir. metadata/generateMetadata de aynı sebeple desteklenmiyor.
type GlobalErrorProps = { error: Error & { digest?: string }; retry: () => void }

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#161d27', // --ink
          color: '#f3f1ea', // --text-ink
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '480px', padding: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Bir şeyler ters gitti</h1>
          <p style={{ marginBottom: '24px', lineHeight: 1.6 }}>
            Sayfa yüklenemedi. Tekrar deneyebilir veya bize telefonla ulaşabilirsiniz:{' '}
            <a href={SITE.phoneHref} style={{ color: '#c9a86a' }}>{SITE.phone}</a>{/* --gold */}.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: '10px 24px',
              borderRadius: '999px',
              border: '1px solid rgba(243, 241, 234, .12)', // --line-ink
              background: 'transparent',
              color: 'inherit',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  )
}
