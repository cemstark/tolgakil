import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPanelUser } from '@/lib/auth-guards'
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
  // requireUser ile aynı yüklem (getPanelUser) kullanılıyor; farklı olsalardı pasifleştirilmiş
  // kullanıcı iki sayfa arasında sonsuz yönlendirmeye girerdi.
  if (await getPanelUser()) redirect('/panel')

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
