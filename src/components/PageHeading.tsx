import styles from './PageHeading.module.css'

type PageHeadingProps = { title: string; eyebrow: string }

// Plan 2/3'teki tüm iç sayfaların ortak başlık bloğu; her sayfa tek h1'i buradan alır.
export function PageHeading({ title, eyebrow }: PageHeadingProps) {
  return (
    <header className={styles.block}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
    </header>
  )
}
