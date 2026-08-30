// Ortam değişkenlerinin nereden geldiğini ve neden platform değişkenlerine düşülebildiğini
// scripts/load-env.mts açıklıyor. Bu betik satır GÜNCELLEDİĞİ için hedefin ekrana basılması
// özellikle önemli; yardımcı bunu her çağrıda yapıyor.
import { loadEnvForScript } from './load-env.mts'

loadEnvForScript(process.argv[2])

/**
 * KVKK aydınlatma metni ve çerez politikasını yer tutucudan gerçek metne yükseltir.
 *
 * **Neden ayrı bir betik gerekti:** `seed.ts` idempotent ve öyle KALMALI — satır varsa
 * dokunmuyor, çünkü avukatın panelden girdiği metni ezmesi kabul edilemez. Ama bu davranış
 * yan etkisiyle şunu doğuruyordu: daha önce tohumlanmış HER veritabanında (staging, üretim)
 * `/kvkk` ve `/cerez-politikasi` yer tutucuyu göstermeye devam ederdi. Yeni metinler yalnız
 * sıfırdan kurulan bir veritabanına inerdi — yani "boş KVKK sayfasıyla yayına çıkılamıyor"
 * sorunu, tam da onu çözmek için yazılan metne rağmen üretimde çözülmemiş kalırdı.
 *
 * **Neden avukatın metnini ezmiyor:** koşul eşitlik. Yalnız içeriği ESKİ YER TUTUCUYA
 * BİREBİR eşit olan satırlar güncelleniyor. Avukat panelden tek bir kelime yazdıysa satır
 * artık yer tutucuya eşit değildir ve betik ona dokunmaz. Bu yüzden betik defalarca
 * koşturulabilir; ikinci koşumda güncellenecek satır bulamaz.
 *
 * `db:deploy` zincirine eklendi: dağıtımda migration ve tohumdan sonra kendiliğinden koşar.
 */

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { and, eq } = await import('drizzle-orm')
const { db, closeDb } = await import('../src/db/client.ts')
const { pages } = await import('../src/db/schema.ts')
const { ESKI_YER_TUTUCU, SEED_COOKIE_PAGE, SEED_KVKK_PAGE } = await import(
  '../src/db/seed-content.ts'
)

// Yer tutucu metni artık `seed-content.ts`'ten geliyor: aynı sabiti `onar-icerik.mts` de
// okuyor ve ikisi aynı dağıtımda arka arkaya koşuyor. Gerekçesi o dosyada yazılı.
// Tek karakteri bile değişirse koşul tutmaz ve betik hiçbir şey yapmaz — sessiz kalmaması
// için aşağıda güncellenen satır sayısı basılıyor.

const HEDEFLER = [
  { slug: 'kvkk', icerik: SEED_KVKK_PAGE, ad: 'KVKK aydınlatma metni' },
  { slug: 'cerez-politikasi', icerik: SEED_COOKIE_PAGE, ad: 'Çerez politikası' },
] as const

let toplam = 0

for (const hedef of HEDEFLER) {
  const [sonuc] = await db
    .update(pages)
    .set({ content: hedef.icerik })
    .where(and(eq(pages.slug, hedef.slug), eq(pages.content, ESKI_YER_TUTUCU)))

  const sayi = (sonuc as { affectedRows?: number }).affectedRows ?? 0
  toplam += sayi
  console.log(
    sayi > 0
      ? `${hedef.ad}: yer tutucu gerçek metinle değiştirildi.`
      : `${hedef.ad}: dokunulmadı (ya zaten güncel ya da büro kendi metnini girmiş).`,
  )
}

console.log(`Hukuki metin geri doldurma tamamlandı — güncellenen satır: ${toplam}.`)
await closeDb()
