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
        {/* Konum kaşın içinde: kart WhatsApp ve sosyal ağda bağlantının TEK görünen yüzü ve
            sitenin tamamı Samsun/İlkadım odaklı. SITE sabitinden okunuyor, elle yazılmıyor. */}
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: GOLD,
          }}
        >
          {`Hukuk Bürosu · ${SITE.district} / ${SITE.city}`}
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

        {/* BURADA BİR ZAMANLAR YANLIŞ BİLGİ VARDI (29.08.2026'da düzeltildi): kart
            "Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık" diyordu.
            Aile ve ticaret hukuku büronun çalışma alanları arasında DEĞİL — ikisi de ilk
            kurulumun örnek verisinden kalmıştı — ve büronun asıl alanı olan gayrimenkul
            hiç anılmıyordu. Kart, bağlantı paylaşıldığında sitenin tek görünen yüzü
            olduğu için bu, sitenin en görünür yerinde duran yanlış bir hizmet beyanıydı.

            Metin, ana sayfadaki üst bölüm alt başlığıyla (Hero.tsx) BİREBİR aynı tutuldu:
            iki yerde iki farklı vaat, hangisinin doğru olduğunu belirsizleştirir. Alan
            adları tek tek sayılmıyor çünkü satır kullanılabilir 1008px'e sığmıyordu;
            sayı ("yedi alan") ise belgedeki yedi başlıkla uyumlu.

            PUNTO 34 DEĞİL 29: kullanılabilir genişlik 1200 - 2×96 = 1008px. Yayındaki eski
            kart ölçüldü — 65 karakterlik metin 34px'te 990px sürüyordu, yani satır zaten
            sınırdaydı. Yeni metin 74 karakter ve 34px'te taşardı. Derlenmiş kartla
            doğrulandı: 29px'te metin iki satıra kayıyor (satori kırpmıyor, kaydırıyor) ve
            kart dengede kalıyor; ikinci satır kısa bir kuyruk oluyor, kabul edildi.
            Bu punto değiştirilecekse kart TEKRAR ÜRETİLİP GÖZLE bakılmalı — `next dev`
            altında bu rota 500 veriyor (bilinen sorun), doğrulama ancak `npm run build`
            sonrası `.next/server/app/opengraph-image.body` dosyasına bakılarak yapılabilir. */}
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 29,
            color: '#aab1bc',
          }}
        >
          Gayrimenkul başta olmak üzere yedi alanda avukatlık ve hukuki danışmanlık.
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
