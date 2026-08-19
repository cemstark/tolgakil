import type { ReactNode } from 'react'
import styles from './PanelHeading.module.css'

type PanelHeadingProps = {
  title: string
  description?: string
  /** Sağa yaslanan birincil eylem (ör. "Yeni makale" düğmesi). */
  action?: ReactNode
}

// Her panel sayfası aynı başlık bloğuyla açılır: h1, isteğe bağlı açıklama ve tek eylem.
// Görev 5-7'nin liste sayfaları bunu tüketecek.
export function PanelHeading({ title, description, action }: PanelHeadingProps) {
  return (
    <div className={styles.heading}>
      <div>
        <h1>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
