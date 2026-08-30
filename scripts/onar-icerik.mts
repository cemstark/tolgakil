// Ortam değişkenlerinin nereden geldiğini scripts/load-env.mts açıklıyor. Bu betik satır
// SİLDİĞİ ve GÜNCELLEDİĞİ için hedefin ekrana basılması özellikle önemli; yardımcı bunu
// her çağrıda yapıyor.
import { loadEnvForScript } from './load-env.mts'

loadEnvForScript(process.argv[2])

/**
 * İLK KURULUMUN ÖRNEK VERİSİNİ, MÜŞTERİ BELGESİNDEKİ GERÇEK İÇERİKLE DEĞİŞTİRİR.
 *
 * **Neden gerekti (29.08.2026):** yayındaki site (akilhukuk.com) tasarım olarak günceldi ama
 * büro bilgileri hâlâ kurulum örneğini gösteriyordu — "Örnek Mah. Örnek Cad. No: 1,
 * Kadıköy / İstanbul", "+90 216 000 00 00", "info@example.com", büro adında yanlış yazım
 * ("Akıl", oysa avukatın soyadı AKİL) ve dokuz çalışma alanı. Belgede yedi alan var.
 *
 * **Neden `seed.ts` bunu çözemez:** tohum idempotent ve öyle KALMALI — var olan satırı ne
 * ezer ne siler, çünkü avukatın panelden girdiği metni geri almak kabul edilemez. Yan
 * etkisi şu: veritabanı gerçek içerik yazılmadan ÖNCE kurulmuşsa (üretim tam olarak öyle),
 * o satırlar sonsuza kadar örnek veriyle kalır. `backfill-legal-pages.mts` aynı sorunu KVKK
 * ve çerez metni için çözmüştü; bu betik kalan alanları kapatıyor.
 *
 * **Neden avukatın kendi girdisini ezmez — betiğin bütün güvenliği bu tek kurala dayanıyor:**
 * hiçbir satır koşulsuz güncellenmiyor. Bir alan yalnızca değeri ESKİ ÖRNEK VERİYE BİREBİR
 * eşitse (ya da hiç doldurulmamışsa) değiştiriliyor. Panelden tek karakter yazıldığı anda
 * koşul tutmaz ve betik o alana dokunmaz. Bu yüzden betik defalarca koşturulabilir; ikinci
 * koşumda değiştirecek bir şey bulamaz ve bunu ekrana yazar.
 *
 * Eski örnek değerlerin birebir metni aşağıda tekrar yazılıyor çünkü kodda artık yoklar;
 * kaynağı `git show dcd0c1d^:src/db/seed.ts`. Tek karakteri değişirse koşul tutmaz, o
 * yüzden her adım "ne yaptı / neden yapmadı" bilgisini basıyor.
 *
 * **`db:deploy` zincirine EKLENDİ — yani DAĞITIMDA İNSAN GÖZETİMİ OLMADAN KOŞUYOR** ve satır
 * siliyor (`scripts/prebuild.mts`, Hostinger'ın derleme komutu `npm run build`).
 * `unpublish-extra-practice-areas.mts` bilinçli olarak zincirin dışında bırakılmıştı;
 * gerekçesi, büro ileride gerçekten aile veya ticaret hukuku eklerse her dağıtımın o alanı
 * tekrar kapatmasıydı. Burada o risk, silmeyi ÜÇ SİNYALİN ÜÇÜNE BİRDEN bağlayarak
 * kapatılıyor: özet eski örnek metne birebir eşit + gövde boş + alana bağlı yazı yok.
 * Üçünden biri bile tutmazsa satır bırakılıyor ve sebebi ekrana yazılıyor.
 *
 * Silme geri alınamaz olduğu için koruması GÜNCELLEMENİNKİNDEN GÜÇLÜ tutuldu; ilk sürümde
 * tersiydi ve denetimde yakalandı.
 */

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { and, eq, isNull, or, sql } = await import('drizzle-orm')
const { db, closeDb } = await import('../src/db/client.ts')
const { articles, categories, pages, practiceAreas, settings } = await import('../src/db/schema.ts')
const { ESKI_YER_TUTUCU, SEED_ABOUT_PAGE, SEED_PRACTICE_AREAS, SEED_SETTINGS } =
  await import('../src/db/seed-content.ts')
const { SETTINGS_ID } = await import('../src/lib/settings-id.ts')

/** Ekrana basılan her satır aynı biçimde çıksın; sonda tek bir özet var. */
const gunluk: string[] = []
let degisiklik = 0

/** Bir kayıt gerçekten değişti. Sondaki özet sayacı buradan besleniyor. */
function degisti(mesaj: string): void {
  degisiklik += 1
  gunluk.push(`  ✓ ${mesaj}`)
}

/** Kayda DOKUNULMADI — sebebiyle birlikte. Sessiz atlama, saatlerce teşhis demek. */
function atlandi(mesaj: string): void {
  gunluk.push(`  · ${mesaj}`)
}

/** Koşullu güncellemelerin ortak kalıbı: etkilenen satır varsa değişti, yoksa atlandı. */
function bildir(yapildi: boolean, olumlu: string, olumsuz: string): void {
  if (yapildi) degisti(olumlu)
  else atlandi(olumsuz)
}

/** Drizzle'ın MySQL sürücüsü `affectedRows`'u ilk elemanda döndürüyor. */
function etkilenen(sonuc: unknown): number {
  const [ilk] = sonuc as [{ affectedRows?: number }]
  return ilk?.affectedRows ?? 0
}

// ============================================================================
// 1) Büro bilgileri (settings)
// ============================================================================
// Alan alan gidiliyor, satırın tamamı tek seferde ezilmiyor: büro bir alanı panelden
// düzeltmiş olabilir (ör. telefonu güncellemiş ama adresi örnek kalmış olabilir) ve o
// düzeltmenin kaybolmaması gerekiyor.
//
// İki tür koşul var:
//   - ESKİ ÖRNEK DEĞERE eşitse  → belgedeki değerle değiştir
//   - hiç doldurulmamışsa (NULL) → belgedeki değeri yaz
//
// İkinci gruptakiler üretimde HİÇ DOLMADI. Sebep sütunların yaşına göre değişiyor:
// `phone_secondary` ve `working_hours` şemaya sonradan geldi (0004_sleepy_ezekiel_stane.sql),
// `whatsapp` ise ilk migration'dan beri var (0000_greedy_caretaker.sql) ama ilk tohum onu hiç
// yazmıyordu. Üçünün ortak noktası, tohumun satırı "zaten var" sayıp atlaması: sitenin
// altbilgisinde çalışma saati ve WhatsApp bağlantısı bu yüzden hiç görünmedi.
//
// `footer_text` BİLEREK BU LİSTEDE DEĞİL (denetimde yakalandı). O sütun da 0000'den beri var
// AMA ilk tohum ona bugünküyle BİREBİR AYNI değeri yazıyordu, yani üretimde zaten dolu ve
// onarıma ihtiyacı yok. Listede kalsaydı tek bir etkisi olurdu ve o da zararlı olurdu:
// avukat alt bilgi metnini panelden KASTEN sildiğinde (validation.ts:96 boş dizeyi NULL'a
// çeviriyor, yani silmek mümkün ve kalıcı) betik onu her dağıtımda geri yazar, avukat da
// sitesinden neden bir cümleyi kaldıramadığını anlayamazdı.

console.log('\n[1/5] Büro bilgileri (settings)')

// Satırın VARLIĞI önce denetleniyor. Yoksa yedi güncelleme de 0 satır etkiler ve ekrana
// yedi kez "dokunulmadı, zaten doğru" basılırdı — yarım kurulmuş bir veritabanı "her şey
// yolunda" gibi görünür, teşhis yanlış yerde aranırdı.
const [ayarSatiri] = await db
  .select({ id: settings.id })
  .from(settings)
  .where(eq(settings.id, SETTINGS_ID))

if (ayarSatiri === undefined) {
  console.log(
    `  ! settings tablosunda id=${SETTINGS_ID} satırı YOK. Büro bilgileri onarılamadı; ` +
      'önce `npm run db:seed` çalıştırılmalı.',
  )
}

const ESKI_AYARLAR = {
  officeName: 'Akıl Hukuk Bürosu',
  address: 'Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul',
  phone: '+90 216 000 00 00',
  email: 'info@example.com',
} as const

// SÜTUN ANAHTARDAN TÜRETİLİYOR, AYRI YAZILMIYOR. Önce ikisi yan yana duruyordu
// (`{ sutun: settings.phone, anahtar: 'phone' }`) ve denetimde ölçüldü: TypeScript dinamik
// anahtarlı `.set({ [k]: v })` çağrısını DENETLEMİYOR — şemada olmayan bir anahtar da,
// yanlış değer tipi de hatasız geçiyor; Drizzle de tanımadığı anahtar için fırlatmıyor
// (drizzle-orm/utils.js, mapUpdateSet). Yani kopyala-yapıştırla `sutun: settings.phone,
// anahtar: 'email'` yazılsaydı WHERE telefonu denetler, SET e-postayı ezerdi ve hiçbir
// katman uyarmazdı. `satisfies` ile anahtar artık şemaya bağlı, sütun da ondan okunuyor:
// ikisinin ayrışması mümkün değil.
type AyarAnahtari = keyof typeof settings.$inferInsert

const ZORUNLU_ALANLAR = [
  {
    anahtar: 'officeName',
    ad: 'Büro adı',
    eski: ESKI_AYARLAR.officeName,
    yeni: SEED_SETTINGS.officeName,
  },
  {
    anahtar: 'address',
    ad: 'Adres',
    eski: ESKI_AYARLAR.address,
    yeni: SEED_SETTINGS.address,
  },
  {
    anahtar: 'phone',
    ad: 'Telefon',
    eski: ESKI_AYARLAR.phone,
    yeni: SEED_SETTINGS.phone,
  },
  {
    anahtar: 'email',
    ad: 'E-posta',
    eski: ESKI_AYARLAR.email,
    yeni: SEED_SETTINGS.email,
  },
] as const satisfies ReadonlyArray<{
  anahtar: AyarAnahtari
  ad: string
  eski: string
  yeni: string
}>

for (const alan of ayarSatiri === undefined ? [] : ZORUNLU_ALANLAR) {
  const sonuc = await db
    .update(settings)
    .set({ [alan.anahtar]: alan.yeni })
    .where(and(eq(settings.id, SETTINGS_ID), eq(settings[alan.anahtar], alan.eski)))
  bildir(
    etkilenen(sonuc) > 0,
    `${alan.ad}: örnek değer belgedeki değerle değiştirildi → ${alan.yeni}`,
    `${alan.ad}: dokunulmadı (ya zaten doğru ya da panelden düzenlenmiş).`,
  )
}

// Koşul "boş olması". Panel boş bırakılan alanı NULL yazıyor (validation.ts:96, optionalText
// boş dizeyi null'a çeviriyor); `eq(sutun, '')` yine de koşulda duruyor ama gerekçesi panel
// değil, panelden önce elle girilmiş olabilecek eski veri.
const BOS_ALANLAR = [
  {
    anahtar: 'phoneSecondary',
    ad: 'İkinci telefon',
    yeni: SEED_SETTINGS.phoneSecondary,
  },
  { anahtar: 'whatsapp', ad: 'WhatsApp', yeni: SEED_SETTINGS.whatsapp },
  {
    anahtar: 'workingHours',
    ad: 'Çalışma saatleri',
    yeni: SEED_SETTINGS.workingHours,
  },
] as const satisfies ReadonlyArray<{
  anahtar: AyarAnahtari
  ad: string
  yeni: string
}>

for (const alan of ayarSatiri === undefined ? [] : BOS_ALANLAR) {
  const sutun = settings[alan.anahtar]
  const sonuc = await db
    .update(settings)
    .set({ [alan.anahtar]: alan.yeni })
    .where(and(eq(settings.id, SETTINGS_ID), or(isNull(sutun), eq(sutun, ''))))
  bildir(
    etkilenen(sonuc) > 0,
    `${alan.ad}: boştu, belgedeki değer yazıldı → ${alan.yeni}`,
    `${alan.ad}: dokunulmadı (zaten dolu).`,
  )
}

console.log(gunluk.splice(0).join('\n'))

// ============================================================================
// 2) Hakkımızda sayfası
// ============================================================================
// KVKK ve çerez metni için aynı işi `backfill-legal-pages.mts` yapıyor; /hakkimizda o
// betiğin kapsamı dışındaydı ve üretimde hâlâ yer tutucuyu gösteriyordu.

console.log('\n[2/5] Hakkımızda sayfası (pages)')

const hakkimizdaSonuc = await db
  .update(pages)
  .set({ content: SEED_ABOUT_PAGE })
  .where(and(eq(pages.slug, 'hakkimizda'), eq(pages.content, ESKI_YER_TUTUCU)))
bildir(
  etkilenen(hakkimizdaSonuc) > 0,
  'Hakkımızda: yer tutucu, belgedeki onaylı metinle değiştirildi.',
  'Hakkımızda: dokunulmadı (ya zaten güncel ya da büro kendi metnini girmiş).',
)

console.log(gunluk.splice(0).join('\n'))

// ============================================================================
// 3) Eksik veya örnek kalmış çalışma alanları
// ============================================================================
// Üretimdeki `is-hukuku` satırı ilk kurulumun örnek verisinden geliyordu: özeti belgeye ait
// değildi ("İşçi ve işveren uyuşmazlıkları, alacak ve işe iade davaları.") ve `content`
// sütunu HİÇ doldurulmamıştı — yani /calisma-alanlari/is-hukuku sayfası yayında GÖVDESİZ
// açılıyordu. Sonraki tohum satırı var sayıp atladığı için bu hiç düzelmedi.
//
// Koşul iki ayaklı: ya özet bilinen eski örnek metne birebir eşit, ya da gövde boş. İkincisi
// tek başına da yeterli bir onarım gerekçesi: gövdesiz bir çalışma alanı sayfası her hâlde
// bozuktur ve belgede o alanın onaylı metni duruyor.

console.log('\n[3/5] Çalışma alanı metinleri (practice_areas)')

const ESKI_ORNEK_OZETLER: Record<string, string> = {
  'is-hukuku': 'İşçi ve işveren uyuşmazlıkları, alacak ve işe iade davaları.',
}

for (const alan of SEED_PRACTICE_AREAS) {
  const [mevcut] = await db.select().from(practiceAreas).where(eq(practiceAreas.slug, alan.slug))

  if (mevcut === undefined) {
    // Belgedeki bir alan veritabanında hiç yoksa ekle. Tohum bunu zaten yapardı ama betiğin
    // tek başına da tutarlı bir sonuç bırakması gerekiyor.
    await db.insert(practiceAreas).values({ ...alan, isPublished: true })
    degisti(`${alan.name}: eksikti, belgedeki metinle eklendi.`)
    continue
  }

  const govdeBos = mevcut.content === null || mevcut.content.trim() === ''
  const ozetOrnek = ESKI_ORNEK_OZETLER[alan.slug] === mevcut.summary

  // İKİ AYRI DAL — BİLİNÇLİ OLARAK BİRLEŞTİRİLMİYOR. (Denetimde yakalanan kritik hata:
  // ikisi tek koşulda toplanmıştı ve `govdeBos` tek başına doğruyken `summary`, `name`,
  // `sortOrder` da tohum değeriyle eziliyordu.)
  //
  // Neden tehlikeliydi: panelden BOŞ gövdeyle kaydedilen bir alan veritabanına NULL yazıyor
  // (src/app/panel/calisma-alanlari/actions.ts:46 — `plainContent === '' ? null : content`).
  // Yani avukat özeti kendi cümlesiyle değiştirip gövdeyi boş bıraktığında `govdeBos` kalıcı
  // olarak doğru kalıyor ve betik HER DAĞITIMDA onun özetini, adını ve sırasını geri alıyordu.
  // Bu, betiğin başındaki "panelden tek karakter yazıldıysa dokunma" sözünün ihlaliydi.

  if (ozetOrnek) {
    // Özet, bilinen eski örnek metne BİREBİR eşit: satırın panelden hiç düzenlenmediği
    // kanıtlanmış demektir. Bütün alanları belgedeki hâline getirmek güvenli.
    await db
      .update(practiceAreas)
      .set({
        summary: alan.summary,
        content: alan.content,
        name: alan.name,
        sortOrder: alan.sortOrder,
        // Satır örnek veri olduğu kanıtlı; yayın durumu da o kurulumdan kalma sayılıyor.
        isPublished: true,
      })
      .where(eq(practiceAreas.id, mevcut.id))
    degisti(`${alan.name}: özeti örnek veriydi, belgedeki onaylı metin yazıldı.`)
    continue
  }

  if (govdeBos) {
    // Özet panelden değiştirilmiş olabilir; YALNIZ gövde yazılıyor. Ad, özet ve sıra
    // avukatın bıraktığı gibi kalıyor — gövdesiz bir sayfa her hâlde bozuktur ama bu,
    // sayfanın geri kalanına dokunmak için gerekçe değil.
    await db
      .update(practiceAreas)
      .set({ content: alan.content })
      .where(eq(practiceAreas.id, mevcut.id))
    degisti(`${alan.name}: gövdesi boştu, belgedeki onaylı metin yazıldı (özet ve ad korundu).`)
    continue
  }

  // YAYIN DURUMUNA DOKUNULMUYOR. Burada eskiden koşulsuz bir `isPublished: true` vardı
  // ("belgedeki yedi alanın hepsi görünmeli") ama bu, kritik hatayla aynı sınıfa giriyordu:
  // avukat bir alanı panelden BİLEREK yayından kaldırdıysa (meşru bir karar) betik onu her
  // dağıtımda geri açar ve avukat alanı neden gizleyemediğini anlayamazdı. Yayın kararı
  // panele ait; bu betik yalnız örnek veriyi onarır. Yayına alma yalnız iki yerde oluyor:
  // satır hiç yoksa eklenirken ve özeti örnek veriye eşitken (yukarıdaki iki dal).
  if (!mevcut.isPublished) {
    atlandi(`${alan.name}: yayında değil — panelden alınmış bir karar sayıldı, dokunulmadı.`)
    continue
  }

  atlandi(`${alan.name}: dokunulmadı (metni belgeyle uyumlu ve yayında).`)
}

console.log(gunluk.splice(0).join('\n'))

// ============================================================================
// 4) Belge dışı çalışma alanlarının SİLİNMESİ
// ============================================================================
// Karar site sahibinin (29.08.2026): yayından kaldırmak değil, SİLMEK.
//
// Silmek güvenli, çünkü şema öyle kurulmuş: `articles.practice_area_id` yabancı anahtarı
// `onDelete: 'set null'` — bu alanlara bağlı bir yazı varsa yazı SİLİNMEZ, yalnız alan
// bağlantısını kaybeder (bkz. src/db/schema.ts, practiceAreaId).
//
// SİLME KOŞULU DÖRT SİNYALİN DÖRDÜNE BİRDEN BAĞLI. Sebep: silme geri alınamaz, dolayısıyla
// korumanın güncellemeninkinden GÜÇLÜ olması gerekir — denetimde bunun tersi yakalandı,
// koşul yalnız `summary`ye bakıyordu.
//
//   1. Özet, bilinen eski örnek metne birebir eşit olmalı.
//   2. Ad da eski tohumdaki adla birebir eşit olmalı. Bu, 2. denetim turunda eklendi:
//      gövdenin boş olması TEK BAŞINA "avukat dokunmadı" demek DEĞİL, çünkü panel boş
//      editörle yapılan her kaydı yeniden NULL yazıyor (actions.ts:46). Yani avukat alanın
//      yalnız adını değiştirip kaydetse (özet formda dolu geldiği için ona dokunmadan)
//      satır hâlâ "özet örnek + gövde boş" görünür ve silinirdi.
//   3. Gövde boş olmalı. Eski tohum `content` sütununu hiç yazmıyordu, yani üretimdeki bu
//      iki satırın gövdesi NULL. Avukat panelden gövde yazdıysa satır artık örnek veri
//      değildir — özete hiç dokunmamış olsa bile (form özeti dolu getirir, `min(20)`
//      doğrulamasını geçtiği için elini sürmeden kaydedebilir).
//   4. Alana bağlı yazı olmamalı. Yabancı anahtar `set null` olduğu için silme yazıyı
//      teknik olarak bozmaz, ama o alanda YAZI VARSA büro orada gerçekten çalışıyor
//      demektir. Ayrıca 5. adım kategori için zaten aynı kuralı uyguluyordu; iki adımın
//      farklı davranması operatöre tutarsız görünüyordu.
//
// Üçü birden örnek veriyi göstermiyorsa satır bırakılıyor ve sebebi ekrana yazılıyor.
//
// `isPublished` BİLEREK ölçüt DEĞİL: üretimdeki iki satır şu an YAYINDA (canlı sitede
// görünüyorlar). "Yayında değilse sil" kuralı istenen temizliği hiç yapamazdı.

// 4. VE 5. ADIM TEK İŞLEMDE. Bu iki adım betiğin YIKICI kısmı ve birbirine bağlı: alan
// silinip kategori silinmeden hata alınırsa geriye yarı temizlenmiş bir durum kalırdı.
// İşlem sayesinde ya ikisi de uygulanır ya hiçbiri.
//
// Ekrana basma da işlemin DIŞINDA, commit'ten SONRA: geri alınan bir silme "silindi" diye
// raporlanmamalı. Bu yüzden adım başlıkları da doğrudan console'a değil günlüğe yazılıyor.
gunluk.push('\n[4/5] Belge dışı çalışma alanları (practice_areas — SİLME)')

const BELGE_DISI = [
  {
    slug: 'aile-hukuku',
    ad: 'Aile Hukuku',
    ornekOzet: 'Boşanma, velayet, nafaka ve mal rejimi süreçleri.',
  },
  {
    slug: 'ticaret-hukuku',
    ad: 'Ticaret Hukuku',
    ornekOzet: 'Şirketler, sözleşmeler ve ticari uyuşmazlıklar.',
  },
] as const

await db.transaction(async (islem) => {
  for (const hedef of BELGE_DISI) {
    const [alan] = await islem
      .select()
      .from(practiceAreas)
      .where(eq(practiceAreas.slug, hedef.slug))

    if (alan === undefined) {
      atlandi(`${hedef.ad}: bu veritabanında yok.`)
      continue
    }

    // 1. sinyal — özet
    if (alan.summary !== hedef.ornekOzet) {
      atlandi(
        `${hedef.ad}: SİLİNMEDİ — özeti örnek veriye eşit değil, panelden düzenlenmiş görünüyor. Gerekiyorsa panelden elle silin.`,
      )
      continue
    }

    // 2. sinyal — ad. `hedef.ad` değerleri eski tohumun `name` sütunuyla birebir aynı
    // (`git show dcd0c1d^:src/db/seed.ts`). `sortOrder` BİLEREK parmak izine alınmadı:
    // `movePracticeArea` her taşımada bütün listeyi 0..n yeniden numaralandırıyor, yani
    // avukatın BAŞKA bir alanı yukarı taşıması bu satırın sırasını da değiştirir ve tümüyle
    // ilgisiz bir işlem istenen temizliği kalıcı olarak bloke ederdi.
    if (alan.name !== hedef.ad) {
      atlandi(
        `${hedef.ad}: SİLİNMEDİ — adı panelden değiştirilmiş (“${alan.name}”), alan kullanılıyor sayıldı.`,
      )
      continue
    }

    // 3. sinyal — gövde
    if (alan.content !== null && alan.content.trim() !== '') {
      atlandi(
        `${hedef.ad}: SİLİNMEDİ — özeti örnek veri ama gövdesine metin yazılmış. Gerekiyorsa panelden elle silin.`,
      )
      continue
    }

    // 4. sinyal — bağlı yazı
    const bagliYazilar = await islem
      .select({ sayi: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.practiceAreaId, alan.id))
    const yaziSayisi = Number(bagliYazilar[0]?.sayi ?? 0)

    if (yaziSayisi > 0) {
      atlandi(
        `${hedef.ad}: SİLİNMEDİ — ${yaziSayisi} yazı bu alana bağlı. Yazıların alan bağını kaldırıp betiği tekrar çalıştırın.`,
      )
      continue
    }

    await islem.delete(practiceAreas).where(eq(practiceAreas.id, alan.id))
    degisti(`${hedef.ad}: silindi.`)
  }

  // ============================================================================
  // 5) Belge dışı kategoriler
  // ============================================================================
  // Kategori, çalışma alanından AYRI bir eksen (yazının yayın rafı). Aynı iki ad orada da
  // örnek veriden kalmıştı ve makale formundaki kategori listesinde görünüyorlar.
  //
  // `articles.category_id` yabancı anahtarı `onDelete: 'restrict'` — yani bağlı yazısı olan
  // bir kategoriyi silmek veritabanı tarafından REDDEDİLİR. Hatayı yakalamak yerine önce
  // sayıyoruz: "silinemedi" demek, kırık bir dağıtımdan iyidir ve sebebini de yazabiliyoruz.
  //
  // SİLME KOŞULU ÜÇ AYAKLI:
  //   1. Kategori hâlâ ilk tohumdaki hâlinde olmalı — adı örnek veriyle aynı ve `description`
  //      boş. (Denetimde yakalandı: burada hiç içerik denetimi yoktu. Avukat aile hukuku
  //      üzerine yazı dizisi planlayıp kategoriyi kendi adı ve açıklamasıyla kursaydı, henüz
  //      yazı girmemişken bir sonraki dağıtım onu açıklamasıyla birlikte silerdi.)
  //   2. Aynı slug'lı çalışma alanı ayakta olmamalı. 4. adımda bir alan "panelden düzenlenmiş"
  //      diye korunduysa büro o konuda gerçekten çalışıyor demektir; yazılarını raflayacağı
  //      kategoriyi elinden almak yanlış olur. (Denemede tam bu tutarsızlık çıktı.)
  //   3. Bağlı yazı olmamalı — zaten `restrict` yüzünden veritabanı da reddederdi.

  gunluk.push('\n[5/5] Belge dışı kategoriler (categories — SİLME)')

  for (const hedef of BELGE_DISI) {
    const [kategori] = await islem.select().from(categories).where(eq(categories.slug, hedef.slug))

    if (kategori === undefined) {
      atlandi(`${hedef.ad} kategorisi: bu veritabanında yok.`)
      continue
    }

    // 1. sinyal — kategori ilk tohumdaki hâlinde mi
    const aciklamaBos = kategori.description === null || kategori.description.trim() === ''
    if (kategori.name !== hedef.ad || !aciklamaBos) {
      atlandi(
        `${hedef.ad} kategorisi: SİLİNMEDİ — adı veya açıklaması panelden düzenlenmiş görünüyor.`,
      )
      continue
    }

    // 2. sinyal — aynı slug'lı çalışma alanı
    const [ayaktaAlan] = await islem
      .select({ id: practiceAreas.id })
      .from(practiceAreas)
      .where(eq(practiceAreas.slug, hedef.slug))

    if (ayaktaAlan !== undefined) {
      atlandi(
        `${hedef.ad} kategorisi: SİLİNMEDİ — aynı adlı çalışma alanı korundu, kategorisi de kalmalı.`,
      )
      continue
    }

    const bagli = await islem
      .select({ sayi: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.categoryId, kategori.id))
    const yaziSayisi = Number(bagli[0]?.sayi ?? 0)

    if (yaziSayisi > 0) {
      atlandi(
        `${hedef.ad} kategorisi: SİLİNMEDİ — ${yaziSayisi} yazı bu kategoriye bağlı. Yazıları başka kategoriye taşıyıp betiği tekrar çalıştırın.`,
      )
      continue
    }

    await islem.delete(categories).where(eq(categories.id, kategori.id))
    degisti(`${hedef.ad} kategorisi: silindi.`)
  }
})

console.log(gunluk.splice(0).join('\n'))

// ============================================================================
// Özet
// ============================================================================
// Sayı sıfırsa bu bir HATA DEĞİL: betik ikinci kez koştuğunda ya da zaten temiz bir
// veritabanında beklenen sonuç budur. Ayrımın ekranda görünmesi, dağıtım günlüğüne bakan
// kişinin "çalıştı mı" diye tahmin yürütmesini engelliyor.
console.log(
  degisiklik > 0
    ? `\nİçerik onarımı tamamlandı — bu koşumda değişen kayıt: ${degisiklik}.`
    : '\nİçerik onarımı tamamlandı — değiştirilecek bir şey bulunmadı (veritabanı zaten güncel).',
)

await closeDb()
