import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <section style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: 'var(--section) var(--pad)' }}>
      <h1>Sayfa bulunamadı</h1>
      <p>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/">Ana sayfaya dön</Link>
    </section>
  )
}
