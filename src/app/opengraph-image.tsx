import { ImageResponse } from 'next/og'
import { SITE } from '@/content/site'

// Paylaşım kartı görseli. Statik bir .png yerine kod: büro adı `settings` tablosundan
// değiştirilebiliyor ve elle çizilmiş bir görsel ilk ad değişikliğinde yalan söylemeye
// başlardı. Burada SITE sabiti okunuyor — VERİTABANI DEĞİL: bu dosya derleme anında bir
// kez çalışıyor (aşağıdaki "statically optimized" notu), o sırada veritabanına gitmek
// derlemeyi çalışan bir sunucuya bağımlı hâle getirirdi.
//
// API `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/
// opengraph-image.md` dosyasından doğrulandı: varsayılan dışa aktarım + `alt`, `size`,
// `contentType` sabitleri.

export const alt = `${SITE.name} — hukuki danışmanlık ve dava takibi`

// Open Graph'ın beklediği 1.91:1 oranı; bundan sapan görselleri paylaşım önizlemesi kırpar.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Görsel oluşturucu (satori) CSS değişkeni ve `color-mix()` çözmez; globals.css'teki
// token'ların ham karşılıkları burada TEKRAR yazılmak zorunda. Değerler --ink, --ink-2,
// --gold ve --text-ink ile birebir aynı; token'lar değişirse burası elle güncellenir.
const INK = '#161d27'
const INK_2 = '#1f2732'
const GOLD = '#c9a86a'
const TEXT = '#f3f1ea'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '96px',
          // Sitenin hero yüzeyiyle aynı kurgu: sağ üstten düşen altın aydınlanma.
          backgroundColor: INK,
          backgroundImage: `radial-gradient(1000px 640px at 82% 8%, ${INK_2}, ${INK})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: GOLD,
          }}
        >
          Hukuk Bürosu
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 92,
            lineHeight: 1.05,
            color: TEXT,
          }}
        >
          {SITE.name}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 34,
            color: '#aab1bc',
          }}
        >
          Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık
        </div>

        {/* Altın çizgi: kartın alt kenarına oturan tek imza öğesi. */}
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            width: 168,
            height: 4,
            backgroundColor: GOLD,
          }}
        />
      </div>
    ),
    size,
  )
}
