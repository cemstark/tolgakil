import { SITE } from '@/content/site'
import styles from './OfficeLocationNote.module.css'

/**
 * Büronun hangi il ve ilçede faaliyet gösterdiğini bildiren tek cümlelik not.
 *
 * **Neden var:** site sahibi, büronun Samsun'da çalıştığının sayfalarda görünür olmasını
 * istedi (28.08.2026). Konum bilgisi daha önce yalnız alt bilgideki adreste, JSON-LD
 * şemasında ve anasayfa hero paragrafındaydı; yedi çalışma alanı sayfasının GÖVDESİNDE
 * hiç geçmiyordu — sayfayı arama sonucundan açan biri büronun nerede olduğunu ancak en
 * alta inerse görüyordu.
 *
 * **Mevzuat sınırı (spec §2.1 — TBB Reklam Yasağı Yönetmeliği):** yönetmelik büro adresini
 * açıkça YAYIMLANABİLİR bilgiler arasında sayıyor, dolayısıyla "şu ilçede faaliyet
 * gösterir" cümlesi serbest. Buna karşılık spec, şehir + hukuk dalı kombinasyonlarının
 * yoğun kullanımını ("Samsun Gayrimenkul Avukatı" kalıbı) iş sağlama sayılabileceği için
 * yasaklıyor. Bu yüzden cümle alanın adını İÇERMİYOR: her sayfada aynı, nötr ve yalnız
 * konum bildiren bir ifade. Sayfa başına özelleştirilmesi tam olarak yasak kalıbı üretirdi.
 *
 * Metin müşteri belgesinin (07.08.2026) kendi cümlesinden alınmıştır: *"Akil Hukuk Bürosu,
 * Samsun ili İlkadım ilçesinde faaliyet gösteren ... bir hukuk bürosudur."* Uydurulmuş bir
 * tanıtım cümlesi değil, avukatın onayladığı ifadenin kısaltılmışı.
 */
export function OfficeLocationNote() {
  return (
    <p className={styles.note}>
      {SITE.name}, {SITE.city} ili {SITE.district} ilçesinde faaliyet göstermektedir.
    </p>
  )
}
