import type { Metadata } from 'next'
import { signOut } from '@/auth'
import { requireUser } from '@/lib/auth-guards'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

// Panel kabuğu, gezinme ve modüller Görev 4+ kapsamında. Buradaki iskelet yalnızca oturumun
// gerçekten açıldığını ve çıkışın korumayı geri getirdiğini gösterir; Görev 4 bunu değiştirir.
export default async function PanelHomePage() {
  const user = await requireUser()

  return (
    <section className="pageShell">
      <h1>Panel</h1>
      <p>Oturum açan: {user.name}</p>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/panel/giris' })
        }}
      >
        <button type="submit" className={styles.signOut}>
          Çıkış yap
        </button>
      </form>
    </section>
  )
}
