import type { ReactNode } from 'react'
import styles from './PanelTable.module.css'

type PanelTableProps = {
  /** Kaydırılabilir grubun erişilebilir adı, ör. "Kadro listesi". */
  label: string
  /** Tablonun ne gösterdiğini ve hangi sıraya göre dizildiğini anlatan başlık. */
  caption: string
  columns: readonly string[]
  children: ReactNode
}

/**
 * Panel liste tablolarının ortak kabuğu.
 *
 * Geniş tabloyu dar ekranda yatay kaydırılabilir tutan sarmalayıcı; `tabIndex` ile klavye
 * kullanıcısı da kaydırabiliyor (WCAG 2.1.1 — fare olmadan da kaydırılabilmeli).
 *
 * `role="region"`, `role="group"` değil: odaklanan sarmalayıcı bir yer imi olmalı ki ekran
 * okuyucu kullanıcısı odağın nereye düştüğünü duysun ve bölge listesinden doğrudan buraya
 * atlayabilsin. `group` erişilebilir adı taşır ama yer imi listesine girmez.
 */
export function PanelTable({ label, caption, columns, children }: PanelTableProps) {
  return (
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={label}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// Hücre içi durum rozetleri ve bağlantılar sayfa dosyalarında çiziliyor; sınıflar tek
// yerde dursun diye stil nesnesi dışa aktarılıyor.
export { styles as panelTableStyles }
