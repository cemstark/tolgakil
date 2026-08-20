import styles from './AdBanNotice.module.css'

// Spec §2.1 — TBB Reklam Yasağı Yönetmeliği (son değişiklik 9 Ağustos 2024). Bu liste
// hukuki görüş değildir ve yayını engellemez; tereddütte kalınan içerik için baroya
// danışılması gerekir. Bu insan için yazılmış bir HATIRLATMA; makine tarafından taranan
// ifade listesi değildir — o liste yalnız src/lib/ad-ban.ts içinde tutulur (global kısıt)
// ve buradaki metinle birebir aynı olmak zorunda değildir.
const YASAK_KALEMLER = [
  '“uzman” veya “en iyi” iddiası',
  'başarı oranı veya kazanılmış dava sayısı',
  'müvekkil referansı, yorum veya yıldız derecelendirmesi',
  'ücret bilgisi veya “ücretsiz ilk görüşme” türü çağrılar',
  'canlı sohbetle hukuki tavsiye',
  'üçüncü taraf reklam betiği veya afiliye bağlantı',
  'şehir + hukuk dalı kalıbının yoğun tekrarı',
]

/**
 * Yayın öncesi hatırlatma kutusu.
 *
 * Kimlik sabit yazıldı, useId kullanılmadı: bileşen sunucuda çiziliyor ve aynı sayfada
 * ikinci bir örneği yok. İkinci bir yere konursa kimlik çakışır, o zaman istemci bileşenine
 * çevrilip useId'ye geçilmesi gerekir.
 */
export function AdBanNotice() {
  return (
    <section aria-labelledby="ad-ban-title" className={`card ${styles.notice}`}>
      <h2 id="ad-ban-title" className={styles.title}>
        Yayın öncesi kontrol listesi
      </h2>
      <p className={styles.intro}>Yayımlayacağınız metinde aşağıdakiler bulunmamalıdır:</p>
      <ul className={styles.list}>
        {YASAK_KALEMLER.map((kalem) => (
          <li key={kalem}>{kalem}</li>
        ))}
      </ul>
      <p className={styles.footnote}>
        Bu liste hatırlatma amaçlıdır ve hukuki denetim yerine geçmez; tereddüt hâlinde
        kayıtlı olduğunuz baroya danışın.
      </p>
    </section>
  )
}
