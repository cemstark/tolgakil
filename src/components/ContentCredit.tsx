import { CONTENT_APPROVAL } from '@/content/site'
import { formatDate } from '@/lib/date'
import styles from './ContentCredit.module.css'

/**
 * Sayfa metninin kim tarafından hazırlandığını ve ne zaman güncellendiğini bildiren künye.
 *
 * Müvekkil belgesi bunu istiyor (gerekçe ve birebir alıntı: `CONTENT_APPROVAL`). Hukuki
 * içerik yayımlayan bir sitede bu ibare süs değil: okuyan kişi metnin bir avukat tarafından
 * hazırlandığını ve hangi tarihte geçerli olduğunu bilmeli — mevzuat değişince eski bir
 * metne güvenmesin.
 *
 * Tarih hem makine için (`<time dateTime>` ISO) hem insan için (tr-TR) basılıyor; ikisi de
 * tek kaynaktan (`CONTENT_APPROVAL.lastUpdatedIso`) türüyor. Biçimlendirme
 * `src/lib/date.ts`'teki mevcut biçimlendiriciyle yapılıyor — ikinci bir `Intl` örneği
 * kurmak, `vitest.config.mts`'in dilim sabitlemesi sözleşmesinin dışına çıkmak olurdu.
 */
export function ContentCredit() {
  return (
    <p className={styles.credit}>
      Bu sayfadaki metinler {CONTENT_APPROVAL.preparedBy} tarafından hazırlanmış ve
      onaylanmıştır. Son güncelleme:{' '}
      <time dateTime={CONTENT_APPROVAL.lastUpdatedIso}>
        {formatDate(CONTENT_APPROVAL.lastUpdatedIso)}
      </time>
    </p>
  )
}
