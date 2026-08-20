'use client'

import { useState } from 'react'
import styles from './PublishChecklist.module.css'

type PublishChecklistProps = {
  /**
   * formatBannedMatch çıktıları: ifade + karakter konumu + bağlam. Doğrudan
   * `state.warnings` geçilir, `state.warnings ?? []` DEĞİL: aşağıdaki sıfırlama dizi
   * kimliğine bakıyor ve `?? []` her çizimde yeni bir boş dizi üretip sonsuz döngü açardı.
   */
  warnings?: string[]
}

// Reklam yasağı taraması ENGEL DEĞİL, onaylı uyarıdır (global kısıt): meşru bir hukuk
// makalesi "ücret" veya "uzman görüşü" kelimesini teknik anlamda geçirebilir, yazarı
// kilitlemek işi sabote eder. Kutu yalnız bulgu varken çizilir.
//
// Onay kutusunun durumu BU bileşende duruyor, çağıran formda değil: kutunun tek tüketicisi
// FormData ve onu sunucu okuyor, yani forma taşımanın kazancı yoktu; bedeli ise Görev 8'de
// ölçüldü — kutu bir kez işaretlendikten sonra İŞARETLİ KALIYORDU. Aynı sayfada
// ikinci kez yayımlayan kullanıcı, metne yeni bir yasaklı ifade eklemiş olsa bile uyarıyı bir
// daha görmüyordu: sunucu gönderilen onayı görüp taramayı hiç göstermiyordu.
//
// `return null` bileşeni SÖKMEZ (React fiber'ı ve durumu duruyor), o yüzden sıfırlama
// açıkça yazılıyor: her yeni tarama sonucu onayı düşürür.
export function PublishChecklist({ warnings }: PublishChecklistProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [previousWarnings, setPreviousWarnings] = useState(warnings)
  if (previousWarnings !== warnings) {
    setPreviousWarnings(warnings)
    setAcknowledged(false)
  }

  if (warnings === undefined || warnings.length === 0) return null

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
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        Bu metni okudum, sorumluluk bende — yayımla
      </label>
    </div>
  )
}
