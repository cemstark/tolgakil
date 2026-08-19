import type { ReactNode } from 'react'
import { getPanelUser } from '@/lib/auth-guards'
import { PanelNav } from '@/components/PanelNav'
import styles from './layout.module.css'

export default async function PanelLayout({ children }: { children: ReactNode }) {
  // Koruma burada DEĞİL: /panel/giris de bu layout'un altında ve requireUser() burada
  // çağrılsa sonsuz yönlendirme olurdu. Alt rota grubu da çözmez, grup üstteki layout'u
  // miras alır. Her panel sayfası kendi requireUser()/requireAccess() çağrısını yapar;
  // proxy.ts de ilk hat olarak zaten devrede.
  //
  // auth() değil getPanelUser(): rol ve isActive JWT'de 8 saat donuyor, oysa gezinme
  // rol süzgeciyle çiziliyor. Rolü düşürülen kullanıcı JWT'ye güvenilseydi admin
  // bağlantılarını görmeye devam ederdi (sayfalar 404 verse bile yanıltıcı olurdu).
  const user = await getPanelUser()

  return (
    <div className={styles.layout}>
      <a href="#panel-content" className="skipLink">
        İçeriğe atla
      </a>
      {user ? <PanelNav role={user.role} userName={user.name} /> : null}
      <main id="panel-content" tabIndex={-1} className={styles.content}>
        {children}
      </main>
    </div>
  )
}
