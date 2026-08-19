import type { Metadata } from 'next'
import Image from 'next/image'
import { listMedia } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { mediaUrl } from '@/lib/media-url'
import { MediaUploadForm } from '@/components/MediaUploadForm'
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

type MediaPageProps = { searchParams: Promise<MediaNoticeQuery> }

export default async function MediaPage({ searchParams }: MediaPageProps) {
  await requireAccess('media')
  const [items, query] = await Promise.all([listMedia(), searchParams])
  const { formKey, notice } = mediaNoticeState(query)

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
          <ul className={styles.grid}>
            {items.map((item) => (
              <li key={item.id} className={`card ${styles.item}`}>
                <Image
                  src={mediaUrl(item.path)}
                  alt={item.altText}
                  width={item.width}
                  height={item.height}
                  sizes={GRID_IMAGE_SIZES}
                  className={styles.image}
                />
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
