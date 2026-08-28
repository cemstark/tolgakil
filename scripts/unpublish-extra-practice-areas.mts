// Ortam değişkenlerinin nereden geldiğini scripts/load-env.mts açıklıyor. Bu betik satır
// GÜNCELLEDİĞİ için hedefin ekrana basılması özellikle önemli; yardımcı bunu her çağrıda yapıyor.
import { loadEnvForScript } from './load-env.mts'

loadEnvForScript(process.argv[2])

/**
 * Müşteri belgesinde BULUNMAYAN çalışma alanlarını yayından kaldırır.
 *
 * **Neden gerekti:** üretim veritabanında dokuz çalışma alanı yayındaydı, müşteri belgesinde
 * (07.08.2026) ise yedi tane var. Fazladan `aile-hukuku` ve `ticaret-hukuku`, sitenin ilk
 * kurulumundaki örnek veriden kalmış; özet metinleri de belgeden değil o örnek veriden
 * geliyor ("Boşanma, velayet, nafaka ve mal rejimi süreçleri."). Yani site, avukatın
 * teslim etmediği iki alanda hizmet veriyormuş gibi görünüyordu.
 *
 * **Neden `seed.ts` bunu çözemez:** tohum idempotent ve öyle KALMALI — yalnız eksik satırı
 * ekler, var olanı ne ezer ne siler. Fazladan satır orada da, ondan sonra kurulan her
 * veritabanında da yayında kalırdı.
 *
 * **Neden silmiyor, yayından kaldırıyor:** karar site sahibinin (28.08.2026). `isPublished`
 * alanını false yapmak sitede ve menüde alanı tümüyle görünmez kılar ama satırı panelde
 * bırakır; yanlış bir slug hedeflenirse geri alınabilir. Makaleler `practice_areas`
 * tablosuna bağlı DEĞİL (articles yalnız `categories` ve `lawyers` tablolarına referans
 * veriyor), dolayısıyla bu işlem hiçbir içeriği kırmıyor.
 *
 * **Neden AÇIK slug listesi, "belgede olmayan her şey" değil:** kapsayıcı bir kural
 * (SEED_PRACTICE_AREAS dışındaki her alanı kapat) panelin varlık sebebini çiğnerdi —
 * avukat panelden yeni ve GERÇEK bir çalışma alanı eklediğinde betik onu da sessizce
 * yayından kaldırırdı. Liste bu yüzden elle ve iki isimle sınırlı.
 *
 * **`db:deploy` zincirine BİLEREK eklenmedi:** bu tek seferlik bir temizlik. Zincire
 * eklenseydi, büro ileride gerçekten aile veya ticaret hukuku eklemeye karar verdiğinde
 * her dağıtım o alanı tekrar kapatır ve sebebi haftalarca anlaşılmazdı. Bir kez elle
 * çalıştırılır: `npm run db:unpublish-extra`.
 */

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { and, eq } = await import('drizzle-orm')
const { db, closeDb } = await import('../src/db/client.ts')
const { practiceAreas } = await import('../src/db/schema.ts')

// Belgede (07.08.2026) yer ALMAYAN, ilk kurulumun örnek verisinden kalan alanlar.
const KALDIRILACAK = [
  { slug: 'aile-hukuku', ad: 'Aile Hukuku' },
  { slug: 'ticaret-hukuku', ad: 'Ticaret Hukuku' },
] as const

let toplam = 0

for (const hedef of KALDIRILACAK) {
  // Koşulda `isPublished` de var: betik ikinci kez koşturulduğunda zaten kapalı satırı
  // tekrar güncellemesin, böylece ekrandaki sayı "bu koşumda gerçekten ne değişti"yi söylesin.
  const [sonuc] = await db
    .update(practiceAreas)
    .set({ isPublished: false })
    .where(and(eq(practiceAreas.slug, hedef.slug), eq(practiceAreas.isPublished, true)))

  const sayi = (sonuc as { affectedRows?: number }).affectedRows ?? 0
  toplam += sayi
  console.log(
    sayi > 0
      ? `${hedef.ad}: yayından kaldırıldı.`
      : `${hedef.ad}: dokunulmadı (ya zaten yayında değil ya da bu veritabanında hiç yok).`,
  )
}

console.log(`Fazla çalışma alanı temizliği tamamlandı — bu koşumda kapatılan: ${toplam}.`)
await closeDb()
