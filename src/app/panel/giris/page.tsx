import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LoginForm } from './LoginForm'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Panel Girişi',
  // Yönetim ekranı arama sonuçlarına girmemeli.
  robots: { index: false, follow: false },
}

export default async function PanelLoginPage() {
  // Kontrol burada yapılmak zorunda: proxy'deki authorized callback'i oturumu açık kullanıcıyı
  // geri göndermiyor, next-auth giriş sayfasında yönlendirmeyi atlıyor (ölçüldü, lib/index.js).
  const session = await auth()
  if (session?.user) redirect('/panel')

  return (
    <section className={styles.shell}>
      <div className={styles.card}>
        <h1>Panel Girişi</h1>
        <p className={styles.intro}>Yönetim paneline erişmek için hesabınızla giriş yapın.</p>
        <LoginForm />
      </div>
    </section>
  )
}
