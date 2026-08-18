import Link from 'next/link'
import { PageHeading } from '@/components/PageHeading'
import styles from './not-found.module.css'

export default function NotFoundPage() {
  return (
    <section className="pageShell">
      <PageHeading eyebrow="Bulunamadı" title="Sayfa bulunamadı" />
      <p>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/" className={`textLink ${styles.link}`}>Ana sayfaya dön</Link>
    </section>
  )
}
