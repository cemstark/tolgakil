import Link from 'next/link'
import { PageHeading } from '@/components/PageHeading'
import styles from './NotFoundContent.module.css'

// İçerik iki not-found boundary'sinde de aynı: kök not-found.tsx kabuğu kendi sarar,
// (site)/not-found.tsx kabuğu grubun layout'undan alır. Metin tek yerde tutuluyor.
export function NotFoundContent() {
  return (
    <section className="pageShell">
      <PageHeading eyebrow="Bulunamadı" title="Sayfa bulunamadı" />
      <p>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/" className={`textLink ${styles.link}`}>Ana sayfaya dön</Link>
    </section>
  )
}
