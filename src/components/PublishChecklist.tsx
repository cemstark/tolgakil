'use client'

import styles from './PublishChecklist.module.css'

type PublishChecklistProps = {
  /** formatBannedMatch çıktıları: ifade + karakter konumu + bağlam. */
  warnings: string[]
  acknowledged: boolean
  onAcknowledgedChange: (value: boolean) => void
}

// Reklam yasağı taraması ENGEL DEĞİL, onaylı uyarıdır (global kısıt): meşru bir hukuk
// makalesi "ücret" veya "uzman görüşü" kelimesini teknik anlamda geçirebilir, yazarı
// kilitlemek işi sabote eder. Kutu yalnız bulgu varken çizilir.
export function PublishChecklist({ warnings, acknowledged, onAcknowledgedChange }: PublishChecklistProps) {
  if (warnings.length === 0) return null

  return (
    <div className={styles.box}>
      {/* role="alert" gövdeyi sarar, onay kutusunu değil: canlı bölge içine konan bir
          kontrol bazı ekran okuyucularda her değişimde yeniden okunur. */}
      <div role="alert" className={styles.body}>
        <h2 className={styles.title}>Reklam yasağı kontrolü</h2>
        <p className={styles.intro}>
          Aşağıdaki ifadeler TBB Reklam Yasağı Yönetmeliği kapsamında sorun çıkarabilir.
          Yönetmelik; iş getirme amacı taşıyan ifadeleri, başarı ve kazanılmış dava oranlarını,
          müvekkil yorumlarını, ücret ve indirim duyurularını sayar.
        </p>
        <ul className={styles.list}>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
        <p className={styles.note}>
          Bu tarama hukuki denetim yerine geçmez. Tereddüt hâlinde bağlı bulunduğunuz baroya danışın.
        </p>
      </div>

      <label className={styles.acknowledge}>
        <input
          type="checkbox"
          name="adBanAcknowledged"
          value="evet"
          checked={acknowledged}
          onChange={(event) => onAcknowledgedChange(event.target.checked)}
        />
        Bu metni okudum, sorumluluk bende — yayımla
      </label>
    </div>
  )
}
