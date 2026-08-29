import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { listMedia } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media-url'
import { MediaUploadForm } from '@/components/MediaUploadForm'
import { MediaAltForm } from './MediaAltForm'
import { PanelHeading } from '@/components/PanelHeading'
import { MediaDeleteDialog } from './MediaDeleteDialog'
import { mediaNoticeState, type MediaNoticeQuery } from './notices'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Medya',
  robots: { index: false, follow: false },
}

// Kartlar ızgarada en fazla 320 piksel genişliğinde; tarayıcı bu ipucuyla optimize edilmiş
// görselin doğru boyutunu ister, mobilde 1600 piksellik dosyayı indirmez.
const GRID_IMAGE_SIZES = '(min-width: 700px) 320px, 100vw'

const SIZE_FORMAT = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

// `sec` = detay panelinde gösterilecek görselin kimliği; seçim adres çubuğunda taşınıyor
// (makale ve mesaj listeleriyle aynı sözleşme), istemci durumunda DEĞİL.
type MediaPageProps = { searchParams: Promise<MediaNoticeQuery & { sec?: string }> }

export default async function MediaPage({ searchParams }: MediaPageProps) {
  await requireAccess('media')
  const [items, query] = await Promise.all([listMedia(), searchParams])
  const { formKey, notice } = mediaNoticeState(query)

  // Seçili kayıt: adres çubuğundaki `sec` geçerli bir kimliği gösteriyorsa o, aksi hâlde
  // kitaplığın ilki. Kullanıcı yazabildiği için değer sayıya çevrilip listede ARANIYOR.
  const secilenId = Number.parseInt(query.sec ?? '', 10)
  const secili = items.find((i) => i.id === secilenId) ?? items[0] ?? null

  return (
    <>
      <PanelHeading
        title="Medya"
        description="Yüklenen görseller 1600 piksel genişliğe indirilip WebP olarak saklanır."
      />

      {/* Anahtar her işlemde değişiyor: form yeniden kuruluyor, seçili dosya ve yazılmış
          alt metin temizleniyor. Aksi hâlde yükleme sonrası aynı dosya seçili kalır ve
          ikinci "Yükle" denemesi "zaten kitaplıkta" hatası verirdi. */}
      <MediaUploadForm key={formKey} notice={notice} />

      <section aria-labelledby="media-library-heading" className={styles.library}>
        <h2 id="media-library-heading" className={styles.libraryHeading}>
          Kitaplık
        </h2>

        {items.length === 0 ? (
          <p className={`card ${styles.empty}`}>Henüz görsel yok. Yukarıdaki formla ilk görseli yükleyin.</p>
        ) : (
          <div className={styles.split}>
          <ul className={styles.grid}>
            {items.map((item) => (
              // aria-current="true": seçili kart ekran okuyucuya da bildiriliyor.
              <li
                key={item.id}
                className={`card ${styles.item}`}
                aria-current={secili?.id === item.id ? 'true' : undefined}
              >
                {/* Görsel bir SEÇİM bağlantısı: dokunulduğunda sağdaki detay paneli o
                    kayda geçiyor. scroll={false} — seçim değişince sayfa başa sıçramasın. */}
                <Link href={`?sec=${item.id}`} scroll={false} className={styles.pick}>
                <Image
                  src={mediaUrl(item.path)}
                  alt={item.altText}
                  width={item.width}
                  height={item.height}
                  sizes={GRID_IMAGE_SIZES}
                  className={styles.image}
                />
                <span className={styles.srOnly}>Seç: {item.altText}</span>
                </Link>
                {/* Alt metin görselin adı OLARAK zaten okunuyor; burada ayrıca veri olarak
                    gösteriliyor çünkü kitaplığın işi tam olarak o metni yönetmek. Etiketli
                    yazıldı ki ekran okuyucuda iki cümle birbirinin kopyası gibi duymasın. */}
                <p className={styles.alt}>Alt metin: {item.altText}</p>
                <p className={styles.meta}>
                  {item.width}×{item.height} piksel · {formatSize(item.sizeBytes)} ·{' '}
                  {/* Veritabanı oturumu UTC; @/lib/date biçimlendiricileri timeZone'u
                      açıkça veriyor, ham toLocaleString sunucunun dilimine bağlı çıkardı. */}
                  {formatDateTime(item.createdAt)}
                  {item.uploaderName === null ? null : ` · ${item.uploaderName}`}
                </p>
                <div className={styles.itemActions}>
                  <MediaDeleteDialog mediaId={item.id} altText={item.altText} />
                </div>
              </li>
            ))}
          </ul>

          {/* DETAY PANELİ (devir tasarımı 5d). Alt metin buradan düzeltiliyor; daha önce
              metin yalnız YÜKLEME anında giriliyordu ve düzeltmenin tek yolu görseli
              silip yeniden yüklemekti — kapak olarak bağlı olduğu makaleler de o sırada
              bağlantısını kaybediyordu (FK SET NULL). */}
          {secili !== null ? (
            <aside className={styles.detail} aria-label="Seçili görselin ayrıntısı">
              {/* Önizleme DEKORATİF (alt=""): aynı alt metin hemen altındaki form alanında
                  zaten okunuyor ve panelin kendi erişilebilir adı var. İkinci kez
                  adlandırmak ekran okuyucuda aynı cümlenin arka arkaya iki kez
                  duyulmasına yol açıyordu — ızgaradaki kartla da aynı adı taşıdığı için
                  sayfada tek bir görseli iki ayrı öğe olarak sunuyordu. */}
              <div className={`${styles.detailMedia} mediaFrame`}>
                <Image
                  src={mediaUrl(secili.path)}
                  alt=""
                  width={secili.width}
                  height={secili.height}
                  sizes="360px"
                  className={styles.detailImage}
                />
              </div>

              {/* key: seçim değiştiğinde form sıfırlansın — denetimli alan aksi hâlde
                  önceki görselin metnini gösterip yanlış kaydı kaydettirebilirdi. */}
              <MediaAltForm key={secili.id} mediaId={secili.id} altText={secili.altText} />

              <dl className={styles.meta}>
                <dt>Boyut</dt>
                <dd>
                  {secili.width}×{secili.height} piksel · {formatSize(secili.sizeBytes)}
                </dd>
                <dt>Yüklenme</dt>
                <dd>{formatDateTime(secili.createdAt)}</dd>
                {secili.uploaderName === null ? null : (
                  <>
                    <dt>Yükleyen</dt>
                    <dd>{secili.uploaderName}</dd>
                  </>
                )}
              </dl>
            </aside>
          ) : null}
          </div>
        )}
      </section>
    </>
  )
}

// Bayt sayısı kullanıcıya bir şey anlatmıyor; kilobayt eşiği 1024 tabanlı çünkü sınır
// (8 MB) da öyle ölçülüyor — iki yerde farklı taban kullanmak "7,6 MB dosya 8 MB sınıra
// takıldı" gibi anlaşılmaz bir çelişki üretirdi.
function formatSize(bytes: number): string {
  const kb = bytes / 1024
  // Ondalık ayıracı tr-TR virgülü olmalı; toFixed nokta basar ve panelin geri kalanıyla
  // çelişirdi.
  if (kb < 1024) return `${SIZE_FORMAT.format(Math.round(kb))} KB`
  return `${SIZE_FORMAT.format(kb / 1024)} MB`
}
