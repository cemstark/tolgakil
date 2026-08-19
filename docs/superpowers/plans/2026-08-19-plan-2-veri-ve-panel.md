# Plan 2 — Veri ve Panel Uygulama Planı

> **Ajan çalışanlar için:** ZORUNLU ALT BECERİ: Bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans`
> kullanın. Adımlar takip için onay kutusu (`- [ ]`) sözdizimi kullanır.

**Hedef:** Bir avukat `/panel/giris` adresinden e-posta ve parolasıyla girip makale yazabilsin,
görsel yükleyebilsin, taslak tutup yayımlayabilsin; büro yöneticisi ayrıca kadroyu, çalışma
alanlarını, site ayarlarını ve panel kullanıcılarını yönetip gelen mesajları okuyabilsin.
Veriler MariaDB'de durur, panel arayüzü Türkçedir ve klavyeyle tam kullanılabilir.

**Mimari:** Plan 1'in kabuğu üstüne; MySQL/MariaDB + Drizzle ORM + `mysql2`, Auth.js v5
credentials + `argon2`, Next 16 `proxy.ts` koruması, server action tabanlı formlar, Tiptap
editörü ve sunucu tarafında `sanitize-html`.

**Kaynak spec:** `docs/superpowers/specs/2026-08-18-tolga-akil-hukuk-sitesi-design.md`
(§2.1 reklam yasağı, §2.2 barındırma, §3 roller, §5 veri modeli, §6 mimari, §8 erişilebilirlik,
§11 hata yönetimi, §12 test, §13 açık maddeler)

**Önceki plan:** `docs/superpowers/plans/2026-08-18-plan-1-kabuk.md` — tamamlandı
(`88f6174..5e55ceb`; 5 birim + 59 e2e testi yeşil).

---

## Kapsam dışı (Plan 3)

Genel sayfaların veriye bağlanması, `FULLTEXT` arama ve kategori filtresi, iletişim formu +
KVKK onayı + `nodemailer`, harita rıza sarıcısı, `sitemap.xml`/`rss.xml`/yapılandırılmış veri,
Hostinger'a çıkış ve yükleme kalıcılığı testi. Bu planda bunlara **dokunulmaz**.

Panel kullanıcı yönetiminde de sınır var: e-posta davet akışı, parola sıfırlama e-postası ve
iki adımlı doğrulama **bu planın da Plan 3'ün de dışındadır** (TBY kararı); gerekirse ayrı iş
olarak planlanır.

---

## Global Kısıtlar

Plan 1'in "Global Kısıtlar" bölümü **aynen geçerlidir** (kod dili, bileşen deseni, CSS deseni,
token kullanımı, yorum kültürü, erişilebilirlik, içerik yasağı). Aşağıdakiler bu plana özgü
eklerdir.

### Ortam (ölçüldü, varsayım değil)

| Ne | Değer | Nasıl ölçüldü |
|---|---|---|
| Node | `22.23.2` (fnm) | `node -v` |
| Next.js | `16.3.0` | `package.json` |
| Yerel veritabanı | MariaDB `12.2.2` | `select version()` |
| Sunucu harmanlaması | `utf8mb4_uca1400_ai_ci` | `@@collation_server` |
| `tolga_akil_hukuk` / `tolga_akil_hukuk_test` varsayılanı | `utf8mb4` / `utf8mb4_unicode_ci` | `information_schema.schemata` |
| `sql_mode` | `STRICT_TRANS_TABLES,...` | `@@sql_mode` |
| `innodb_ft_min_token_size` | `3` | `@@innodb_ft_min_token_size` |
| Hedef üretim | Hostinger Business, MariaDB **10.11** | spec §2.2 + TBY |

**Komut öneki:** fnm ile kurulu Node PATH'te değil. Bash üzerinden çalıştırılan **her** komutun
başına şu ek gelir:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
```

Plandaki komut blokları bu öneki tekrar yazmaz; uygulayıcı her kabuk çağrısında ekler.

### Bağımlılık sabitleme (bağlayıcı)

Bu planda kurulan **her** paket kesin sürümle sabitlenir: `npm i --save-exact <paket>@<sürüm>`.
`package.json` içinde `^` veya `~` bulunmaz. Gerekçe tek bir pakette özellikle kritik:
`next-auth@5.0.0-beta.32` **beta sürümdür**; `^5.0.0-beta.32` yazılırsa bir sonraki beta
otomatik gelir ve kimlik doğrulaması sessizce kırılabilir. Plan 1'in mevcut `package.json`
girdilerine dokunulmaz; yalnız bu planla eklenen satırlar sabit yazılır.

Kurulum sonrası doğrulama: `npm ls --depth=0` çıktısında yeni paketlerin hiçbirinde `^`/`~`
işareti bulunmamalı.

### MariaDB 10.11 uyumluluğu (bağlayıcı)

Yerel sunucu 10.11'den **yeni**. Yerelde çalışan her SQL 10.11'de de çalışmak zorundadır:

- **`utf8mb4_uca1400_*` harmanlamaları kullanılmaz.** Bu aile MariaDB 11.4+ ile geldi, 10.11'de
  yoktur. Yerel sunucunun varsayılanı `uca1400` olduğu için tablo oluşturan her ifade
  harmanlamayı **açıkça** `utf8mb4_unicode_ci` olarak yazar veya veritabanı varsayılanına
  (ikisi de `utf8mb4_unicode_ci`) güvenir — sunucu varsayılanına güvenmez.
- `RETURNING`, `JSON_TABLE`, `SYS_GUID()`, vektör tipleri gibi 11.x+ eklentileri kullanılmaz.
- `JSON` sütun tipi kullanılmaz (MariaDB'de `LONGTEXT` takma adıdır ve `CHECK` kısıtıyla gelir;
  taşınabilirlik için düz `varchar`/`text` tercih edilir).
- Şüpheye düşülen her ifade için önce <https://mariadb.com/kb/en/> üzerinde
  "Introduced in MariaDB" satırı okunur.

### Kod ve veri kuralları

- **Kök `layout.tsx` içinde veri çekilmez.** Plan 1'in üretim deneyiyle ölçüldü: kök layout
  hatasında sunucu `<html id="__next_error__">` kabuğunu döndürür, Türkçe metin ve telefon
  numarası kaybolur. `settings` sorgusu **iç içe** bir layout'a veya sayfaya konur (Görev 4'te
  `(site)` rota grubu bunun için açılır).
- **Panel arayüzü Türkçe; tanımlayıcılar İngilizce.** Dosya adı, bileşen adı, tip, değişken,
  CSS sınıfı, `id`, `data-*` İngilizce. Rota adları, görünen metinler, hata mesajları, test
  açıklamaları Türkçe.
- **`editor` rolü yalnızca makale ve medya işleri yapar.** Kadro, çalışma alanları, kategoriler,
  ayarlar, mesajlar ve panel kullanıcıları `admin`'e aittir.
- **Son etkin `admin` kilitlenemez.** Rolü düşürülemez, pasifleştirilemez. Bu kural saf bir
  fonksiyonda tutulur ve testle sabitlenir (Görev 7).
- **Panelden gelen HTML güvenilmez veridir.** Sunucu tarafında `sanitize-html` beyaz listesinden
  geçmeden veritabanına yazılmaz. İstemci tarafı temizliği güvenlik önlemi sayılmaz.
- **Yetki her server action'ın içinde yeniden doğrulanır.** Next 16 belgesi açıkça uyarıyor:
  server function'lar bulundukları rotaya POST olarak gider, `proxy.ts` matcher'ı değişirse
  koruma sessizce kalkar. `proxy.ts` ilk savunma hattıdır, tek hattı değildir.
- **Reklam yasağı taraması engel değil, onaylı uyarıdır.** Meşru bir hukuk makalesi "uzman
  görüşü" veya "ücret" kelimesini teknik anlamda geçirebilir; yazarı kilitlemek işi sabote
  eder. Yayımla düğmesine basıldığında metin taranır, şüpheli ifadeler **konumu ve bağlamıyla**
  listelenir, kullanıcı onay kutusunu işaretlemeden yayın tamamlanmaz. Sürtünme var, kilit yok.
  Tarama listesi spec §2.1'den türetilir ve **yalnız `src/lib/ad-ban.ts` içinde** tutulur.
- **Hiçbir hata yutulmaz.** `try/catch` yalnızca hatayı Türkçeye çevirip kullanıcıya göstermek
  veya yeniden fırlatmak için kullanılır; boş `catch` ve `catch { return null }` yasaktır.
  `signIn` çevresindeki `catch` bloğunda `AuthError` dışındaki her hata (özellikle
  `NEXT_REDIRECT`) yeniden fırlatılır.
- **Sırlar depoya girmez.** `.gitignore` zaten `.env.*` dışlıyor. Parola, `AUTH_SECRET` ve
  yükleme dizini içeriği kaynak dosyalara yazılmaz.
- **Her görev, doğrulama komutları yeşil olduktan sonra tek commit ile biter.** Mesaj Türkçe,
  `tür: özet` biçiminde; gövdede hangi doğrulamanın koşturulduğu yazılır.

### Görev 1-2'den devredilen sözleşmeler (uygulama sırasında ölçüldü — bağlayıcı)

- **Veritabanı oturumu UTC.** `client.ts` her bağlantıda `SET time_zone = '+00:00'` çalıştırır.
  Ekrana basarken `Intl`'e **açıkça `timeZone` verilir**; ham `toLocaleString()` sunucunun
  dilimine bağlı çıkar.
- **Her veritabanı test dosyası `afterAll` içinde `closeDb()` çağırır** — havuz `globalThis`
  üzerinde önbelleklendi; çağrılmazsa Vitest çıkışta asılır.
- **`DATABASE_URL`'e `?charset=...` eklenmez** (üretim `.env`'i dahil). Ölçüldü: `charset=utf8mb4`
  bağlantı harmanlamasını `uca1400` ailesine çekiyor, o aile MariaDB 10.11'de yok.
- **`server-only` paketi bilinçli olarak yok.** `src/db/client.ts` yalnız sunucuda çalışır;
  kuralı yalnızca bir yorum korur, istemci bileşeninden import edilmez.
- **Yeni bir `CREATE TABLE` migration'ına `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  elle eklenir** — drizzle snapshot'ı harmanlamayı kaydetmiyor, aksi hâlde üretimde veritabanı
  varsayılanına teslim olunur.
- **`process.loadEnvFile()` mevcut ortam değişkenlerini EZMEZ.** Bu yüzden `scripts/*.mts` ve
  `vitest.setup.ts` dosyayı `node:util`'in `parseEnv`'i ile okuyup değeri **açıkça atar**;
  test kurulumu ayrıca hedef veritabanı adı `_test` ile bitmiyorsa **fırlatır**. Yeni bir Node
  giriş noktası yazılırsa aynı desen uygulanır — aksi hâlde yanlış veritabanına yazma yolu açılır.
- **Alan hataları `toFieldErrors`, tam form durumu `toFormState` ile üretilir.** `z.flattenError`
  path'siz hataları `formErrors`'a koyar; yalnız `toFieldErrors` kullanılırsa o hatalar kaybolur
  ve kullanıcı "Kaydet"e basıp hiçbir şey olmadığını görür. **Server action'lar `toFormState`
  kullanır.**
- **Hata mesajları Türkçe:** `validation.ts` `z.config(z.locales.tr())` çağırır. Zod'u doğrudan
  import edip `validation.ts`'i import etmeyen bir modül İngilizce mesaj döndürür.
- **`formatBannedMatch` 1 tabanlı konum yazar, `BannedMatch.index` 0 tabanlıdır.** Tüketen kod
  ikinci bir `+1` eklemez.
- **Testler `TZ=America/New_York` altında koşar** (`vitest.config.mts`), geliştirme ve üretim
  `+03`'tedir. `timestamp` sütunları bu asimetriden etkilenmez (drizzle UTC sabitler), ama
  **`date` sütunları (`lawyers.practiceStartDate`) etkilenebilir** — ekrana basan görev bunu
  ölçmek zorundadır.
- **`settingsSchema.mapLat`/`mapLng` şu an zorunludur.** Ayarlar formunu yazan görev ya alanları
  forma koyar ya şemayı `.optional()` yapar; aksi hâlde kullanıcı görmediği bir alan için hata alır.

### Ortam değişkenleri

`.env.local` (geliştirme ve `npm run dev`/`start`):

```
DATABASE_URL="mysql://tolga_hukuk:yerel_gelistirme_2026@127.0.0.1:3306/tolga_akil_hukuk?charset=utf8mb4"
AUTH_SECRET="<openssl rand -base64 32 çıktısı>"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
UPLOAD_DIR="./.uploads"
SEED_ADMIN_EMAIL="admin@ornek.test"
SEED_ADMIN_PASSWORD="<en az 12 karakter>"
SEED_EDITOR_EMAIL="editor@ornek.test"
SEED_EDITOR_PASSWORD="<en az 12 karakter>"
```

`.env.test` (yalnız Vitest): aynı anahtarlar, `DATABASE_URL` sonu `tolga_akil_hukuk_test`,
`UPLOAD_DIR="./.uploads-test"`.

> **`UPLOAD_DIR` uyarısı (spec §13, ilk açık madde):** `./.uploads` **yalnız geliştirme
> içindir**. Üretimde bu dizin **dağıtım kökünün dışında** olmak zorundadır; aksi hâlde her
> dağıtım yüklenen görselleri siler. Hostinger'da gerçek yolun ne olacağı ve dağıtım sonrası
> kalıcılığın doğrulanması Plan 3'ün ilk adımıdır (bkz. "Plan 3'e devredilen doğrulama").

`.env.example` **yazılmaz** (istenmedi — global çalışma protokolü §3).

---

### Görev 1: Veritabanı katmanı — şema, migration'lar, FULLTEXT, gerçek veritabanına koşan test düzeni

**Dosyalar:**
- Oluştur: `drizzle.config.ts`, `src/db/schema.ts`, `src/db/client.ts`, `scripts/migrate.mts`
- Oluştur: `drizzle/0000_*.sql`, `drizzle/0001_fulltext_articles.sql` (drizzle-kit üretir)
- Oluştur: `vitest.setup.ts`
- Değiştir: `package.json` (bağımlılıklar + `db:*` komutları), `vitest.config.mts`,
  `tsconfig.json`, `next.config.ts`, `.gitignore`
- Test: `src/db/schema.test.ts`

**Arayüzler (sonraki görevler bunlara dayanır):**
- `src/db/client.ts` → `export const db: MySql2Database<typeof schema>`,
  `export async function closeDb(): Promise<void>`
- `src/db/schema.ts` → `users`, `lawyers`, `practiceAreas`, `categories`, `articles`,
  `messages`, `media`, `settings` tablo nesneleri; her tablo için
  `export type X = typeof x.$inferSelect` ve `export type NewX = typeof x.$inferInsert`
- `export type UserRole = 'admin' | 'editor'`
- `export type ArticleStatus = 'draft' | 'published'`

- [ ] **Adım 1: Bağlantıyı ve ortamı doğrula (kod yazmadan)**

```bash
node -e "console.log(process.version, typeof process.loadEnvFile)"
"/c/Program Files/MariaDB 12.2/bin/mysql.exe" -u tolga_hukuk -pyerel_gelistirme_2026 \
  -e "select version(); select schema_name, default_collation_name from information_schema.schemata where schema_name like 'tolga%';"
```

Beklenen: `v22.23.2 function`; MariaDB `12.2.2`, iki veritabanı da `utf8mb4_unicode_ci`.
Bu çıkmazsa **dur ve bildir** — planın geri kalanı bu ölçüme dayanıyor.

- [ ] **Adım 2: Bağımlılıkları ekle**

```bash
npm i --save-exact drizzle-orm@0.45.2 mysql2@3.23.3
npm i -D --save-exact drizzle-kit@0.31.10
```

`package.json` `scripts` bölümüne ekle:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "node scripts/migrate.mts",
"db:studio": "drizzle-kit studio"
```

`dotenv` **eklenmez**: Node 22.23 yerleşik `process.loadEnvFile()` ile `.env` dosyası okuyor
(Adım 1'de ölçüldü). `tsx` de **eklenmez**: Node 22.18+ `.mts` dosyalarında tip sıyırmayı
varsayılan olarak yapıyor, `node scripts/migrate.mts` doğrudan çalışıyor (ölçüldü).

- [ ] **Adım 3: `tsconfig.json`, `next.config.ts` ve `.gitignore` ayarları**

`tsconfig.json` `compilerOptions` içine ekle:

```json
"allowImportingTsExtensions": true
```

Gerekçe: `scripts/*.mts` dosyaları Node tarafından çalıştırılıyor ve Node ESM tam dosya adı
istiyor (`../src/db/client.ts`). `noEmit: true` zaten açık olduğu için bu seçenek geçerli.

`next.config.ts` içine (mevcut `poweredByHeader`/`images`/`headers` korunarak) ekle:

```ts
  // argon2 ve sharp yerel (native) ikili taşır; sunucu paketine gömülemez.
  serverExternalPackages: ['argon2', 'sharp'],
```

> `argon2` ve `sharp` Görev 2 ve Görev 6'da kuruluyor; ayarı burada bir kez yazıp bir daha
> `next.config.ts`'e dönmemek için önden ekliyoruz.

`.gitignore` içine, "test çıktıları" bölümünün altına:

```
# panelden yüklenen görseller (yerel geliştirme); üretimde dağıtım kökünün DIŞINDA olur
.uploads/
.uploads-test/
```

- [ ] **Adım 4: `.env.local` ve `.env.test` dosyalarını oluştur**

"Ortam değişkenleri" bölümündeki anahtarlarla iki dosya yaz. `AUTH_SECRET` için:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

`.gitignore` bunları zaten dışlıyor; `git status` ile **görünmediklerini doğrula**.

- [ ] **Adım 5: Başarısız testi yaz**

`src/db/schema.test.ts` — taklit yok, gerçek `tolga_akil_hukuk_test` veritabanı. Her test
kendi verisini kurar ve siler.

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, closeDb } from '@/db/client'
import { articles, categories, lawyers } from '@/db/schema'

// Testler tek bir gerçek şemayı paylaşıyor; her test kendi zeminini sıfırdan kurar.
async function temizle() {
  await db.delete(articles)
  await db.delete(lawyers)
  await db.delete(categories)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

async function kategoriEkle(slug: string) {
  await db.insert(categories).values({ slug, name: 'İş Hukuku' })
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug))
  return row.id
}

describe('şema', () => {
  it('Türkçe harfleri kayıpsız saklar', async () => {
    await db.insert(lawyers).values({
      slug: 'ozge-cinar',
      fullName: 'Özge Çınar Şahin',
      title: 'Avukat',
      isPublished: false,
      sortOrder: 0,
    })
    const [row] = await db.select().from(lawyers).where(eq(lawyers.slug, 'ozge-cinar'))
    expect(row.fullName).toBe('Özge Çınar Şahin')
  })

  it('aynı slug ile ikinci avukat eklenemez', async () => {
    const veri = { slug: 'tolga-akil', fullName: 'Tolga Akıl', title: 'Avukat', isPublished: false, sortOrder: 0 }
    await db.insert(lawyers).values(veri)
    await expect(db.insert(lawyers).values({ ...veri, fullName: 'Başka Kişi' })).rejects.toThrow(
      /ER_DUP_ENTRY|Duplicate entry/,
    )
  })

  it('makalesi olan kategori silinemez', async () => {
    const categoryId = await kategoriEkle('is-hukuku')
    await db.insert(articles).values({
      slug: 'ise-iade', title: 'İşe iade', excerpt: 'özet', content: '<p>gövde</p>',
      categoryId, status: 'draft',
    })
    await expect(db.delete(categories).where(eq(categories.id, categoryId))).rejects.toThrow(
      /ER_ROW_IS_REFERENCED|foreign key/i,
    )
  })

  it('bilinmeyen durum değeri kabul edilmez', async () => {
    const categoryId = await kategoriEkle('ticaret-hukuku')
    await expect(
      db.insert(articles).values({
        slug: 'yanlis-durum', title: 'Yanlış', excerpt: 'özet', content: '<p>x</p>',
        categoryId,
        // sql_mode STRICT_TRANS_TABLES açık; ENUM dışı değer hata verir.
        status: 'yayinda' as never,
      }),
    ).rejects.toThrow()
  })

  it('FULLTEXT indeksi makale gövdesinde önek araması yapar', async () => {
    const categoryId = await kategoriEkle('kira-hukuku')
    await db.insert(articles).values({
      slug: 'kira-tespit', title: 'Kira tespit davası',
      excerpt: 'Kira bedelinin belirlenmesi', content: '<p>Kiracının hakları</p>',
      categoryId, status: 'published',
    })
    const bulunan = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(sql`match(${articles.title}, ${articles.excerpt}, ${articles.content}) against ('dava*' in boolean mode)`)
    expect(bulunan.map((r) => r.slug)).toEqual(['kira-tespit'])
  })
})
```

> **Uygulamada ölçülen düzeltme (Görev 1, onaylı sapma):** drizzle-orm 0.45.2 sürücü hatasını
> `DrizzleQueryError` içine sarıyor; `error.message` yalnızca "Failed query: …" taşıyor,
> MariaDB kodu `error.cause.code` altında. Bu yüzden yukarıdaki iki `rejects.toThrow(...)`
> iddiası şema doğru olduğu hâlde başarısız olur. Doğrusu `cause.code` üzerinden kontrol eden
> bir yardımcıdır ve **beklenen kodu açıkça iddia etmelidir**; hiç hata fırlatılmazsa yardımcı
> kendi hatasını fırlatır. Ölçülen kodlar: yinelenen slug → `ER_DUP_ENTRY` (1062);
> makalesi olan kategoriyi silme → `ER_ROW_IS_REFERENCED_2` (**1451, sondaki `_2` dahil**);
> ENUM dışı değer → `WARN_DATA_TRUNCATED` (1265, STRICT modda hata).
>
> Ayrıca `src/db/client.ts` içindeki şema importu da uzantılı olmalıdır (`./schema.ts`) —
> Node ESM uzantısız çözemiyor; `allowImportingTsExtensions` tam olarak bunun için eklendi.

**Bu testler hangi mutasyonda kırılır:**
1. Bağlantı dizesinden `charset=utf8mb4` düşerse veya sütun `latin1` olursa Türkçe harf testi kırılır.
2. `lawyers.slug` üstündeki `.unique()` kalkarsa ikinci ekleme başarılı olur ve test kırılır.
3. `articles.categoryId` yabancı anahtarı `restrict` yerine `set null`/`cascade` olursa silme
   başarılı olur ve test kırılır.
4. `status` sütunu `mysqlEnum` yerine `varchar` olursa geçersiz değer kabul edilir ve test kırılır.
5. `0001_fulltext_articles.sql` migration'ı uygulanmazsa `MATCH ... AGAINST` "Can't find
   FULLTEXT index" hatası verir ve test kırılır.

- [ ] **Adım 6: Vitest'i gerçek veritabanına bağla**

`vitest.setup.ts` (proje kökü):

```ts
import { existsSync } from 'node:fs'

// Testler taklit değil gerçek MariaDB üzerinde koşar. .env.test yoksa sessizce geliştirme
// veritabanına düşüp veri silmektense gürültülü şekilde duruyoruz.
if (!existsSync('.env.test')) {
  throw new Error('.env.test bulunamadı; veritabanı testleri tolga_akil_hukuk_test üzerinde koşar.')
}
process.loadEnvFile('.env.test')
```

`vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Test dosyaları tek bir gerçek şemayı paylaşıyor; paralel koşarlarsa birbirinin
    // satırlarını siler. Yalıtım yerine sıralı koşum seçildi.
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
```

- [ ] **Adım 7: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npm test`
Beklenen: BAŞARISIZ — `Failed to resolve import "@/db/client"`.

- [ ] **Adım 8: Şemayı yaz**

`src/db/schema.ts` — spec §5'in sekiz tablosu.

```ts
import {
  boolean, date, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar,
} from 'drizzle-orm/mysql-core'

export type UserRole = 'admin' | 'editor'
export type ArticleStatus = 'draft' | 'published'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 190 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'editor']).notNull().default('editor'),
  name: varchar('name', { length: 120 }).notNull(),
  // Kullanıcı silinmez, pasifleştirilir: yazdığı makalelerin izi ve last_login_at kaydı
  // kaybolmasın. Pasif kullanıcı giriş yapamaz (Görev 3).
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
})

export const media = mysqlTable('media', {
  id: int('id').autoincrement().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  path: varchar('path', { length: 255 }).notNull().unique(),
  altText: varchar('alt_text', { length: 255 }).notNull(),
  width: int('width').notNull(),
  height: int('height').notNull(),
  sizeBytes: int('size_bytes').notNull(),
  uploadedBy: int('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const lawyers = mysqlTable('lawyers', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  barAssociation: varchar('bar_association', { length: 120 }),
  barRegistryNo: varchar('bar_registry_no', { length: 40 }),
  tbbRegistryNo: varchar('tbb_registry_no', { length: 40 }),
  practiceStartDate: date('practice_start_date'),
  university: varchar('university', { length: 160 }),
  // Diller virgülle ayrılmış düz metin: MariaDB'de JSON tipi LONGTEXT takma adı olduğu ve
  // 10.11'e taşınabilirliği tartışmalı olduğu için kullanılmadı.
  languages: varchar('languages', { length: 255 }),
  email: varchar('email', { length: 190 }),
  photoMediaId: int('photo_media_id').references(() => media.id, { onDelete: 'set null' }),
  bio: text('bio'),
  sortOrder: int('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
})

export const practiceAreas = mysqlTable('practice_areas', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  summary: varchar('summary', { length: 400 }).notNull(),
  content: text('content'),
  sortOrder: int('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
})

export const categories = mysqlTable('categories', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  description: varchar('description', { length: 400 }),
})

export const articles = mysqlTable(
  'articles',
  {
    id: int('id').autoincrement().primaryKey(),
    slug: varchar('slug', { length: 190 }).notNull().unique(),
    title: varchar('title', { length: 220 }).notNull(),
    excerpt: varchar('excerpt', { length: 400 }).notNull(),
    content: text('content').notNull(),
    coverMediaId: int('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    // Yazarı veya kategorisi olan makale sessizce sahipsiz kalmasın: silme reddedilir.
    authorId: int('author_id').references(() => lawyers.id, { onDelete: 'restrict' }),
    categoryId: int('category_id').references(() => categories.id, { onDelete: 'restrict' }),
    status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    metaTitle: varchar('meta_title', { length: 220 }),
    metaDescription: varchar('meta_description', { length: 400 }),
  },
  (table) => [
    index('articles_status_published_at_idx').on(table.status, table.publishedAt),
    index('articles_category_id_idx').on(table.categoryId),
  ],
)

export const messages = mysqlTable(
  'messages',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 190 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    subject: varchar('subject', { length: 220 }).notNull(),
    body: text('body').notNull(),
    kvkkAcceptedAt: timestamp('kvkk_accepted_at'),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 255 }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('messages_created_at_idx').on(table.createdAt)],
)

// Tek satırlık ayar tablosu; uygulama daima id = 1 satırını okur/yazar (SETTINGS_ID).
export const settings = mysqlTable('settings', {
  id: int('id').primaryKey(),
  officeName: varchar('office_name', { length: 160 }).notNull(),
  address: varchar('address', { length: 400 }).notNull(),
  phone: varchar('phone', { length: 40 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 40 }),
  email: varchar('email', { length: 190 }).notNull(),
  kep: varchar('kep', { length: 190 }),
  mapLat: varchar('map_lat', { length: 32 }),
  mapLng: varchar('map_lng', { length: 32 }),
  socialLinks: varchar('social_links', { length: 500 }),
  footerText: varchar('footer_text', { length: 500 }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
export type Lawyer = typeof lawyers.$inferSelect
export type NewLawyer = typeof lawyers.$inferInsert
export type PracticeArea = typeof practiceAreas.$inferSelect
export type NewPracticeArea = typeof practiceAreas.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Settings = typeof settings.$inferSelect
export type NewSettings = typeof settings.$inferInsert
```

> `varchar` uzunlukları 190'ı aşan hiçbir sütuna tekil indeks konmadı: `utf8mb4` altında
> 190 × 4 = 760 bayt, InnoDB DYNAMIC satır biçiminin 3072 baytlık anahtar sınırının altında.

- [ ] **Adım 9: Bağlantıyı yaz**

`src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) {
  // Sessiz bir undefined bağlantı yerine kurulum hatasını erken ve açıkça bildiriyoruz.
  throw new Error('DATABASE_URL tanımlı değil.')
}

const pool = mysql.createPool({ uri: url, connectionLimit: 10, timezone: 'Z' })

// mode: 'default' zorunlu — şema verilince drizzle mysql2 sürücüsü ilişkisel sorgu kipini
// istiyor (MySql2DrizzleConfig, drizzle-orm 0.45.2).
export const db = drizzle(pool, { schema, mode: 'default' })

// Vitest havuz açık kalırsa çıkmıyor; her veritabanı test dosyası afterAll içinde çağırır.
export async function closeDb(): Promise<void> {
  await pool.end()
}
```

- [ ] **Adım 10: drizzle-kit yapılandırması ve ilk migration**

`drizzle.config.ts`:

```ts
import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

Çalıştır: `npm run db:generate`
Beklenen: `drizzle/0000_*.sql` ve `drizzle/meta/` üretildi. Üretilen SQL'i **aç ve oku**:
`utf8mb4_uca1400_*` geçmemeli, `CREATE TABLE` ifadeleri `COLLATE` belirtmiyorsa veritabanı
varsayılanı (`utf8mb4_unicode_ci`) devreye girer — bu kabul edilir.

- [ ] **Adım 11: FULLTEXT migration'ını elle yaz**

drizzle-orm 0.45.2'nin `index()` yapıcısı yalnızca `btree`/`hash` destekliyor; `FULLTEXT`
tanımlanamıyor (`mysql-core/indexes.d.ts` ile doğrulandı). Bu yüzden özel migration:

```bash
npm run db:generate -- --custom --name=fulltext_articles
```

Üretilen `drizzle/0001_fulltext_articles.sql` içine yaz:

```sql
-- drizzle-kit MySQL FULLTEXT indeksi üretemiyor (index() yalnızca btree/hash destekliyor),
-- bu yüzden elle. MariaDB 10.11 InnoDB FULLTEXT destekliyor; sözdizimi 10.11 uyumlu.
CREATE FULLTEXT INDEX `articles_fulltext_idx` ON `articles` (`title`, `excerpt`, `content`);
```

- [ ] **Adım 12: Migration çalıştırıcısını yaz**

`scripts/migrate.mts`:

```ts
// Hangi .env dosyasının okunacağını çağıran belirler: üretimde yanlışlıkla geliştirme
// veritabanına migration çalıştırmayı zorlaştırır.
process.loadEnvFile(process.argv[2] ?? '.env.local')

// Dinamik import bilinçli: loadEnvFile çağrısı client.ts'in modül seviyesindeki
// DATABASE_URL okumasından ÖNCE çalışmalı, statik import bunu garanti etmiyor.
const { migrate } = await import('drizzle-orm/mysql2/migrator')
const { closeDb, db } = await import('../src/db/client.ts')

await migrate(db, { migrationsFolder: './drizzle' })
console.log("Migration'lar uygulandı.")
await closeDb()
```

> `drizzle-kit migrate` yerine `drizzle-orm/mysql2/migrator` seçildi: drizzle-kit bir
> `devDependency` ve Hostinger derlemesinde budanabilir; migrator çalışma zamanı bağımlılığının
> parçası.
>
> **Yedek yol:** `allowImportingTsExtensions` Next derlemesiyle çakışırsa (`npm run build`
> tsconfig hatası verirse) bu seçenek geri alınır, `scripts/` dizini tsconfig `exclude`
> listesine eklenir ve ayrı bir `tsconfig.scripts.json` ile tiplenir. Hangisinin gerektiğini
> Adım 15'teki `npm run build` çıktısı söyler; tahminle değiştirme.

- [ ] **Adım 13: Migration'ları iki veritabanına da uygula**

```bash
npm run db:migrate -- .env.local
npm run db:migrate -- .env.test
```

Sonra doğrula:

```bash
"/c/Program Files/MariaDB 12.2/bin/mysql.exe" -u tolga_hukuk -pyerel_gelistirme_2026 \
  tolga_akil_hukuk_test -e "show tables; show index from articles where index_type='FULLTEXT';"
```

Beklenen: sekiz tablo + `__drizzle_migrations`; `articles_fulltext_idx` listede.

- [ ] **Adım 14: Testin geçtiğini doğrula**

Çalıştır: `npm test`
Beklenen: `slug.test.ts` (4) + `schema.test.ts` (5) = 9 test GEÇTİ.

- [ ] **Adım 15: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test`
Ayrıca `npm ls --depth=0` çıktısında yeni paketlerde `^`/`~` bulunmadığını doğrula.
Commit: `feat: veritabanı şeması, migration'lar ve gerçek veritabanı test düzeni`

---

### Görev 2: Doğrulama katmanı, tohum verisi ve paylaşılan yardımcılar

**Dosyalar:**
- Oluştur: `src/lib/validation.ts`, `src/lib/date.ts`, `src/lib/cache-tags.ts`,
  `src/lib/ad-ban.ts`, `src/lib/settings-id.ts`, `src/db/seed.ts`, `scripts/seed.mts`
- Değiştir: `src/components/ArticleStrip.tsx` (yerel `formatDate` yerine `@/lib/date`),
  `package.json` (`db:seed` komutu + `zod`, `argon2`)
- Test: `src/lib/validation.test.ts`, `src/lib/date.test.ts`, `src/lib/ad-ban.test.ts`,
  `src/db/seed.test.ts`

**Plan 1 borçları bu görevde kapanıyor:** `slugify` boş dönüş koruması (zod katmanında),
`formatDate`'in `src/lib/date.ts`'e taşınması.

**Arayüzler:**
- `src/lib/date.ts` → `export function formatDate(iso: string): string` (tr-TR, `timeZone: 'UTC'`),
  `export function formatDateTime(value: Date): string`
- `src/lib/validation.ts` →
  `export const articleSchema`, `lawyerSchema`, `practiceAreaSchema`, `categorySchema`,
  `settingsSchema`, `loginSchema`, `mediaSchema`, `userCreateSchema`, `userUpdateSchema`;
  `export type FieldErrors = Record<string, string[]>`;
  `export type FormState = { ok: boolean; errors: FieldErrors; message?: string; warnings?: string[] }`;
  `export const EMPTY_FORM_STATE: FormState`;
  `export function toFieldErrors(error: z.ZodError): FieldErrors`
- `src/lib/cache-tags.ts` → `export const TAGS = { articles, lawyers, practiceAreas, categories, settings } as const`;
  `export function articleTag(slug: string): string`
- `src/lib/ad-ban.ts` → `export type BannedMatch = { phrase: string; index: number; context: string }`;
  `export function findBannedPhrases(text: string): BannedMatch[]`;
  `export function formatBannedMatch(match: BannedMatch): string`
- `src/lib/settings-id.ts` → `export const SETTINGS_ID = 1`
- `src/db/seed.ts` → `export async function seed(): Promise<void>`

- [ ] **Adım 1: Bağımlılıkları ekle**

```bash
npm i --save-exact zod@4.4.3 argon2@0.45.1
```

> zod 4'te `z.string().email()` yerine `z.email()` var ve `error.flatten()` yerine
> `z.flattenError(error)` öneriliyor. İkisi de yerel olarak ölçüldü, aşağıdaki kod bunlara göre.
> `argon2` Windows/Node 22 üzerinde hazır ikili ile kuruldu ve `hash`/`verify` çifti çalıştı.

- [ ] **Adım 2: Başarısız testleri yaz**

`src/lib/date.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatDate } from '@/lib/date'

describe('formatDate', () => {
  it('ISO tarihi Türkçe uzun biçime çevirir', () => {
    expect(formatDate('2026-08-12')).toBe('12 Ağustos 2026')
  })

  // timeZone: 'UTC' sabitlemesi düşerse negatif ofsetli bir makinede 01 Ağustos'a kayar.
  it('ayın ilk günü bir gün geriye kaymaz', () => {
    expect(formatDate('2026-08-01')).toBe('01 Ağustos 2026')
  })
})
```

`src/lib/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { articleSchema, loginSchema, toFieldErrors, userCreateSchema } from '@/lib/validation'

const gecerliMakale = {
  title: 'İşe iade davasında süre koşulu',
  slug: '',
  excerpt: 'Bir aylık hak düşürücü süre üzerine not.',
  content: '<p>Gövde</p>',
  status: 'draft' as const,
  categoryId: '3',
  authorId: '',
}

describe('articleSchema', () => {
  it('boş slug alanını başlıktan üretir', () => {
    const sonuc = articleSchema.safeParse(gecerliMakale)
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.slug).toBe('ise-iade-davasinda-sure-kosulu')
  })

  it('slugify boş dönerse başlığı reddeder', () => {
    // "!!! ???" slugify'dan boş string döner; boş slug rota üretemez (Plan 1 borcu).
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, title: '!!! ???' })
    expect(sonuc.success).toBe(false)
    expect(toFieldErrors(sonuc.error!).slug).toContain(
      'Başlıktan adres üretilemedi; slug alanını elle doldurun.',
    )
  })

  it('elle girilen slug da normalize edilir', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, slug: 'Kira Tespit Davası' })
    expect(sonuc.data?.slug).toBe('kira-tespit-davasi')
  })

  it('yayımlanacak makalede kategori zorunlu', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, status: 'published', categoryId: '' })
    expect(sonuc.success).toBe(false)
    expect(toFieldErrors(sonuc.error!).categoryId).toContain('Yayımlamak için kategori seçin.')
  })

  it('taslakta kategori boş bırakılabilir', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, categoryId: '' })
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.categoryId).toBeNull()
  })
})

describe('loginSchema', () => {
  it('geçersiz e-postayı Türkçe mesajla reddeder', () => {
    const sonuc = loginSchema.safeParse({ email: 'yok', password: 'parola-uzun-1' })
    expect(toFieldErrors(sonuc.error!).email).toContain('Geçerli bir e-posta adresi girin.')
  })

  it('boş parolayı reddeder', () => {
    const sonuc = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(toFieldErrors(sonuc.error!).password).toContain('Parola zorunlu.')
  })
})

describe('userCreateSchema', () => {
  it('kısa parolayı reddeder', () => {
    const sonuc = userCreateSchema.safeParse({
      email: 'yeni@ornek.test', name: 'Yeni Kullanıcı', password: 'kisa', role: 'editor',
    })
    expect(toFieldErrors(sonuc.error!).password).toContain('Parola en az 12 karakter olmalı.')
  })

  it('bilinmeyen rolü reddeder', () => {
    const sonuc = userCreateSchema.safeParse({
      email: 'yeni@ornek.test', name: 'Yeni Kullanıcı', password: 'yeterince-uzun-parola', role: 'superadmin',
    })
    expect(sonuc.success).toBe(false)
  })
})
```

`src/lib/ad-ban.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'

describe('findBannedPhrases', () => {
  it('yasaklı ifadeyi konumuyla birlikte döner', () => {
    const metin = 'Bu konuda uzman kadromuzla çalışıyoruz.'
    const [bulgu] = findBannedPhrases(metin)
    expect(bulgu.phrase).toBe('uzman')
    expect(metin.slice(bulgu.index, bulgu.index + 'uzman'.length)).toBe('uzman')
  })

  // Türkçe büyük harf katlaması tuzağı: 'İ'.toLowerCase() İKİ karakter üretir ve indeksleri
  // kaydırır. toLocaleLowerCase('tr') kullanılmazsa hem eşleşme kaçar hem de bulunan konum
  // özgün metinde başka bir yeri gösterir — aşağıdaki dilim iddiası bunu yakalar.
  it('Türkçe büyük harfli yazımda konum özgün metinle hizalı kalır', () => {
    const metin = 'BÖLGENİN EN İYİ BÜROSU olduğumuzu söylemiyoruz.'
    const [bulgu] = findBannedPhrases(metin)
    expect(bulgu.phrase).toBe('en iyi')
    expect(metin.slice(bulgu.index, bulgu.index + 'en iyi'.length)).toBe('EN İYİ')
  })

  it('aynı ifadenin her geçtiği yeri ayrı ayrı bildirir', () => {
    const bulgular = findBannedPhrases('ücret bilgisi ve ücret tarifesi')
    expect(bulgular.filter((b) => b.phrase === 'ücret')).toHaveLength(2)
  })

  it('bulguları metindeki sıraya göre döner', () => {
    const bulgular = findBannedPhrases('Ücretsiz görüşme sonrası %90 başarı oranı')
    expect(bulgular.map((b) => b.index)).toEqual([...bulgular.map((b) => b.index)].sort((a, b) => a - b))
  })

  it('temiz metinde boş dizi döner', () => {
    expect(findBannedPhrases('İşe iade davasında bir aylık süre koşulu.')).toEqual([])
  })
})

describe('formatBannedMatch', () => {
  it('ifadeyi, konumu ve bağlamı tek satırda gösterir', () => {
    const metin = 'Bu konuda uzman kadromuzla çalışıyoruz.'
    const satir = formatBannedMatch(findBannedPhrases(metin)[0])
    expect(satir).toContain('uzman')
    expect(satir).toContain('10. karakter')
    expect(satir).toContain('kadromuzla')
  })
})
```

**Hangi mutasyonda kırılır:** `toLocaleLowerCase('tr')` yerine düz `toLowerCase()` kullanılırsa
ikinci test kırılır (hem eşleşme kaçar hem indeks kayar); aynı ifadenin ikinci geçişi
aranmazsa üçüncü test kırılır; sıralama kaldırılırsa dördüncü test kırılır; listeden bir kalem
düşerse ilgili test kırılır; `formatBannedMatch` bağlamı bırakırsa son test kırılır.

`src/db/seed.test.ts`:

```ts
import { afterAll, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, db } from '@/db/client'
import { seed } from '@/db/seed'
import { settings, users } from '@/db/schema'
import { SETTINGS_ID } from '@/lib/settings-id'

afterAll(async () => {
  await closeDb()
})

it('iki kez koşturulunca kayıtları çoğaltmaz', async () => {
  await seed()
  await seed()
  const kullanicilar = await db.select().from(users)
  const ayarlar = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID))
  expect(kullanicilar.filter((u) => u.role === 'admin')).toHaveLength(1)
  expect(ayarlar).toHaveLength(1)
})

it('tohum kullanıcıları etkin başlar', async () => {
  await seed()
  const kullanicilar = await db.select().from(users)
  expect(kullanicilar.every((u) => u.isActive)).toBe(true)
})
```

**Hangi mutasyonda kırılır:** `seed()` içindeki "varsa atla" kontrolü kaldırılırsa ikinci koşum
ikinci admin satırı ekler veya `ER_DUP_ENTRY` fırlatır; `users.isActive` varsayılanı `false`
olursa ikinci test kırılır.

- [ ] **Adım 3: Testleri çalıştır, başarısız olduğunu gör**

Çalıştır: `npm test`
Beklenen: BAŞARISIZ — `@/lib/date`, `@/lib/validation`, `@/lib/ad-ban`, `@/db/seed` çözülemiyor.

- [ ] **Adım 4: `src/lib/date.ts` — Plan 1 borcunun kapanması**

```ts
// tr-TR sunucuda biçimlendirilir; ISO tarih istemciye ham taşınmaz. timeZone 'UTC' sabitlenir:
// new Date('YYYY-MM-DD') UTC gece yarısı olarak ayrıştırılır, negatif ofsetli bir sunucuda
// bu sabitleme olmadan görünen tarih bir gün geriye kayıp dateTime özniteliğiyle çelişirdi.
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
})

const WITH_TIME = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
})

export function formatDate(iso: string): string {
  return DAY_MONTH_YEAR.format(new Date(iso))
}

export function formatDateTime(value: Date): string {
  return WITH_TIME.format(value)
}
```

`src/components/ArticleStrip.tsx` içindeki yerel `formatDate` fonksiyonunu ve yorumunu **sil**,
yerine `import { formatDate } from '@/lib/date'` koy. Bileşenin çıktısı değişmemeli —
`tests/e2e/home.spec.ts` tarih testleri regresyon koruması olarak yeşil kalmalı.

- [ ] **Adım 5: `src/lib/ad-ban.ts`**

```ts
// TBB Reklam Yasağı Yönetmeliği (spec §2.1) sitede bulunmayacak ifadeleri sayıyor. Bu liste
// hukuki denetim yerine geçmez ve YAYINI ENGELLEMEZ: meşru bir hukuk makalesi "ücret" veya
// "uzman görüşü" kelimesini teknik anlamda geçirebilir. Amaç yazara sürtünme yaratmak.
const BANNED_PHRASES = [
  'uzman', 'en iyi', 'en başarılı', 'lider', 'başarı oran', 'kazanılmış dava',
  'müvekkil yorum', 'referans', 'yıldız', 'ücretsiz', 'ücret', 'fiyat', 'garanti',
  'kesin sonuç', 'hemen ara', 'indirim',
] as const

const CONTEXT_RADIUS = 30

export type BannedMatch = { phrase: string; index: number; context: string }

function buildContext(text: string, index: number, length: number): string {
  const start = Math.max(0, index - CONTEXT_RADIUS)
  const end = Math.min(text.length, index + length + CONTEXT_RADIUS)
  const kesit = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return `${start > 0 ? '…' : ''}${kesit}${end < text.length ? '…' : ''}`
}

export function findBannedPhrases(text: string): BannedMatch[] {
  // toLocaleLowerCase('tr') Türk alfabesinde uzunluğu korur (İ→i, I→ı); düz toLowerCase
  // 'İ' harfini iki karaktere açar ve bulunan konumu özgün metinden kaydırır.
  const normalized = text.toLocaleLowerCase('tr')
  const matches: BannedMatch[] = []

  for (const phrase of BANNED_PHRASES) {
    let from = 0
    for (;;) {
      const index = normalized.indexOf(phrase, from)
      if (index === -1) break
      matches.push({ phrase, index, context: buildContext(text, index, phrase.length) })
      from = index + phrase.length
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}

export function formatBannedMatch(match: BannedMatch): string {
  return `“${match.phrase}” (${match.index}. karakter): ${match.context}`
}
```

- [ ] **Adım 6: `src/lib/cache-tags.ts` ve `src/lib/settings-id.ts`**

```ts
export const TAGS = {
  articles: 'articles',
  lawyers: 'lawyers',
  practiceAreas: 'practice-areas',
  categories: 'categories',
  settings: 'settings',
} as const

export function articleTag(slug: string): string {
  return `article:${slug}`
}
```

```ts
// settings tablosu tek satırlıdır; okuma ve yazma daima bu kimliği kullanır.
export const SETTINGS_ID = 1
```

- [ ] **Adım 7: `src/lib/validation.ts`**

```ts
import { z } from 'zod'
import { slugify } from '@/lib/slug'

export type FieldErrors = Record<string, string[]>
export type FormState = { ok: boolean; errors: FieldErrors; message?: string; warnings?: string[] }
export const EMPTY_FORM_STATE: FormState = { ok: false, errors: {} }

export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors
}

const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || Number.isInteger(v), 'Geçersiz kayıt seçildi.')

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'evet')

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Parola zorunlu.'),
})

export const articleSchema = z
  .object({
    title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalı.').max(220, 'Başlık en fazla 220 karakter olabilir.'),
    slug: z.string().trim(),
    excerpt: z.string().trim().min(20, 'Özet en az 20 karakter olmalı.').max(400, 'Özet en fazla 400 karakter olabilir.'),
    content: z.string().trim().min(1, 'İçerik boş olamaz.'),
    status: z.enum(['draft', 'published']),
    categoryId: optionalId,
    authorId: optionalId,
  })
  // Slug boşsa başlıktan üretilir; slugify her iki durumda da uygulanır ki elle girilen
  // "Kira Tespit Davası" da geçerli bir adrese dönüşsün.
  .transform((v) => ({ ...v, slug: slugify(v.slug === '' ? v.title : v.slug) }))
  .superRefine((v, ctx) => {
    // slugify yalnızca noktalama içeren girdide boş string döner (Plan 1 borcu):
    // boş slug rota üretemez, kullanıcıya söylenmeden kaydedilemez.
    if (v.slug === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: 'Başlıktan adres üretilemedi; slug alanını elle doldurun.',
      })
    }
    if (v.status === 'published' && v.categoryId === null) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Yayımlamak için kategori seçin.' })
    }
  })

export const userCreateSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
  name: z.string().trim().min(2, 'Ad en az 2 karakter olmalı.').max(120, 'Ad en fazla 120 karakter olabilir.'),
  password: z.string().min(12, 'Parola en az 12 karakter olmalı.'),
  role: z.enum(['admin', 'editor']),
})

export const userUpdateSchema = z.object({
  role: z.enum(['admin', 'editor']),
  isActive: checkbox,
  // Boş bırakılırsa parola değişmez; doldurulursa aynı asgari uzunluk kuralı geçerli.
  password: z.string().refine((v) => v === '' || v.length >= 12, 'Parola en az 12 karakter olmalı.'),
})
```

`lawyerSchema`, `practiceAreaSchema`, `categorySchema`, `settingsSchema`, `mediaSchema` aynı
kalıpla yazılır:

| Şema | Zorunlu alanlar | Özel kural |
|---|---|---|
| `lawyerSchema` | `fullName` (≥3), `title` (≥2) | slug boşsa `fullName`'den üretilir, boş kalırsa aynı hata mesajı; `isPublished` `checkbox` |
| `practiceAreaSchema` | `name` (≥3), `summary` (20–400) | aynı slug kuralı; `isPublished` `checkbox` |
| `categorySchema` | `name` (≥2) | aynı slug kuralı |
| `settingsSchema` | `officeName`, `address`, `phone`, `email` | `email` için `z.email()`, `mapLat`/`mapLng` boş ya da sayıya çevrilebilir |
| `mediaSchema` | `altText` (≥3, "Alt metin zorunlu — görselin ne gösterdiğini yazın.") | spec §8: panelde alt metin alanı zorunlu |

- [ ] **Adım 8: Tohum verisini yaz**

`src/db/seed.ts` — idempotent: var olan kaydı güncellemez, yalnız eksikse ekler.

```ts
import { eq } from 'drizzle-orm'
import argon2 from 'argon2'
import { db } from './client'
import { categories, practiceAreas, settings, users } from './schema'
import { SETTINGS_ID } from '@/lib/settings-id'

const SEED_CATEGORIES = [
  { slug: 'aile-hukuku', name: 'Aile Hukuku' },
  { slug: 'is-hukuku', name: 'İş Hukuku' },
  { slug: 'ticaret-hukuku', name: 'Ticaret Hukuku' },
  { slug: 'kira-hukuku', name: 'Kira Hukuku' },
]

// Plan 1'in sabit içeriğiyle birebir aynı metinler; reklam yasağına uygun, iddia içermez.
const SEED_PRACTICE_AREAS = [
  { slug: 'aile-hukuku', name: 'Aile Hukuku', summary: 'Boşanma, velayet, nafaka ve mal rejimi süreçleri.', sortOrder: 0 },
  { slug: 'is-hukuku', name: 'İş Hukuku', summary: 'İşçi ve işveren uyuşmazlıkları, alacak ve işe iade davaları.', sortOrder: 1 },
  { slug: 'ticaret-hukuku', name: 'Ticaret Hukuku', summary: 'Şirketler, sözleşmeler ve ticari uyuşmazlıklar.', sortOrder: 2 },
]

function gerekliDeger(anahtar: string): string {
  const deger = process.env[anahtar]
  if (!deger) throw new Error(`${anahtar} tanımlı değil; tohum verisi parolayı uyduramaz.`)
  return deger
}

async function kullaniciEkle(email: string, password: string, name: string, role: 'admin' | 'editor') {
  const mevcut = await db.select().from(users).where(eq(users.email, email))
  if (mevcut.length > 0) return
  await db.insert(users).values({
    email, name, role, isActive: true,
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
  })
}

export async function seed(): Promise<void> {
  await kullaniciEkle(gerekliDeger('SEED_ADMIN_EMAIL'), gerekliDeger('SEED_ADMIN_PASSWORD'), 'Büro Yöneticisi', 'admin')
  await kullaniciEkle(gerekliDeger('SEED_EDITOR_EMAIL'), gerekliDeger('SEED_EDITOR_PASSWORD'), 'Yazar Avukat', 'editor')

  for (const kategori of SEED_CATEGORIES) {
    const mevcut = await db.select().from(categories).where(eq(categories.slug, kategori.slug))
    if (mevcut.length === 0) await db.insert(categories).values(kategori)
  }

  for (const alan of SEED_PRACTICE_AREAS) {
    const mevcut = await db.select().from(practiceAreas).where(eq(practiceAreas.slug, alan.slug))
    if (mevcut.length === 0) await db.insert(practiceAreas).values({ ...alan, isPublished: true })
  }

  const mevcutAyar = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID))
  if (mevcutAyar.length === 0) {
    // Plan 1'deki SITE sabitinin aynısı; gerçek bilgiler müşteriden gelince panelden değişecek.
    await db.insert(settings).values({
      id: SETTINGS_ID,
      officeName: 'Akıl Hukuk Bürosu',
      address: 'Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul',
      phone: '+90 216 000 00 00',
      email: 'info@example.com',
      footerText: 'Bu sitedeki bilgiler hukuki tavsiye niteliği taşımaz.',
    })
  }
}
```

`scripts/seed.mts`:

```ts
process.loadEnvFile(process.argv[2] ?? '.env.local')

const { seed } = await import('../src/db/seed.ts')
const { closeDb } = await import('../src/db/client.ts')

await seed()
console.log('Tohum verisi yüklendi.')
await closeDb()
```

`package.json`: `"db:seed": "node scripts/seed.mts"`.

- [ ] **Adım 9: Tohum verisini iki veritabanına da yükle**

```bash
npm run db:seed -- .env.local
npm run db:seed -- .env.test
```

- [ ] **Adım 10: Testlerin geçtiğini doğrula**

Çalıştır: `npm test`
Beklenen: 4 (slug) + 5 (şema) + 2 (date) + 9 (validation) + 6 (ad-ban) + 2 (seed) = 28 test GEÇTİ.

- [ ] **Adım 11: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Beklenen: hepsi yeşil — e2e regresyonu `ArticleStrip` değişikliğinin görünür çıktıyı
bozmadığını kanıtlar. Commit: `feat: zod doğrulama katmanı, tohum verisi ve paylaşılan yardımcılar`

---

### Görev 3: Kimlik doğrulama — Auth.js v5, argon2, `proxy.ts`, hız sınırı, rol kararları

**Dosyalar:**
- Oluştur: `src/auth.config.ts`, `src/auth.ts`, `src/proxy.ts`,
  `src/app/api/auth/[...nextauth]/route.ts`
- Oluştur: `src/lib/permissions.ts`, `src/lib/rate-limit.ts`, `src/lib/auth-guards.ts`
- Oluştur: `src/types/next-auth.d.ts`
- Oluştur: `src/app/panel/giris/page.tsx`, `src/app/panel/giris/actions.ts`,
  `src/app/panel/giris/LoginForm.tsx` + `.module.css`
- Test: `src/lib/permissions.test.ts`, `src/lib/rate-limit.test.ts`,
  `tests/e2e/panel-giris.spec.ts`, `tests/e2e/helpers/auth.ts`

**Arayüzler:**
- `src/lib/permissions.ts` →
  `export type PanelResource = 'articles' | 'media' | 'lawyers' | 'practiceAreas' | 'categories' | 'settings' | 'messages' | 'users'`;
  `export function canAccess(role: UserRole, resource: PanelResource): boolean`
- `src/lib/rate-limit.ts` →
  `export function createRateLimiter(options: { limit: number; windowMs: number }): { check(key: string, now?: number): { allowed: boolean; retryAfterMs: number } }`
- `src/lib/auth-guards.ts` →
  `export type PanelUser = { id: number; email: string; name: string; role: UserRole }`;
  `export async function requireUser(): Promise<PanelUser>`;
  `export async function requireAccess(resource: PanelResource): Promise<PanelUser>`
- `src/auth.ts` → `export const { handlers, signIn, signOut, auth }`

**Doğrulanacak (uygulayıcı önce kontrol etsin):** `next-auth@5.0.0-beta.32` hâlâ beta.
Peer bağımlılıkları `next: ^16.0.0` içeriyor ve Next 16.3.0 ile temiz kuruluyor (ölçüldü),
ancak `authorized` callback'inin `proxy.ts` altındaki davranışı beta sürümler arasında
değişebiliyor. Adım 8'deki e2e testi bu davranışın kanıtıdır; test kırmızı kalırsa
**dur ve bildir**, kendi başına başka bir kütüphaneye geçme.

- [ ] **Adım 1: Bağımlılığı ekle (sürüm sabit)**

```bash
npm i --save-exact next-auth@5.0.0-beta.32
```

`package.json` içinde satırın `"next-auth": "5.0.0-beta.32"` olduğunu **gözle doğrula**;
`^` varsa elle kaldır. Beta güncellemesi kimlik doğrulamasını sessizce kırabilir.

- [ ] **Adım 2: Başarısız testleri yaz**

`src/lib/permissions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canAccess } from '@/lib/permissions'

describe('canAccess', () => {
  it('editor makale ve medya yönetir', () => {
    expect(canAccess('editor', 'articles')).toBe(true)
    expect(canAccess('editor', 'media')).toBe(true)
  })

  // Spec §3: kadro, alanlar, kategoriler, ayarlar, mesajlar ve kullanıcılar admin'e ait.
  it.each(['lawyers', 'practiceAreas', 'categories', 'settings', 'messages', 'users'] as const)(
    'editor %s kaynağına erişemez',
    (resource) => {
      expect(canAccess('editor', resource)).toBe(false)
    },
  )

  it.each(['articles', 'media', 'lawyers', 'practiceAreas', 'categories', 'settings', 'messages', 'users'] as const)(
    'admin %s kaynağına erişir',
    (resource) => {
      expect(canAccess('admin', resource)).toBe(true)
    },
  )
})
```

**Hangi mutasyonda kırılır:** `canAccess` gövdesi `return true` yapılırsa altı editor testi
birden kırılır; tek bir kaynağın izin listesinden çıkarılması ilgili admin testini kırar.

`src/lib/rate-limit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'

describe('createRateLimiter', () => {
  it('sınıra kadar izin verir, sonrasında reddeder', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 })
    expect(limiter.check('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 1_000).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 2_000).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 3_000).allowed).toBe(false)
  })

  it('pencere dolunca yeniden izin verir', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    expect(limiter.check('1.2.3.4', 0).allowed).toBe(true)
    expect(limiter.check('1.2.3.4', 59_999).allowed).toBe(false)
    expect(limiter.check('1.2.3.4', 60_001).allowed).toBe(true)
  })

  it('farklı anahtarları birbirinden ayırır', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('1.2.3.4', 0)
    expect(limiter.check('5.6.7.8', 0).allowed).toBe(true)
  })

  it('reddedince ne kadar beklenmesi gerektiğini söyler', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('1.2.3.4', 0)
    expect(limiter.check('1.2.3.4', 10_000).retryAfterMs).toBe(50_000)
  })
})
```

**Hangi mutasyonda kırılır:** anahtar başına ayrım kaldırılırsa üçüncü test, pencere kayması
yanlış hesaplanırsa ikinci ve dördüncü test kırılır. Saat parametre olarak geçtiği için sahte
zamanlayıcıya ihtiyaç yok.

`tests/e2e/helpers/auth.ts`:

```ts
import { existsSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL!,
  password: process.env.SEED_ADMIN_PASSWORD!,
  name: 'Büro Yöneticisi',
}

export const EDITOR = {
  email: process.env.SEED_EDITOR_EMAIL!,
  password: process.env.SEED_EDITOR_PASSWORD!,
  name: 'Yazar Avukat',
}

export async function girisYap(page: Page, kullanici: { email: string; password: string }) {
  await page.goto('/panel/giris')
  await page.getByLabel('E-posta').fill(kullanici.email)
  await page.getByLabel('Parola').fill(kullanici.password)
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  await expect(page).toHaveURL(/\/panel(\/|$)/)
}
```

> Yardımcı dosya `tests/e2e/helpers/` altında ve `.spec.ts` uzantısı taşımıyor; Playwright'ın
> varsayılan `testMatch` deseni onu test dosyası saymaz.

`tests/e2e/panel-giris.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN, EDITOR } from './helpers/auth'

test('oturumsuz kullanıcı panele giremez, giriş sayfasına yönlenir', async ({ page }) => {
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/giris/)
  await expect(page.getByRole('heading', { level: 1, name: 'Panel Girişi' })).toBeVisible()
})

test('yanlış parola alan bazında Türkçe hata gösterir ve oturum açmaz', async ({ page }) => {
  await page.goto('/panel/giris')
  await page.getByLabel('E-posta').fill(ADMIN.email)
  await page.getByLabel('Parola').fill('kesinlikle-yanlis-parola')
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-posta veya parola hatalı.')
  await expect(page).toHaveURL(/\/panel\/giris/)
})

test('doğru bilgiyle giriş panele düşürür ve kullanıcı adını gösterir', async ({ page }) => {
  await girisYap(page, ADMIN)
  await expect(page).toHaveURL(/\/panel$/)
  await expect(page.getByText(ADMIN.name)).toBeVisible()
})

test('çıkış yapınca panel yeniden korumaya girer', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.getByRole('button', { name: 'Çıkış yap' }).click()
  await expect(page).toHaveURL(/\/panel\/giris/)
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/giris/)
})

test('giriş sayfasında erişilebilirlik ihlali yok', async ({ page }) => {
  await page.goto('/panel/giris')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})
```

> Pasif kullanıcının giriş yapamadığı e2e testi Görev 7'de yazılır — kullanıcıyı pasifleştiren
> arayüz orada geliyor. `authorize` içindeki `isActive` kontrolü ise **burada** yazılır.

- [ ] **Adım 3: Testleri çalıştır, başarısız olduğunu gör**

Çalıştır: `npm test && npm run test:e2e -- --project=masaustu panel-giris`
Beklenen: birim testleri modül bulunamadığından, e2e testleri `/panel/giris` 404 verdiğinden
BAŞARISIZ.

- [ ] **Adım 4: İzin ve hız sınırı modülleri**

`src/lib/permissions.ts`:

```ts
import type { UserRole } from '@/db/schema'

export type PanelResource =
  | 'articles' | 'media' | 'lawyers' | 'practiceAreas'
  | 'categories' | 'settings' | 'messages' | 'users'

// Spec §3: editor yalnız yayın üretir; büroyu tanıtan veriler ve kullanıcı yönetimi admin'de.
const EDITOR_RESOURCES: ReadonlySet<PanelResource> = new Set(['articles', 'media'])

export function canAccess(role: UserRole, resource: PanelResource): boolean {
  return role === 'admin' || EDITOR_RESOURCES.has(resource)
}
```

`src/lib/rate-limit.ts`:

```ts
type Window = { count: number; startedAt: number }

export type RateLimitResult = { allowed: boolean; retryAfterMs: number }

// Bellekte tutulur: süreç yeniden başlayınca sayaç sıfırlanır ve çok süreçli bir dağıtımda
// her sürecin kendi sayacı olur. Tek Node süreci çalıştıran Hostinger Business için yeterli;
// yatay ölçekleme gerekirse ortak bir depoya (Redis) taşınmalı.
export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>()

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      const current = windows.get(key)
      if (!current || now - current.startedAt >= options.windowMs) {
        windows.set(key, { count: 1, startedAt: now })
        return { allowed: true, retryAfterMs: 0 }
      }
      if (current.count >= options.limit) {
        return { allowed: false, retryAfterMs: options.windowMs - (now - current.startedAt) }
      }
      current.count += 1
      return { allowed: true, retryAfterMs: 0 }
    },
  }
}
```

- [ ] **Adım 5: Auth.js yapılandırmasını böl**

İki dosya bilinçli: `proxy.ts` Next 16'da Node çalışma zamanında koşsa da paketleniyor;
`argon2` yerel ikili taşıdığı ve `mysql2` bağlantı havuzu açtığı için ikisi de proxy paketine
girmemeli.

`src/auth.config.ts` — veritabanı ve argon2 içermeyen ortak yapılandırma:

```ts
import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: { signIn: '/panel/giris' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = Number(user.id)
        token.role = user.role
        token.name = user.name
      }
      return token
    },
    session({ session, token }) {
      session.user.id = String(token.uid)
      session.user.role = token.role
      return session
    },
  },
} satisfies NextAuthConfig
```

`src/auth.ts`:

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import argon2 from 'argon2'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import { loginSchema } from '@/lib/validation'

// Kullanıcı yoksa da özet doğrulama maliyetini ödemek için kullanılan sabit; "bu e-posta
// kayıtlı mı" sorusunun yanıt süresinden okunmasını zorlaştırır.
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email))
        // Bozuk bir özet dizesi kimlik doğrulama başarısızlığıdır, uygulama hatası değil —
        // bu plandaki tek "hatayı false'a çevir" istisnası.
        const ok = await argon2
          .verify(user?.passwordHash ?? DUMMY_HASH, parsed.data.password)
          .catch(() => false)

        // Pasifleştirilmiş kullanıcı parolası doğru olsa da giremez (Görev 7).
        if (!user || !user.isActive || !ok) return null

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
        // Parola özeti oturuma sızmasın diye yalnız gereken alanlar dönüyor.
        return { id: String(user.id), email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
```

`src/types/next-auth.d.ts` — modül genişletme `.d.ts` gerektiriyor; Plan 1'in "ayrı tip dosyası
açılmaz" kuralına bilinçli istisna:

```ts
import type { UserRole } from '@/db/schema'

declare module 'next-auth' {
  interface User {
    role: UserRole
  }
  interface Session {
    user: { id: string; name: string; email: string; role: UserRole }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: number
    role: UserRole
  }
}
```

`src/proxy.ts` (Next 16'da `middleware.ts` kullanımdan kaldırıldı; dosya adı ve dışa aktarım
`proxy`, çalışma zamanı Node ve yapılandırılamaz):

```ts
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// Yalnız oturum çerezini doğrular; veritabanına ve argon2'ye dokunmaz.
export const { auth: proxy } = NextAuth(authConfig)

export const config = {
  // /panel/giris de eşleşir: Auth.js oturum açık kullanıcıyı buradan panele geri gönderir.
  matcher: ['/panel/:path*'],
}
```

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Adım 6: Sunucu tarafı bekçileri**

`src/lib/auth-guards.ts`:

```ts
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canAccess, type PanelResource } from '@/lib/permissions'
import type { UserRole } from '@/db/schema'

export type PanelUser = { id: number; email: string; name: string; role: UserRole }

export async function requireUser(): Promise<PanelUser> {
  const session = await auth()
  if (!session?.user) redirect('/panel/giris')
  return {
    id: Number(session.user.id),
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }
}

// Yetkisiz erişimde notFound(): kaynağın varlığını ele vermez ve gerçek bir HTTP durumu
// döndürür. forbidden() elendi — Next 16.3'te experimental.authInterrupts bayrağı gerekiyor,
// deneysel bayrak açmamak için bu yol seçildi.
export async function requireAccess(resource: PanelResource): Promise<PanelUser> {
  const user = await requireUser()
  if (!canAccess(user.role, resource)) notFound()
  return user
}
```

- [ ] **Adım 7: Giriş sayfasını yaz**

`src/app/panel/giris/actions.ts`:

```ts
'use server'

import { headers } from 'next/headers'
import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { loginSchema, toFieldErrors, type FormState } from '@/lib/validation'

const limiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 })

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) }

  // x-forwarded-for yoksa e-postaya düşüyoruz: sabit bir anahtar kullanmak tek bir saldırganın
  // herkesin girişini kilitlemesine yol açardı.
  const forwarded = (await headers()).get('x-forwarded-for')
  const key = forwarded?.split(',')[0]?.trim() || `email:${parsed.data.email}`
  const limit = limiter.check(key)
  if (!limit.allowed) {
    const dakika = Math.ceil(limit.retryAfterMs / 60_000)
    return { ok: false, errors: {}, message: `Çok fazla deneme yapıldı. ${dakika} dakika sonra tekrar deneyin.` }
  }

  try {
    await signIn('credentials', { ...parsed.data, redirectTo: '/panel' })
  } catch (error) {
    // signIn başarılı olduğunda redirect() fırlatıyor; onu yutmak girişi sessizce bozar.
    if (error instanceof AuthError) {
      return { ok: false, errors: {}, message: 'E-posta veya parola hatalı.' }
    }
    throw error
  }
  return { ok: true, errors: {} }
}
```

`src/app/panel/giris/LoginForm.tsx` — istemci bileşeni, `useActionState(login, EMPTY_FORM_STATE)`.
Her girdinin `<label htmlFor>` bağı var; sunucu mesajı `role="alert"` taşıyan bir kutuda;
alan hataları `aria-describedby` ile girdiye bağlanıyor ve `aria-invalid` işaretleniyor.
Gönderim sırasında düğme `disabled` ve metni "Giriş yapılıyor…" oluyor (`isPending`).

`src/app/panel/giris/page.tsx` — sunucu bileşeni: `<h1>Panel Girişi</h1>`, kısa açıklama ve
`<LoginForm />`. Koyu zeminde ortalanmış tek sütun; `--radius-block` yarıçaplı kart,
`--ink-2` yüzey.

- [ ] **Adım 8: Testlerin geçtiğini doğrula**

Çalıştır: `npm test && npm run test:e2e`
Beklenen: birim 28 + 9 = 37; e2e'de Plan 1'in 59 testi ve yeni 5 giriş testi yeşil.

- [ ] **Adım 9: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Commit: `feat: Auth.js v5 credentials girişi, rol kararları ve giriş hız sınırı`

---

### Görev 4: Site/panel kabuk ayrımı, panel iskeleti ve yüzey sözleşmesi borçları

**Bu plandaki en riskli görev** — Plan 1'in tüm e2e testleri regresyon koruması olarak
kullanılır.

**Dosyalar:**
- Oluştur: `src/app/(site)/layout.tsx`, `src/components/SiteShell.tsx`,
  `src/components/NotFoundContent.tsx`
- Taşı: `src/app/page.tsx`, `hakkimizda/`, `kadro/`, `calisma-alanlari/`, `makaleler/`,
  `iletisim/`, `kvkk/`, `cerez-politikasi/`, `error.tsx`, `error.module.css` →
  `src/app/(site)/` altına
- Oluştur: `src/app/(site)/not-found.tsx`
- Değiştir: `src/app/layout.tsx` (kabuk çıkar), `src/app/not-found.tsx` (SiteShell ile sar),
  `src/app/globals.css` (yüzey sözleşmesi + `.card`)
- Oluştur: `src/app/panel/layout.tsx` + `layout.module.css`, `src/app/panel/page.tsx`,
  `src/app/panel/actions.ts`, `src/app/panel/not-found.tsx`, `src/app/panel/error.tsx`,
  `src/components/PanelNav.tsx` + `.module.css`, `src/components/PanelHeading.tsx` + `.module.css`
- Değiştir: `src/components/SiteHeader.tsx` (`aria-current="page"` — Plan 1 borcu),
  `src/components/PracticeAreas.module.css`, `src/components/ArticleStrip.module.css` (`.card`)
- Test: `tests/e2e/panel-kabuk.spec.ts`; mevcut `shell.spec.ts`'e `aria-current` testi eklenir

**Plan 1 borçları bu görevde kapanıyor:** yüzey sözleşmesinin `--text-muted`/`--line`/
`--surface` ile genişletilmesi, `.card` ikizinin ortak sınıfa çıkarılması, `--paper-2` ölü
token'ının canlanması, `SiteHeader` bağlantılarında `aria-current="page"` eksikliği.

**Arayüzler:**
- `<SiteShell>{children}</SiteShell>` — atlama bağlantısı + `SiteHeader` + `<main id="content">`
  + `SiteFooter`
- `<PanelNav role={UserRole} userName={string} />` — role göre süzülmüş panel gezinmesi
- `<PanelHeading title={string} description?={string} action?={ReactNode} />`
- `globals.css` yeni token'ları: `--surface`, `--surface-raised`, `--text`, `--text-muted`,
  `--line`, `--accent` — hepsi `[data-surface="paper"]` altında karşılığına döner

- [ ] **Adım 1: Başarısız testi yaz**

`tests/e2e/panel-kabuk.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN, EDITOR } from './helpers/auth'

test('panelde genel site başlığı ve alt bilgisi görünmez', async ({ page }) => {
  await girisYap(page, ADMIN)
  await expect(page.getByRole('navigation', { name: 'Ana gezinme' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Alt bilgi gezinmesi' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Panel gezinmesi' })).toBeVisible()
})

test('admin panel gezinmesinde bütün bölümleri görür', async ({ page }) => {
  await girisYap(page, ADMIN)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  for (const ad of ['Makaleler', 'Medya', 'Kadro', 'Çalışma Alanları', 'Kategoriler', 'Mesajlar', 'Kullanıcılar', 'Ayarlar']) {
    await expect(nav.getByRole('link', { name: ad })).toBeVisible()
  }
})

test('editor panel gezinmesinde yalnız makale ve medya görür', async ({ page }) => {
  await girisYap(page, EDITOR)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  await expect(nav.getByRole('link', { name: 'Makaleler' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Medya' })).toBeVisible()
  for (const ad of ['Kadro', 'Çalışma Alanları', 'Kategoriler', 'Mesajlar', 'Kullanıcılar', 'Ayarlar']) {
    await expect(nav.getByRole('link', { name: ad })).toHaveCount(0)
  }
})

test('bulunulan panel bölümü aria-current ile işaretlenir', async ({ page }) => {
  await girisYap(page, ADMIN)
  const nav = page.getByRole('navigation', { name: 'Panel gezinmesi' })
  await nav.getByRole('link', { name: 'Makaleler' }).click()
  await expect(nav.getByRole('link', { name: 'Makaleler' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Medya' })).not.toHaveAttribute('aria-current', 'page')
})

test('panelde erişilebilirlik ihlali yok', async ({ page }) => {
  await girisYap(page, ADMIN)
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('genel sayfalar kabuğu ve 404 kabuğu taşımaya devam eder', async ({ page }) => {
  const res = await page.goto('/olmayan-sayfa')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible()
  // Rota grubu taşımasının kabuğu 404'te düşürmediğinin kanıtı:
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('link', { name: 'İçeriğe atla' })).toHaveCount(1)
})
```

`tests/e2e/shell.spec.ts` sonuna ekle (Plan 1 borcu):

```ts
test('bulunulan sayfanın bağlantısı aria-current taşır', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'masaustu', 'mobilde panel kapalı başlar')
  await page.goto('/kadro')
  const nav = page.getByRole('navigation', { name: 'Ana gezinme' })
  await expect(nav.getByRole('link', { name: 'Kadro' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Makaleler' })).not.toHaveAttribute('aria-current', 'page')
})
```

**Hangi mutasyonda kırılır:** `PanelNav` rol süzgeci kaldırılırsa üçüncü test kırılır;
`(site)` rota grubu açılmadan panel kabuk ayrımı yapılırsa birinci test kırılır; 404 kabuğu
düşerse altıncı test kırılır; `aria-current` mantığı sabit `true` olursa dördüncü testin
ikinci iddiası kırılır.

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npm run test:e2e -- --project=masaustu panel-kabuk`
Beklenen: BAŞARISIZ — `/panel` yalnız giriş sayfasına sahip, panel gezinmesi yok.

- [ ] **Adım 3: Kabuğu bileşene çıkar**

`src/components/SiteShell.tsx`:

```tsx
import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

type SiteShellProps = { children: ReactNode }

// Kabuk hem (site) rota grubunun layout'unda hem de kök not-found.tsx'te kullanılıyor:
// eşleşmeyen adreslerde Next kök layout'u çiziyor, rota grubunun layout'unu değil.
export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <a href="#content" className="skipLink">İçeriğe atla</a>
      <SiteHeader />
      <main id="content" tabIndex={-1}>{children}</main>
      <SiteFooter />
    </>
  )
}
```

`src/app/layout.tsx` — yalnız `<html>`/`<body>`, yazı tipleri ve metadata kalır; `SiteHeader`,
`SiteFooter`, atlama bağlantısı ve `<main>` çıkar. **Veri çekilmez** (spec §11 bağlayıcı kararı).

`src/app/(site)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { SiteShell } from '@/components/SiteShell'

// settings sorgusu Plan 3'te BURAYA gelecek — kök layout'a değil. Kök layout hatasında
// sunucu Next'in __next_error__ kabuğunu döndürüyor ve telefon numarası kayboluyor (ölçüldü).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
```

- [ ] **Adım 4: Sayfaları rota grubuna taşı**

```bash
mkdir -p "src/app/(site)"
git mv src/app/page.tsx "src/app/(site)/page.tsx"
git mv src/app/hakkimizda src/app/kadro src/app/calisma-alanlari src/app/makaleler \
       src/app/iletisim src/app/kvkk src/app/cerez-politikasi "src/app/(site)/"
git mv src/app/error.tsx src/app/error.module.css "src/app/(site)/"
```

`globals.css`, `favicon.ico`, `global-error.tsx`, `layout.tsx`, `not-found.tsx` ve
`not-found.module.css` **kökte kalır**.

404 içeriğini `src/components/NotFoundContent.tsx`'e çıkar; sonra:
- `src/app/not-found.tsx` → `<SiteShell><NotFoundContent /></SiteShell>` (eşleşmeyen adresler
  kök layout'u kullanır, rota grubunun layout'unu almaz)
- `src/app/(site)/not-found.tsx` → yalnız `<NotFoundContent />` (kabuğu grubun layout'u veriyor;
  `notFound()` bir `(site)` sayfasından çağrıldığında bu boundary devreye girer, kabuk iki kez
  çizilmez)

`src/app/(site)/error.tsx` taşındığı yerde kalır; içeriği değişmez. Bu, ölçülen davranışın
korunmasını sağlar: sayfa düzeyi hatada `(site)/layout.tsx` sunucuda çizilir, telefon numarası
JavaScript olmadan da HTML'de bulunur.

- [ ] **Adım 5: Yüzey sözleşmesini genişlet (Plan 1 borcu)**

`globals.css` içindeki `:root` ve `[data-surface="paper"]` bloklarını şu hâle getir —
**mevcut token adları ve değerleri değişmez**, üzerlerine zemin-bağımsız takma adlar eklenir:

```css
:root {
  /* … mevcut renk/geometri token'ları aynen … */

  /* Zemin-bağımsız yüzey sözleşmesi: bileşenler artık --ink/--paper ikilisini değil
     bunları okur, böylece aynı bileşen iki zeminde de doğru çizilir. */
  --surface: var(--ink);
  --surface-raised: var(--ink-2);
  --text: var(--text-ink);
  --text-muted: var(--text-ink-muted);
  --line: var(--line-ink);
  --accent: var(--gold);
  --focus-ring: var(--gold);
}

[data-surface="paper"] {
  --surface: var(--paper);
  --surface-raised: var(--paper-2);
  --text: var(--text-paper);
  --text-muted: var(--text-paper-muted);
  --line: var(--line-paper);
  --accent: var(--gold-ink);
  --focus-ring: var(--gold-ink);
  background: var(--surface);
  color: var(--text);
}

/* Kart yüzeyi üç bileşende (PracticeAreas, ArticleStrip, panel listeleri) aynı üç kuralla
   tekrarlanıyordu; ortak sınıfa çıkarıldı. --paper-2 token'ı ilk kez burada kullanılıyor. */
.card {
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: clamp(1rem, 3vw, 1.5rem);
}
```

`background: var(--surface)` hesaplanan değeri `--paper` ile aynı kalır; `design-system.spec.ts`
ve `home.spec.ts`'teki `rgb(239, 236, 227)` iddiaları yeşil kalmalıdır. Bu **regresyon
kontrolüdür**, kırılırsa değişiklik yanlıştır.

`PracticeAreas.module.css` ve `ArticleStrip.module.css` içindeki kart kuralları `.card` ortak
sınıfına devredilir; ilgili bileşenlerde `className={`card ${styles.item}`}` biçimi kullanılır.

- [ ] **Adım 6: `SiteHeader`'a `aria-current` ekle (Plan 1 borcu)**

`SiteHeader` zaten istemci bileşeni. `usePathname()` ile:

```tsx
const pathname = usePathname()
// Alt sayfalarda da üst bölüm işaretli kalsın: /kadro/tolga-akil → "Kadro".
const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
```

Her `<Link>`'e `aria-current={isCurrent(l.href) ? 'page' : undefined}`.

- [ ] **Adım 7: Panel kabuğunu yaz**

**Bilinen tuzak ve seçilen çözüm:** `/panel/giris` de `src/app/panel/layout.tsx` altındadır.
Layout içinde `requireUser()` çağrılırsa giriş sayfası sonsuz yönlendirmeye girer. Alt rota
grubu (`panel/(auth)/giris`) bunu **çözmez** — grup üstteki layout'u yine miras alır.
Bu yüzden koruma layout'a değil **her sayfaya** konur; layout yalnız kabuğu çizer ve
gezinmeyi oturum varsa gösterir.

```tsx
import type { ReactNode } from 'react'
import { auth } from '@/auth'
import { PanelNav } from '@/components/PanelNav'
import styles from './layout.module.css'

export default async function PanelLayout({ children }: { children: ReactNode }) {
  // Koruma burada DEĞİL: /panel/giris de bu layout'un altında ve requireUser() burada
  // çağrılsa sonsuz yönlendirme olurdu. Her panel sayfası kendi requireUser()/requireAccess()
  // çağrısını yapar; proxy.ts de ilk hat olarak zaten devrede.
  const session = await auth()

  return (
    <div className={styles.layout}>
      <a href="#panel-content" className="skipLink">İçeriğe atla</a>
      {session?.user ? <PanelNav role={session.user.role} userName={session.user.name} /> : null}
      <main id="panel-content" tabIndex={-1} className={styles.content}>{children}</main>
    </div>
  )
}
```

`src/components/PanelNav.tsx` — istemci bileşeni (`usePathname` + `aria-current`),
`canAccess(role, resource)` ile süzülmüş bağlantı listesi, kullanıcı adı ve `signOut`
çağıran "Çıkış yap" düğmesi (server action `src/app/panel/actions.ts` içinde).
Bağlantı listesi sabiti:

```ts
const PANEL_LINKS = [
  { href: '/panel/makaleler', label: 'Makaleler', resource: 'articles' },
  { href: '/panel/medya', label: 'Medya', resource: 'media' },
  { href: '/panel/kadro', label: 'Kadro', resource: 'lawyers' },
  { href: '/panel/calisma-alanlari', label: 'Çalışma Alanları', resource: 'practiceAreas' },
  { href: '/panel/kategoriler', label: 'Kategoriler', resource: 'categories' },
  { href: '/panel/mesajlar', label: 'Mesajlar', resource: 'messages' },
  { href: '/panel/kullanicilar', label: 'Kullanıcılar', resource: 'users' },
  { href: '/panel/ayarlar', label: 'Ayarlar', resource: 'settings' },
] as const satisfies ReadonlyArray<{ href: string; label: string; resource: PanelResource }>
```

`src/app/panel/page.tsx` — `requireUser()`, sonra rol izinlerine göre sayı kartları
(taslak makale sayısı, yayımlanmış makale sayısı, okunmamış mesaj sayısı — sonuncusu yalnız
admin'e). `.card` ortak sınıfını kullanır.

`src/app/panel/not-found.tsx` ve `src/app/panel/error.tsx` — panel kabuğuna oturan sade
sürümler. `error.tsx` hatayı `console.error` ile loglar ve "Panele dön" bağlantısı verir;
hata yutulmaz.

- [ ] **Adım 8: Testlerin geçtiğini doğrula**

Çalıştır: `npm run test:e2e`
Beklenen: Plan 1'in 59 testi + Görev 3'ün 5 testi + yeni 6 panel testi + 1 `aria-current` testi
yeşil. **Plan 1 testlerinden herhangi biri kırıldıysa rota grubu taşıması yanlış yapılmıştır;
düzeltilmeden ilerlenmez.**

> Görev 4'te `/panel/kullanicilar` ve diğer admin rotaları henüz yok; `PanelNav` bağlantıları
> Görev 7 bitene kadar 404 verir. Bu bilinçli: gezinme sözleşmesi burada sabitlenir, sayfalar
> Görev 7'de gelir. Yalnızca bağlantının **görünürlüğü** test edilir, tıklanabilirliği değil.

- [ ] **Adım 9: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Commit: `feat: site ve panel kabuklarının ayrılması, panel iskeleti ve yüzey sözleşmesi`

---

### Görev 5: Makale CRUD — Tiptap, sunucu tarafı temizleme, slug çakışması, onaylı reklam uyarısı

**Dosyalar:**
- Oluştur: `src/lib/sanitize.ts`, `src/db/queries/articles.ts`
- Oluştur: `src/app/panel/makaleler/page.tsx` + `.module.css`,
  `src/app/panel/makaleler/actions.ts`,
  `src/app/panel/makaleler/yeni/page.tsx`, `src/app/panel/makaleler/[id]/page.tsx`
- Oluştur: `src/components/ArticleForm.tsx` + `.module.css`,
  `src/components/RichTextEditor.tsx` + `.module.css`,
  `src/components/PublishChecklist.tsx` + `.module.css`,
  `src/components/ConfirmDeleteDialog.tsx` + `.module.css`
- Değiştir: `src/app/globals.css` (`.prose`)
- Test: `src/lib/sanitize.test.ts`, `tests/e2e/panel-makale.spec.ts`

**Plan 1 borcu bu görevde kapanıyor:** `prose` tipografisi.

**Arayüzler:**
- `src/lib/sanitize.ts` → `export function sanitizeArticleHtml(dirty: string): string`,
  `export function htmlToPlainText(html: string): string`
- `src/db/queries/articles.ts` →
  `export type ArticleListItem = { id: number; slug: string; title: string; status: ArticleStatus; publishedAt: Date | null; updatedAt: Date; categoryName: string | null }`;
  `export async function listArticles(): Promise<ArticleListItem[]>`;
  `export async function getArticleById(id: number): Promise<Article | null>`;
  `export async function isSlugTaken(slug: string, exceptId?: number): Promise<boolean>`
- `src/app/panel/makaleler/actions.ts` →
  `export async function saveArticle(prev: FormState, formData: FormData): Promise<FormState>`;
  `export async function deleteArticle(prev: FormState, formData: FormData): Promise<FormState>`

- [ ] **Adım 1: Bağımlılıkları ekle**

```bash
npm i --save-exact sanitize-html@2.17.7 @tiptap/react@3.30.2 @tiptap/pm@3.30.2 @tiptap/starter-kit@3.30.2
npm i -D --save-exact @types/sanitize-html@2.16.1
```

> `@tiptap/starter-kit@3.30.2` bağlantı (`extension-link`), liste, başlık, alıntı ve kod bloğu
> eklentilerini zaten içeriyor (bağımlılık listesiyle doğrulandı); ayrı eklenti paketi kurulmaz.

- [ ] **Adım 2: Başarısız testleri yaz**

`src/lib/sanitize.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'

describe('sanitizeArticleHtml', () => {
  it('script etiketini ve içeriğini tamamen atar', () => {
    expect(sanitizeArticleHtml('<p>Merhaba</p><script>alert(1)</script>')).toBe('<p>Merhaba</p>')
  })

  it('olay özniteliklerini siler', () => {
    expect(sanitizeArticleHtml('<p onclick="calis()">Metin</p>')).toBe('<p>Metin</p>')
  })

  it('javascript: adresli bağlantıyı zararsızlaştırır', () => {
    const temiz = sanitizeArticleHtml('<a href="javascript:alert(1)">bağlantı</a>')
    expect(temiz).not.toContain('javascript:')
    expect(temiz).toContain('bağlantı')
  })

  it('iframe ve img etiketlerini beyaz listeye almaz', () => {
    expect(sanitizeArticleHtml('<iframe src="https://a.test"></iframe><img src="x" onerror="y">')).toBe('')
  })

  it('izin verilen biçimlendirmeyi korur', () => {
    const girdi = '<h2>Başlık</h2><p><strong>Kalın</strong> ve <em>eğik</em></p><ul><li>Madde</li></ul>'
    expect(sanitizeArticleHtml(girdi)).toBe(girdi)
  })

  it('dış bağlantıya rel ekler', () => {
    expect(sanitizeArticleHtml('<a href="https://resmigazete.gov.tr">Kaynak</a>')).toContain(
      'rel="noopener noreferrer"',
    )
  })

  it('Türkçe karakterleri bozmaz', () => {
    expect(sanitizeArticleHtml('<p>İşçi şğüöç ÇĞİÖŞÜ</p>')).toBe('<p>İşçi şğüöç ÇĞİÖŞÜ</p>')
  })
})

describe('htmlToPlainText', () => {
  it('etiketleri atıp metni bırakır', () => {
    expect(htmlToPlainText('<h2>Başlık</h2><p>Gövde</p>')).toBe('Başlık Gövde')
  })
})
```

**Hangi mutasyonda kırılır:** `allowedTags` listesine `iframe`/`img` eklenirse dördüncü test,
`allowedAttributes` içine olay özniteliği girerse ikinci test, `allowedSchemes` genişletilirse
üçüncü test, `transformTags` ile `rel` eklemesi kaldırılırsa altıncı test kırılır. Beşinci test
temizleyicinin fazla agresif olup meşru biçimlendirmeyi silmesini yakalar.

`tests/e2e/panel-makale.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { girisYap, EDITOR } from './helpers/auth'

// Her koşu kendi verisini üretir ve siler; testler geliştirme veya test veritabanına
// karşı koşsun, birbirine karışmaz.
const damga = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`

test('giriş → makale yaz → taslak kaydet → yayımla → listede yayında görünür', async ({ page }) => {
  const baslik = `Kira tespit notu ${damga()}`
  await girisYap(page, EDITOR)
  await page.getByRole('link', { name: 'Makaleler' }).click()
  await page.getByRole('link', { name: 'Yeni makale' }).click()

  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Kira bedelinin belirlenmesinde uygulanan ölçütler üzerine kısa not.')
  await page.locator('[contenteditable="true"]').fill('Kiracının hakları ve süreler.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  await expect(page.getByLabel('Adres (slug)')).toHaveValue(/^kira-tespit-notu-e2e-\d+/)

  await page.getByLabel('Kategori').selectOption({ label: 'Kira Hukuku' })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  await page.getByRole('link', { name: 'Makaleler' }).click()
  const satir = page.getByRole('row', { name: new RegExp(baslik) })
  await expect(satir.getByText('Yayında')).toBeVisible()

  // Temizlik
  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(baslik) })).toHaveCount(0)
})

test('kategorisiz yayımlama alan hatası verir ve kaydetmez', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(`Kategorisiz ${damga()}`)
  await page.getByLabel('Özet').fill('Yayımlamayı kategori olmadan denemek için yazılmış özet metni.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByText('Yayımlamak için kategori seçin.')).toBeVisible()
})

test('çakışan slug kullanıcıya açıkça bildirilir', async ({ page }) => {
  const baslik = `Çakışan başlık ${damga()}`
  await girisYap(page, EDITOR)

  for (const sira of [1, 2]) {
    await page.goto('/panel/makaleler/yeni')
    await page.getByLabel('Başlık').fill(baslik)
    await page.getByLabel('Özet').fill('Aynı slug ile ikinci kaydın reddedildiğini gösteren özet.')
    await page.locator('[contenteditable="true"]').fill('Gövde')
    await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
    if (sira === 1) await expect(page.getByRole('status')).toBeVisible()
  }
  await expect(page.getByText('Bu adres başka bir makalede kullanılıyor.')).toBeVisible()
})

// Reklam yasağı taraması ENGEL DEĞİL, onaylı uyarıdır: ilk gönderimde yayın durur ve
// bulgular konumuyla listelenir; onay kutusu işaretlenip yeniden gönderilince yayın geçer.
test('yasaklı ifade önce uyarı üretir, onaylanınca yayın tamamlanır', async ({ page }) => {
  const baslik = `Uyarı denemesi ${damga()}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill('Bu alanda uzman kadromuzla hizmet veriyoruz ifadesini içeren özet.')
  await page.locator('[contenteditable="true"]').fill('Gövde')
  await page.getByLabel('Kategori').selectOption({ label: 'İş Hukuku' })
  await page.getByRole('button', { name: 'Yayımla' }).click()

  const uyari = page.getByRole('alert')
  await expect(uyari).toContainText('Reklam yasağı')
  await expect(uyari).toContainText('uzman')
  // Konum bilgisi de gösterilmeli; yalnız kelime listesi yeterli değil.
  await expect(uyari).toContainText('karakter')
  // Uyarı aşamasında kayıt YAPILMAMIŞ olmalı.
  await expect(page.getByRole('status')).toHaveCount(0)

  await page.getByLabel(/okudum, sorumluluk bende/i).check()
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  await page.goto('/panel/makaleler')
  const satir = page.getByRole('row', { name: new RegExp(baslik) })
  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
})
```

**Hangi mutasyonda kırılır:** tarama tamamen kaldırılırsa ilk gönderim doğrudan yayımlanır ve
"kayıt yapılmamış olmalı" iddiası kırılır; tarama **engelleyici** yapılırsa onay kutusundan
sonraki gönderim de reddedilir ve son iddia kırılır; `formatBannedMatch` konumu bırakırsa
"karakter" iddiası kırılır.

- [ ] **Adım 3: Testleri çalıştır, başarısız olduğunu gör**

Çalıştır: `npm test && npm run test:e2e -- --project=masaustu panel-makale`
Beklenen: BAŞARISIZ — `@/lib/sanitize` yok, `/panel/makaleler` 404.

- [ ] **Adım 4: Temizleyiciyi yaz**

`src/lib/sanitize.ts`:

```ts
import sanitizeHtml from 'sanitize-html'

// Panelden gelen HTML güvenilmez veridir (spec §6). Beyaz liste bilinçli olarak dar:
// görsel, tablo ve gömülü içerik editörden değil, medya kitaplığından gelir.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
  allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Dış bağlantı yeni sekmede açılırsa açan pencereye erişim bırakmasın.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, OPTIONS)
}

// Arama, meta açıklama ve reklam yasağı taraması için düz metin; hiçbir etikete izin vermez.
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Adım 5: Sorguları yaz**

`src/db/queries/articles.ts` — `listArticles` kategoriyi `leftJoin` ile getirir ve `updatedAt`
azalan sıralar. `isSlugTaken(slug, exceptId)` düzenlemede kendi kaydını saymaz. Bütün
fonksiyonlar `db` üzerinden çalışır; hata yakalanmaz, çağırana geçer.

- [ ] **Adım 6: Server action'ları yaz**

`saveArticle` sırası:

1. `await requireAccess('articles')` — yetki her çağrıda yeniden doğrulanır.
2. `articleSchema.safeParse(...)` → hata varsa `toFieldErrors` ile dön.
3. `sanitizeArticleHtml(parsed.data.content)`; sonuç boşsa
   `{ content: ['İçerik temizlendikten sonra boş kaldı; metin ekleyin.'] }`.
4. `isSlugTaken(slug, id)` → doluysa `{ slug: ['Bu adres başka bir makalede kullanılıyor.'] }`
   (spec §11: slug çakışması kullanıcıya açıkça bildirilir).
5. **Onaylı reklam uyarısı.** `status === 'published'` ise:

```ts
const taranacak = [parsed.data.title, parsed.data.excerpt, htmlToPlainText(temizIcerik)].join(' ')
const bulgular = findBannedPhrases(taranacak)
const onaylandi = formData.get('adBanAcknowledged') === 'evet'
if (bulgular.length > 0 && !onaylandi) {
  // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
  // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse yayın tamamlanır.
  return { ok: false, errors: {}, warnings: bulgular.map(formatBannedMatch) }
}
```

6. Yeni kayıtta `insert`, düzenlemede `update`. `published` ilk kez seçildiğinde
   `publishedAt = new Date()`; taslağa geri alınırsa `publishedAt` **silinmez** (yeniden
   yayımlamada özgün tarih korunsun).
7. `revalidateTag(TAGS.articles, 'max')` ve `revalidateTag(articleTag(slug), 'max')`.
8. `revalidatePath('/panel/makaleler')`, sonra yeni kayıtta
   `redirect(`/panel/makaleler/${id}`)`, düzenlemede
   `{ ok: true, errors: {}, message: 'Makale yayımlandı.' }` (taslakta
   `'Makale taslak olarak kaydedildi.'`).

> **`revalidateTag` iki argümanlıdır.** Next 16.3'te tek argümanlı biçim kullanımdan
> kaldırıldı ve TypeScript hatası veriyor; `'max'` profili stale-while-revalidate anlamı
> taşıyor (resmî belge ile doğrulandı).
>
> **`cacheComponents` bu planda açılmıyor.** `'use cache'` ve `cacheTag` bu bayrağı gerektiriyor;
> bayrak tüm genel sayfaların dinamik erişim düzenini değiştirdiği için Plan 3'ün kararı.
> Plan 2 yalnız **etiketleri üretir ve tazeler**; henüz etiketli önbellek girdisi olmadığından
> çağrılar etkisizdir ve hata vermez. Plan 3 okuma tarafını `'use cache'` + `cacheTag` ile bağlar.

`deleteArticle`: `requireAccess('articles')`, kaydı bul, `db.delete`, `revalidateTag`,
`revalidatePath`. Silme onayı `ConfirmDeleteDialog` içinde alınır: yerleşik `<dialog>` +
`showModal()`, `Escape` kapatır, kapanınca odak tetikleyen düğmeye döner.

- [ ] **Adım 7: Editörü ve formu yaz**

`src/components/RichTextEditor.tsx`:

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import styles from './RichTextEditor.module.css'

type RichTextEditorProps = { name: string; defaultValue: string; label: string }

export function RichTextEditor({ name, defaultValue, label }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultValue,
    // Sunucuda çizilirse hydrate uyuşmazlığı oluyor (Tiptap 3 Next.js belgesi).
    immediatelyRender: false,
    editorProps: { attributes: { 'aria-label': label, class: styles.surface } },
  })

  return (
    <div className={styles.wrapper}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Server action FormData okuyor; editör içeriği gizli alan üzerinden gidiyor. */}
      <input type="hidden" name={name} value={editor?.getHTML() ?? defaultValue} readOnly />
    </div>
  )
}
```

`EditorToolbar` aynı dosyada: kalın, eğik, H2, H3, madde listesi, numaralı liste, alıntı,
bağlantı ekle/kaldır düğmeleri. Her düğme `type="button"`, `aria-pressed={editor.isActive(...)}`
ve Türkçe erişilebilir ad taşır. `editor` `null` iken araç çubuğu `disabled` çizilir.

`src/components/ArticleForm.tsx` — istemci bileşeni, `useActionState(saveArticle, EMPTY_FORM_STATE)`.
İki gönderme düğmesi: `name="status" value="draft"` → "Taslak olarak kaydet";
`name="status" value="published"` → "Yayımla". Başarı mesajı `role="status"`, uyarılar
`role="alert"` taşıyan `PublishChecklist` kutusunda.

`src/components/PublishChecklist.tsx` — `warnings` boş değilken görünür:

- Başlık: "Reklam yasağı kontrolü".
- Bulguların listesi (her satır `formatBannedMatch` çıktısı: ifade + karakter konumu + bağlam).
- Spec §2.1'in yasak kalemlerini sayan kısa hatırlatma ve baroya danışma notu.
- Onay kutusu: `name="adBanAcknowledged" value="evet"`, etiketi
  **"Bu metni okudum, sorumluluk bende — yayımla"**, **önceden işaretli değil**.

- [ ] **Adım 8: `.prose` tipografisini yaz (Plan 1 borcu)**

`globals.css` sonuna:

```css
/* Temizlenmiş makale HTML'inin okuma ritmi. Renk yazmaz; yüzey sözleşmesinden okur, böylece
   hem panel önizlemesinde (koyu) hem Plan 3'ün makale sayfasında (krem) doğru çizilir. */
.prose { max-width: 68ch; }
.prose > * + * { margin-top: 1.1em; }
.prose h2 { font-size: 28px; margin-top: 2em; }
.prose h3 { font-size: 22px; margin-top: 1.6em; }
.prose ul, .prose ol { padding-left: 1.4em; }
.prose li + li { margin-top: .4em; }
.prose blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1em;
  color: var(--text-muted);
}
.prose a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.prose hr { border: 0; border-top: 1px solid var(--line); }
```

`/panel/makaleler/[id]` sayfasına "Önizleme" bölümü: temizlenmiş HTML
`<div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }} />`
ile çizilir. **Temizleme okumada da tekrarlanır** — veritabanına eski, temizlenmemiş bir kayıt
girmiş olabilir.

- [ ] **Adım 9: Testlerin geçtiğini doğrula**

Çalıştır: `npm test && npm run test:e2e`
Beklenen: birim 37 + 8 = 45; e2e'de yeni 4 makale testi dahil hepsi yeşil.

- [ ] **Adım 10: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Commit: `feat: makale CRUD, Tiptap editörü ve sunucu tarafı HTML temizleme`

---

### Görev 6: Medya yükleme — dağıtım kökü dışı depolama, `sharp`, zorunlu alt metin

**Dosyalar:**
- Oluştur: `src/lib/media-storage.ts`, `src/db/queries/media.ts`
- Oluştur: `src/app/panel/medya/page.tsx` + `.module.css`, `src/app/panel/medya/actions.ts`
- Oluştur: `src/components/MediaUploadForm.tsx` + `.module.css`,
  `src/components/MediaPicker.tsx` + `.module.css`
- Oluştur: `src/app/medya/[...path]/route.ts`
- Değiştir: `src/components/ArticleForm.tsx` (kapak görseli seçici)
- Test: `src/lib/media-storage.test.ts`, `tests/e2e/panel-medya.spec.ts`

> **`UPLOAD_DIR` hakkında bağlayıcı not.** Yerelde `./.uploads` kullanılır ve `.gitignore`
> ile dışlanır (Görev 1 Adım 3). Bu **yalnız geliştirme içindir**. Üretimde `UPLOAD_DIR`
> **dağıtım kökünün dışında** bir dizin olmak zorundadır; Hostinger her dağıtımda uygulama
> dizinini yeniden kurduğu için kök içindeki yüklemeler silinir. Gerçek üretim yolunun
> belirlenmesi ve dağıtım sonrası kalıcılığın gerçek Hostinger ortamında sınanması spec §13'ün
> ilk açık maddesidir ve **Plan 3'e devredilmiştir** (bkz. plan sonundaki bölüm). Bu görev
> kodu, yolu tek bir modülde (`media-storage.ts`) topladığı için gerekirse Cloudflare R2'ye
> geçiş sınırlı bir değişiklikle yapılabilir.

**Arayüzler:**
- `src/lib/media-storage.ts` →
  `export function uploadDir(): string`;
  `export function resolveUploadPath(relative: string): string` — `UPLOAD_DIR` dışına çıkan
  yolu reddeder, `Error` fırlatır;
  `export function buildStoredName(originalName: string, bytes: Buffer): { relative: string; extension: string }`;
  `export async function storeImage(file: File, dir: string): Promise<{ relative: string; width: number; height: number; sizeBytes: number }>`
- `src/db/queries/media.ts` → `listMedia()`, `getMediaById(id)`, `deleteMediaRow(id)`

- [ ] **Adım 1: `sharp` ekle**

```bash
npm i --save-exact sharp@0.35.3
```

(Windows/Node 22 üzerinde hazır ikili ile kurulduğu ve 3000×2000 JPEG'i 1600 genişliğe WebP
olarak indirdiği ölçüldü.)

- [ ] **Adım 2: Başarısız testleri yaz**

`src/lib/media-storage.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { buildStoredName, resolveUploadPath, storeImage } from '@/lib/media-storage'

let dizin: string

beforeAll(() => {
  dizin = mkdtempSync(path.join(tmpdir(), 'medya-'))
  process.env.UPLOAD_DIR = dizin
})

afterAll(() => {
  rmSync(dizin, { recursive: true, force: true })
})

describe('resolveUploadPath', () => {
  it('yükleme dizini içindeki yolu çözer', () => {
    expect(resolveUploadPath('2026/08/a.webp')).toBe(path.resolve(dizin, '2026/08/a.webp'))
  })

  // Dosya adı kullanıcıdan geliyor; ".." ile dizin dışına yazma/okuma girişimi reddedilmeli.
  it.each(['../../etc/passwd', '2026/../../../gizli.txt', '/mutlak/yol.webp'])(
    '%s yolunu reddeder',
    (kotu) => {
      expect(() => resolveUploadPath(kotu)).toThrow(/yükleme dizini/i)
    },
  )
})

describe('buildStoredName', () => {
  it('kullanıcının dosya adını kullanmaz, içerikten türetir', () => {
    const { relative, extension } = buildStoredName('Tehlikeli ../ İsim.PNG', Buffer.from('abc'))
    expect(extension).toBe('.webp')
    expect(relative).toMatch(/^\d{4}\/\d{2}\/[a-f0-9]{16}\.webp$/)
    expect(relative).not.toContain('..')
  })
})

describe('storeImage', () => {
  it('büyük görseli 1600 piksele indirir ve WebP yazar', async () => {
    const kaynak = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#123456' } })
      .jpeg()
      .toBuffer()
    const dosya = new File([kaynak], 'buyuk.jpg', { type: 'image/jpeg' })
    const sonuc = await storeImage(dosya, dizin)
    expect(sonuc.width).toBe(1600)
    expect(sonuc.height).toBe(1067)
    const yazilan = await readFile(resolveUploadPath(sonuc.relative))
    expect((await sharp(yazilan).metadata()).format).toBe('webp')
  })

  it('görsel olmayan dosyayı reddeder', async () => {
    const dosya = new File([Buffer.from('bu bir metin')], 'not.txt', { type: 'image/png' })
    // İstemcinin bildirdiği MIME tipine değil, dosyanın gerçek içeriğine bakılır.
    await expect(storeImage(dosya, dizin)).rejects.toThrow(/geçerli bir görsel/i)
  })
})
```

**Hangi mutasyonda kırılır:** yol denetimi `startsWith` yerine `includes` yapılırsa veya
kaldırılırsa dizin dışı testleri geçer ve kırılır; dosya adı kullanıcı girdisinden üretilirse
`buildStoredName` testi kırılır; `withoutEnlargement`/`resize` düşerse boyut testi kırılır;
MIME kontrolü `file.type`'a bakarsa son test kırılır.

`tests/e2e/panel-medya.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { girisYap, EDITOR } from './helpers/auth'

const KIRMIZI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('alt metin olmadan yükleme reddedilir', async ({ page }) => {
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page.getByLabel('Görsel dosyası').setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: KIRMIZI_PNG })
  await page.getByRole('button', { name: 'Yükle' }).click()
  await expect(page.getByText('Alt metin zorunlu — görselin ne gösterdiğini yazın.')).toBeVisible()
})

test('alt metinle yüklenen görsel listede ve servis adresinde erişilebilir', async ({ page }) => {
  const alt = `Kırmızı nokta ${Date.now()}`
  await girisYap(page, EDITOR)
  await page.goto('/panel/medya')
  await page.getByLabel('Görsel dosyası').setInputFiles({ name: 'nokta.png', mimeType: 'image/png', buffer: KIRMIZI_PNG })
  await page.getByLabel('Alt metin').fill(alt)
  await page.getByRole('button', { name: 'Yükle' }).click()

  const gorsel = page.getByRole('img', { name: alt })
  await expect(gorsel).toBeVisible()
  const src = await gorsel.getAttribute('src')
  expect(src).toBeTruthy()

  // Servis rotası gerçekten dosya döndürmeli; kırık görsel testten kaçmasın.
  const yanit = await page.request.get(src!)
  expect(yanit.status()).toBe(200)
  expect(yanit.headers()['content-type']).toContain('image/')

  await page.getByRole('button', { name: `${alt} görselini sil` }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('img', { name: alt })).toHaveCount(0)
})

test('dizin dışına çıkmaya çalışan servis isteği dosya sızdırmaz', async ({ page }) => {
  const yanit = await page.request.get('/medya/..%2f..%2fpackage.json')
  expect([400, 404]).toContain(yanit.status())
  expect(await yanit.text()).not.toContain('"name": "tolga-akil-hukuk"')
})
```

- [ ] **Adım 3: Testleri çalıştır, başarısız olduğunu gör**

Çalıştır: `npm test && npm run test:e2e -- --project=masaustu panel-medya`
Beklenen: BAŞARISIZ.

- [ ] **Adım 4: Depolama katmanını yaz**

```ts
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const MAX_WIDTH = 1600
const MAX_BYTES = 8 * 1024 * 1024

export function uploadDir(): string {
  const dir = process.env.UPLOAD_DIR
  if (!dir) throw new Error('UPLOAD_DIR tanımlı değil.')
  // Göreli yol (yerelde ./.uploads) çalışma dizinine göre çözülür; üretimde bu değer
  // dağıtım kökünün DIŞINDA mutlak bir yol olmalıdır.
  return path.resolve(dir)
}

// Yol kullanıcı verisinden türüyor; kök dizinin dışına çıkan her istek reddedilir.
export function resolveUploadPath(relative: string): string {
  const root = uploadDir()
  const hedef = path.resolve(root, relative)
  if (hedef !== root && !hedef.startsWith(root + path.sep)) {
    throw new Error('Yol yükleme dizini dışına çıkıyor.')
  }
  return hedef
}

export function buildStoredName(_originalName: string, bytes: Buffer) {
  // Kullanıcının dosya adı hiç kullanılmıyor: hem yol enjeksiyonunu hem Türkçe karakter
  // sorunlarını kökten keser. İçerik özeti aynı zamanda değişmez önbelleklemeyi güvenli kılar.
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const now = new Date()
  const yil = String(now.getUTCFullYear())
  const ay = String(now.getUTCMonth() + 1).padStart(2, '0')
  return { relative: `${yil}/${ay}/${hash}.webp`, extension: '.webp' }
}
```

`storeImage`: `MAX_BYTES` aşılırsa Türkçe `Error`; `sharp(buffer).metadata()` hata verirse
`new Error('Yüklenen dosya geçerli bir görsel değil.')` fırlatır (istemcinin bildirdiği MIME
tipine güvenilmez); `.rotate()` (EXIF yönü), `.resize({ width: MAX_WIDTH, withoutEnlargement: true })`,
`.webp({ quality: 82 })`; hedef dizini `mkdir(..., { recursive: true })` ile açar.

`src/app/medya/[...path]/route.ts` — `resolveUploadPath` ile yolu çözer (hata → 400), dosya
yoksa 404, varsa `Content-Type` uzantı beyaz listesinden (`.webp` → `image/webp`),
`Cache-Control: public, max-age=31536000, immutable` (dosya adı içerik özeti olduğu için
güvenli). **Bu rota herkese açıktır** — yüklenen görseller zaten sitede yayımlanacak; oturum
kontrolü konmaz, `proxy.ts` matcher'ı `/panel` ile sınırlı olduğu için de çalışmaz.

- [ ] **Adım 5: Panel arayüzünü yaz**

`uploadMedia(prev, formData)`: `requireAccess('media')` → `mediaSchema.safeParse({ altText })`
→ `storeImage` → `db.insert(media)` → `revalidatePath('/panel/medya')`.
`deleteMedia(prev, formData)`: `requireAccess('media')`, kayıt sil, dosyayı `unlink` et.
Dosya diskte yoksa hata **yutulmaz**; kullanıcıya "Kayıt silindi ancak dosya bulunamadı"
mesajı döner ve sunucuya loglanır.

`MediaUploadForm` — `<input type="file" accept="image/*">` etiketi "Görsel dosyası",
"Alt metin" alanı `required` **ve** sunucuda zorunlu (istemci `required`'ı güvenlik değil,
kolaylık). `MediaPicker` — makale formunda kapak görseli seçmek için; her seçenek görselin alt
metnini gösterir.

`/panel/medya` sayfası: yüklü görseller `next/image` ile ızgara hâlinde, her birinde alt metin
ve sil düğmesi (`aria-label={`${altText} görselini sil`}`).

- [ ] **Adım 6: Testlerin geçtiğini doğrula**

Çalıştır: `npm test && npm run test:e2e`
Beklenen: birim 45 + 7 = 52; e2e'de yeni 3 medya testi dahil hepsi yeşil.

- [ ] **Adım 7: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Commit: `feat: medya yükleme, sharp ile yeniden boyutlandırma ve zorunlu alt metin`

---

### Görev 7: Admin yönetimi — kadro, alanlar, kategoriler, ayarlar, mesajlar ve panel kullanıcıları

**Dosyalar:**
- Oluştur: `src/app/panel/kadro/page.tsx`, `yeni/page.tsx`, `[id]/page.tsx`, `actions.ts`
- Oluştur: `src/app/panel/calisma-alanlari/` (aynı üçlü + `actions.ts`)
- Oluştur: `src/app/panel/kategoriler/page.tsx` + `actions.ts`
- Oluştur: `src/app/panel/ayarlar/page.tsx` + `actions.ts`
- Oluştur: `src/app/panel/mesajlar/page.tsx` + `actions.ts`
- Oluştur: `src/app/panel/kullanicilar/page.tsx`, `yeni/page.tsx`, `[id]/page.tsx`, `actions.ts`
- Oluştur: `src/lib/user-guard.ts`, `src/db/queries/lawyers.ts`, `practice-areas.ts`,
  `categories.ts`, `settings.ts`, `messages.ts`, `users.ts`
- Oluştur: `src/components/EntityForm.tsx` + `.module.css`
- Test: `src/lib/user-guard.test.ts`, `tests/e2e/panel-yetki.spec.ts`,
  `tests/e2e/panel-kadro.spec.ts`, `tests/e2e/panel-kullanicilar.spec.ts`

**Kapsam kararı (TBY):** panel kullanıcı yönetimi **asgari düzeyde** bu plana girer —
kullanıcı listesi, yeni kullanıcı (e-posta + parola + rol), rol değiştirme, pasifleştirme.
**Yok:** e-posta davet akışı, parola sıfırlama e-postası, iki adımlı doğrulama.
**Bağlayıcı kural:** son etkin `admin` pasifleştirilemez veya rolü düşürülemez.

**Arayüzler:**
- `src/lib/user-guard.ts` →
  `export type LastAdminCheck = { activeAdminIds: readonly number[]; targetId: number; nextRole: UserRole; nextIsActive: boolean }`;
  `export function wouldRemoveLastAdmin(check: LastAdminCheck): boolean`
- `src/db/queries/users.ts` → `listUsers()`, `getUserById(id)`, `listActiveAdminIds(): Promise<number[]>`,
  `isEmailTaken(email, exceptId?)`
- `src/db/queries/settings.ts` → `export async function getSettings(): Promise<Settings>`
  (satır yoksa `Error` fırlatır — sessiz varsayılan üretmez),
  `export async function updateSettings(values: Partial<NewSettings>): Promise<void>`
- `src/db/queries/messages.ts` → `listMessages()`, `markMessageRead(id)`, `deleteMessage(id)`
- Kadro/alan/kategori sorguları makale kalıbıyla aynı (`list*`, `get*ById`, `isSlugTaken`)

- [ ] **Adım 1: Başarısız testleri yaz**

`src/lib/user-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { wouldRemoveLastAdmin } from '@/lib/user-guard'

describe('wouldRemoveLastAdmin', () => {
  it('tek admin rolünü editor yaparsa engeller', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 7, nextRole: 'editor', nextIsActive: true }),
    ).toBe(true)
  })

  it('tek admin kendini pasifleştirirse engeller', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 7, nextRole: 'admin', nextIsActive: false }),
    ).toBe(true)
  })

  it('iki admin varsa biri düşürülebilir', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7, 9], targetId: 7, nextRole: 'editor', nextIsActive: true }),
    ).toBe(false)
  })

  it('admin olmayan kullanıcı serbestçe pasifleştirilir', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 12, nextRole: 'editor', nextIsActive: false }),
    ).toBe(false)
  })

  it('admin admin kalıyorsa engellemez', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 7, nextRole: 'admin', nextIsActive: true }),
    ).toBe(false)
  })
})
```

**Hangi mutasyonda kırılır:** `activeAdminIds.length <= 1` yerine `< 1` yazılırsa ilk iki test;
"hâlâ admin mi" kontrolü kalkarsa son test; `includes` kontrolü kalkarsa dördüncü test;
`nextIsActive` göz ardı edilirse ikinci test kırılır.

`tests/e2e/panel-yetki.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { girisYap, ADMIN, EDITOR } from './helpers/auth'

const ADMIN_YOLLARI = [
  '/panel/kadro', '/panel/calisma-alanlari', '/panel/kategoriler',
  '/panel/ayarlar', '/panel/mesajlar', '/panel/kullanicilar',
]

for (const yol of ADMIN_YOLLARI) {
  test(`editor ${yol} adresine erişemez`, async ({ page }) => {
    await girisYap(page, EDITOR)
    const yanit = await page.goto(yol)
    expect(yanit?.status()).toBe(404)
  })

  test(`admin ${yol} adresini görür`, async ({ page }) => {
    await girisYap(page, ADMIN)
    const yanit = await page.goto(yol)
    expect(yanit?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

// Yalnız gezinmeyi gizlemek koruma değil: doğrudan POST edilen server action da reddedilmeli.
test('editor doğrudan gönderdiği kadro formuyla da kayıt oluşturamaz', async ({ page }) => {
  await girisYap(page, EDITOR)
  const yanit = await page.request.post('/panel/kadro/yeni', {
    form: { fullName: 'Sızma Denemesi', title: 'Avukat', slug: '' },
  })
  expect(yanit.status()).toBeGreaterThanOrEqual(400)

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro')
  await expect(page.getByText('Sızma Denemesi')).toHaveCount(0)
})
```

`tests/e2e/panel-kullanicilar.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { girisYap, ADMIN } from './helpers/auth'

test('admin kullanıcı ekler, rolünü değiştirir ve pasifleştirir', async ({ page }) => {
  const eposta = `deneme-${Date.now()}@ornek.test`
  await girisYap(page, ADMIN)
  await page.goto('/panel/kullanicilar')
  await page.getByRole('link', { name: 'Yeni kullanıcı' }).click()

  await page.getByLabel('E-posta').fill(eposta)
  await page.getByLabel('Ad soyad').fill('Deneme Kullanıcı')
  await page.getByLabel('Parola').fill('cok-uzun-bir-parola')
  await page.getByLabel('Rol').selectOption('editor')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

  await page.goto('/panel/kullanicilar')
  await page.getByRole('row', { name: new RegExp(eposta) }).getByRole('link', { name: 'Düzenle' }).click()
  await page.getByLabel('Rol').selectOption('admin')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

  await page.getByLabel('Etkin').uncheck()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Kullanıcı kaydedildi.')

  await page.goto('/panel/kullanicilar')
  await expect(page.getByRole('row', { name: new RegExp(eposta) }).getByText('Pasif')).toBeVisible()
})

test('son admin kendi rolünü düşüremez', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/kullanicilar')
  await page.getByRole('row', { name: new RegExp(ADMIN.email) }).getByRole('link', { name: 'Düzenle' }).click()
  await page.getByLabel('Rol').selectOption('editor')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Son etkin yönetici rolü düşürülemez veya pasifleştirilemez.',
  )

  // Kural gerçekten uygulanmış olmalı: yeniden giriş yapılabilmeli.
  await page.getByRole('button', { name: 'Çıkış yap' }).click()
  await girisYap(page, ADMIN)
  await expect(page).toHaveURL(/\/panel$/)
})

test('pasifleştirilen kullanıcı doğru parolayla da giriş yapamaz', async ({ page }) => {
  const eposta = `pasif-${Date.now()}@ornek.test`
  const parola = 'cok-uzun-bir-parola'
  await girisYap(page, ADMIN)
  await page.goto('/panel/kullanicilar/yeni')
  await page.getByLabel('E-posta').fill(eposta)
  await page.getByLabel('Ad soyad').fill('Pasif Kullanıcı')
  await page.getByLabel('Parola').fill(parola)
  await page.getByLabel('Rol').selectOption('editor')
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await page.goto('/panel/kullanicilar')
  await page.getByRole('row', { name: new RegExp(eposta) }).getByRole('link', { name: 'Düzenle' }).click()
  await page.getByLabel('Etkin').uncheck()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await page.getByRole('button', { name: 'Çıkış yap' }).click()
  await page.goto('/panel/giris')
  await page.getByLabel('E-posta').fill(eposta)
  await page.getByLabel('Parola').fill(parola)
  await page.getByRole('button', { name: 'Giriş yap' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-posta veya parola hatalı.')
})
```

**Hangi mutasyonda kırılır:** `authorize` içindeki `!user.isActive` kontrolü kalkarsa üçüncü
test kırılır (pasif kullanıcı girer); `wouldRemoveLastAdmin` action'da çağrılmazsa ikinci test
kırılır ve panel gerçekten kilitlenir — testin ikinci yarısı bunu kanıtlar.

`tests/e2e/panel-kadro.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { girisYap, ADMIN } from './helpers/auth'

test('admin avukat ekler, yayına alır ve siler', async ({ page }) => {
  const ad = `Deneme Avukat ${Date.now()}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro')
  await page.getByRole('link', { name: 'Yeni avukat' }).click()

  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.getByLabel('Baro').fill('İstanbul Barosu')
  await page.getByLabel('Baro sicil no').fill('12345')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()

  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')
  await page.goto('/panel/kadro')
  const satir = page.getByRole('row', { name: new RegExp(ad) })
  await expect(satir.getByText('Yayında')).toBeVisible()

  await satir.getByRole('button', { name: 'Sil' }).click()
  await page.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(page.getByRole('row', { name: new RegExp(ad) })).toHaveCount(0)
})

test('ayarlar formu kaydedip geri okuduğunda değeri korur', async ({ page }) => {
  const telefon = `+90 216 000 ${String(Date.now()).slice(-4)}`
  await girisYap(page, ADMIN)
  await page.goto('/panel/ayarlar')
  await page.getByLabel('Telefon').fill(telefon)
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Ayarlar kaydedildi.')

  await page.reload()
  await expect(page.getByLabel('Telefon')).toHaveValue(telefon)
})

test('geçersiz e-posta ayarları kaydettirmez', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/ayarlar')
  await page.getByLabel('E-posta').fill('bu-bir-eposta-degil')
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('Geçerli bir e-posta adresi girin.')).toBeVisible()
})
```

- [ ] **Adım 2: Testleri çalıştır, başarısız olduğunu gör**

Çalıştır: `npm test && npm run test:e2e -- --project=masaustu panel-yetki panel-kadro panel-kullanicilar`
Beklenen: BAŞARISIZ — `@/lib/user-guard` yok, rotalar 404.

- [ ] **Adım 3: `src/lib/user-guard.ts`**

```ts
import type { UserRole } from '@/db/schema'

export type LastAdminCheck = {
  activeAdminIds: readonly number[]
  targetId: number
  nextRole: UserRole
  nextIsActive: boolean
}

// Son etkin admin'in rolü düşürülür veya pasifleştirilirse panele kimse giremez ve düzeltmenin
// tek yolu veritabanına elle müdahale olur. Karar saf tutuluyor ki testle sabitlenebilsin.
export function wouldRemoveLastAdmin(check: LastAdminCheck): boolean {
  const halaAdmin = check.nextRole === 'admin' && check.nextIsActive
  if (halaAdmin) return false
  if (!check.activeAdminIds.includes(check.targetId)) return false
  return check.activeAdminIds.length <= 1
}
```

- [ ] **Adım 4: Sorgu modüllerini yaz**

Makale sorgularıyla aynı kalıp. `getSettings()`:

```ts
export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID))
  if (!row) {
    // Sessizce boş ayar döndürmek, sitede boş telefon/adres yayımlamak demek olurdu.
    throw new Error('Ayar satırı bulunamadı; `npm run db:seed` çalıştırılmalı.')
  }
  return row
}
```

`listActiveAdminIds()`:

```ts
export async function listActiveAdminIds(): Promise<number[]> {
  const satirlar = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
  return satirlar.map((s) => s.id)
}
```

- [ ] **Adım 5: Sayfaları ve action'ları yaz**

Her modül aynı üç parçadan oluşur ve **her sayfa ile her action `requireAccess(...)` çağırır**:

| Rota | Kaynak | Liste sütunları | Özel alanlar / kurallar |
|---|---|---|---|
| `/panel/kadro` | `lawyers` | ad, unvan, sıra, durum | mevzuatın saydığı alanlar (baro, sicil no, TBB sicil no, mesleğe başlama tarihi, üniversite, diller), fotoğraf seçici, `bio` için `RichTextEditor` |
| `/panel/calisma-alanlari` | `practiceAreas` | ad, sıra, durum | `summary` düz metin, `content` için `RichTextEditor` |
| `/panel/kategoriler` | `categories` | ad, slug, makale sayısı | tek satırlık form; kullanımdaki kategori silinmeye çalışılırsa veritabanı reddeder ve mesaj "Bu kategoriye bağlı makaleler var; önce onları taşıyın." olur |
| `/panel/ayarlar` | `settings` | — | tek form, `SETTINGS_ID` satırını günceller |
| `/panel/mesajlar` | `messages` | tarih, ad, konu, durum | salt okunur liste + "Okundu işaretle" ve "Sil"; **yanıt gönderme yok** (Plan 3, `nodemailer`) |
| `/panel/kullanicilar` | `users` | ad, e-posta, rol, durum | ekleme/rol değiştirme/pasifleştirme; parola `argon2` ile özetlenir; **son etkin admin korunur** |

`saveUser` action sırası:

1. `await requireAccess('users')`.
2. Yeni kayıtta `userCreateSchema`, düzenlemede `userUpdateSchema` ile doğrula.
3. Yeni kayıtta `isEmailTaken(email)` → doluysa
   `{ email: ['Bu e-posta zaten kayıtlı.'] }`.
4. Düzenlemede
   `wouldRemoveLastAdmin({ activeAdminIds: await listActiveAdminIds(), targetId, nextRole, nextIsActive })`
   → `true` ise
   `{ ok: false, errors: {}, message: 'Son etkin yönetici rolü düşürülemez veya pasifleştirilemez.' }`.
5. Parola alanı doluysa `argon2.hash(password, { type: argon2.argon2id })` ile güncelle; boşsa
   mevcut özet korunur.
6. `revalidatePath('/panel/kullanicilar')`, `{ ok: true, errors: {}, message: 'Kullanıcı kaydedildi.' }`.

> Kullanıcı **silinmez, pasifleştirilir**: yüklediği medyanın `uploaded_by` bağı ve
> `last_login_at` izi kaybolmasın. Silme düğmesi bilinçli olarak yok.

`bio` ve `content` alanları `sanitizeArticleHtml` ile temizlenir — makale ile aynı beyaz liste.
Kadro ve alan kayıtları yayına girdiğinde **onaylı reklam uyarısı kadro formunda da** çalışır
(`findBannedPhrases` + `PublishChecklist`): avukat özgeçmişi reklam yasağının en hassas alanı.

Her başarılı kayıt sonrası ilgili etiket tazelenir:
`revalidateTag(TAGS.lawyers, 'max')` / `TAGS.practiceAreas` / `TAGS.categories` / `TAGS.settings`.

- [ ] **Adım 6: Testlerin geçtiğini doğrula**

Çalıştır: `npm test && npm run test:e2e`
Beklenen: birim 52 + 5 = 57; e2e'de yeni 16 test (12 yetki + 3 kadro/ayar + 3 kullanıcı,
eksi çakışanlar) dahil hepsi yeşil.

- [ ] **Adım 7: Görevi doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Commit: `feat: kadro, çalışma alanları, kategoriler, ayarlar, mesajlar ve panel kullanıcıları`

---

### Görev 8: Panel erişilebilirliği, mobil kullanım ve yayın öncesi kontrol listesi

**Dosyalar:**
- Oluştur: `src/components/AdBanNotice.tsx` + `.module.css`
- Değiştir: panel `.module.css` dosyaları (mobil kırılım, dokunma hedefi),
  `src/app/panel/layout.module.css`, `src/components/PanelNav.tsx`
- Değiştir: `src/app/panel/page.tsx`, `src/app/panel/makaleler/yeni/page.tsx`
- Test: `tests/e2e/panel-erisilebilirlik.spec.ts`

**Arayüzler:** yeni dışa aktarım yok; bu görev mevcut arayüzlerin kalitesini sabitler.

- [ ] **Adım 1: Başarısız testi yaz**

`tests/e2e/panel-erisilebilirlik.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'

const PANEL_YOLLARI = [
  '/panel', '/panel/makaleler', '/panel/makaleler/yeni', '/panel/medya',
  '/panel/kadro', '/panel/kadro/yeni', '/panel/calisma-alanlari',
  '/panel/kategoriler', '/panel/mesajlar', '/panel/kullanicilar',
  '/panel/kullanicilar/yeni', '/panel/ayarlar',
]

for (const yol of PANEL_YOLLARI) {
  test(`${yol} erişilebilirlik denetiminden geçer`, async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto(yol)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations).toEqual([])
  })

  test(`${yol} tek h1 taşır`, async ({ page }) => {
    await girisYap(page, ADMIN)
    await page.goto(yol)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })
}

test('panelde mobilde yatay kaydırma yok', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  await girisYap(page, ADMIN)
  for (const yol of ['/panel', '/panel/makaleler/yeni', '/panel/ayarlar', '/panel/kullanicilar']) {
    await page.goto(yol)
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(tasma, `${yol} yatay taşıyor`).toBe(false)
  }
})

test('panel formlarında atlama bağlantısı gerçekten içeriğe götürür', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel/ayarlar')
  await page.keyboard.press('Tab')
  const atla = page.getByRole('link', { name: 'İçeriğe atla' })
  await expect(atla).toBeFocused()
  await atla.press('Enter')
  await expect(page.locator('#panel-content')).toBeFocused()
})

test('gösterge panelinde reklam yasağı hatırlatması görünür', async ({ page }) => {
  await girisYap(page, ADMIN)
  await page.goto('/panel')
  const uyari = page.getByRole('region', { name: 'Yayın öncesi kontrol listesi' })
  await expect(uyari).toBeVisible()
  await expect(uyari).toContainText('başarı oranı')
  await expect(uyari).toContainText('müvekkil referansı')
  await expect(uyari).toContainText('ücret')
})
```

**Hangi mutasyonda kırılır:** panel sayfalarından birine ikinci `h1` girerse ilgili test;
odaklanabilir öğelerde etiket eksikliği doğarsa axe testi; panel tablosu sarmalayıcısız mobile
konursa taşma testi; atlama bağlantısı hedefsiz kalırsa dördüncü test; kontrol listesi
metninden yasak kalem çıkarılırsa son test kırılır.

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npm run test:e2e -- panel-erisilebilirlik`
Beklenen: en az kontrol listesi testi ve büyük olasılıkla birkaç axe/taşma testi BAŞARISIZ.

- [ ] **Adım 3: Kontrol listesi bileşenini yaz**

```tsx
import styles from './AdBanNotice.module.css'

// Spec §2.1 — TBB Reklam Yasağı Yönetmeliği (son değişiklik 9 Ağustos 2024). Bu liste
// hukuki görüş değildir ve yayını engellemez; tereddütte kalınan içerik için baroya
// danışılması gerekir. Tarama listesinin kendisi src/lib/ad-ban.ts içindedir.
const YASAK_KALEMLER = [
  '"uzman" veya "en iyi" iddiası',
  'başarı oranı veya kazanılmış dava sayısı',
  'müvekkil referansı, yorum veya yıldız derecelendirmesi',
  'ücret bilgisi veya "ücretsiz ilk görüşme" türü çağrılar',
  'canlı sohbetle hukuki tavsiye',
  'üçüncü taraf reklam betiği veya afiliye bağlantı',
  'şehir + hukuk dalı kalıbının yoğun tekrarı',
]

export function AdBanNotice() {
  return (
    <section aria-labelledby="ad-ban-title" className={`card ${styles.notice}`}>
      <h2 id="ad-ban-title">Yayın öncesi kontrol listesi</h2>
      <p>Yayımlayacağınız metinde aşağıdakiler bulunmamalıdır:</p>
      <ul>{YASAK_KALEMLER.map((kalem) => <li key={kalem}>{kalem}</li>)}</ul>
      <p className={styles.footnote}>
        Bu liste hatırlatma amaçlıdır ve hukuki denetim yerine geçmez; tereddüt hâlinde
        kayıtlı olduğunuz baroya danışın.
      </p>
    </section>
  )
}
```

Başlık metni testteki `getByRole('region', { name: ... })` ile birebir aynı olmalı.
`/panel` gösterge sayfasına ve `/panel/makaleler/yeni` sayfasının yan sütununa yerleştirilir.

- [ ] **Adım 4: Erişilebilirlik ve mobil düzeltmelerini yap**

Adım 2'de çıkan axe ihlallerini **teker teker** gider. Beklenen alanlar:
- Panel tabloları: `<caption>` veya `aria-label`, `<th scope="col">`.
- Durum rozetleri renkle değil metinle de ayrılır ("Yayında"/"Taslak", "Etkin"/"Pasif").
- Bütün form alanları `<label htmlFor>` ile bağlı; yer tutucu metin etiket yerine geçmez.
- Silme onayı `<dialog>` içinde; `showModal()` ile açılır, `Escape` kapatır, kapanınca odak
  tetikleyen düğmeye döner.
- Mobil: `PanelNav` 768px altında açılır panel olur (`SiteHeader` ile aynı desen,
  `aria-expanded`/`aria-controls`); tablolar `overflow-x: auto` sarmalayıcıda ve sarmalayıcı
  `tabindex="0"` + `role="region"` + `aria-label` taşır (kaydırılabilir alan klavyeyle de
  gezilebilsin).
- Dokunma hedefleri en az 44×44px.
- Panel yüzeyleri Görev 4'ün `--surface`/`--text`/`--line` sözleşmesini kullanır; hiçbir
  `.module.css` dosyasında ham renk değeri bulunmaz.

- [ ] **Adım 5: Testlerin geçtiğini doğrula**

Çalıştır: `npm run test:e2e`
Beklenen: 24 panel a11y testi + 3 diğer test dahil hepsi yeşil.

- [ ] **Adım 6: Planı doğrula**

Çalıştır: `npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
Ayrıca `npm ls --depth=0` çıktısında bu planla eklenen paketlerin hiçbirinde `^`/`~` olmadığını
son kez doğrula. Bu, Plan 2'nin bitiş koşuludur.
Commit: `feat: panel erişilebilirliği, mobil düzen ve yayın öncesi reklam yasağı kontrol listesi`

---

## Riskler ve geri alma maliyeti

| Risk | Etki | Azaltma |
|---|---|---|
| `next-auth@5.0.0-beta.32` beta; `authorized` callback'i `proxy.ts` altında beklenenden farklı davranabilir | Görev 3 tıkanır | Sürüm `--save-exact` ile sabit; Görev 3 Adım 8'deki e2e testleri davranışın kanıtı; kırmızı kalırsa **dur ve bildir** |
| Görev 4'ün rota grubu taşıması Plan 1'in 59 e2e testini kırabilir | Sitenin kabuğu bozulur | Taşımadan önce commit; Adım 8 tüm Plan 1 testlerini regresyon olarak koşar; `git revert` tek adım |
| Kök `not-found.tsx` rota grubunun layout'unu almadığı için 404'te kabuk kaybolabilir | Spec §11 ihlali | `SiteShell` bileşeni + `panel-kabuk.spec.ts` son testi bunu doğrudan ölçüyor |
| `allowImportingTsExtensions` Next derlemesiyle çakışabilir | `npm run build` hatası | Görev 1 Adım 12'de yedek yol yazılı (`tsconfig.scripts.json`) |
| Yerel MariaDB 12.2, hedef 10.11 | Üretimde migration patlar | 10.11'de olmayan sözdizimi yasak; üretilen SQL Görev 1 Adım 10'da elle okunuyor; Plan 3'ün çıkış adımı gerçek 10.11'de migration koşacak |
| `UPLOAD_DIR` üretimde dağıtım kökü içinde kalırsa her dağıtımda görseller silinir | Veri kaybı | Görev 6 başındaki bağlayıcı not + Plan 3'e devredilen doğrulama; `media-storage.ts` tek dosyada soyutlandığı için R2'ye geçiş sınırlı |
| `argon2` ve `sharp` yerel ikili taşır | Üretim derlemesi patlar | `serverExternalPackages` ayarlandı; Plan 3'te gerçek dağıtımda doğrulanacak |
| Bellekteki hız sınırı süreç yeniden başlayınca sıfırlanır | Kaba kuvvet penceresi genişler | Kabul edilen sınır; `rate-limit.ts` arayüzü ortak depoya taşınabilecek biçimde yazıldı |
| Son admin koruması yalnız `saveUser` içinde | Başka bir yol açılırsa kilitlenme | Karar saf fonksiyonda (`wouldRemoveLastAdmin`) ve testli; kullanıcıyı **silen** bir yol bilinçli olarak hiç açılmadı |
| E2E testleri `reuseExistingServer` nedeniyle geliştirme veritabanına yazabilir | Geliştirme verisi kirlenir | Her e2e testi zaman damgalı kendi verisini üretip siliyor; kalıcı tohum verisine dokunmuyor |
| `revalidateTag` çağrıları Plan 3'e kadar etkisiz | Yanlış güven | Plan metninde açıkça yazıldı; Plan 3 `cacheComponents` kararını verip okuma tarafını bağlayacak |
| `innodb_ft_min_token_size = 3` — iki harfli kelimeler FULLTEXT'e girmiyor | Aramada boşluk | Plan 3'ün arama görevinin bilmesi gereken ölçüm; bu planda etkisi yok |

## Dokunulmayacaklar

- `src/app/globals.css` içindeki **mevcut** renk ve geometri token değerleri (yalnız yeni
  takma ad token'ları ve `.card`/`.prose` eklenir).
- Genel sayfaların içeriği ve `src/content/sample-content.ts` — veriye bağlama Plan 3'ün işi.
- `src/lib/slug.ts` — `slugify` davranışı değişmez; boş dönüş koruması **çağıran** katmanda.
- `tests/e2e/design-system.spec.ts`, `home.spec.ts`, `pages.spec.ts` — regresyon koruması
  olarak olduğu gibi kalır (`shell.spec.ts`'e yalnız `aria-current` testi eklenir).
- `next.config.ts` güvenlik başlıkları.
- `src/app/global-error.tsx`.
- `src/content/site.ts` — `SiteFooter` bu planda hâlâ sabit `SITE` sabitini okur; `settings`'e
  bağlanması Plan 3'te `(site)/layout.tsx` üzerinden yapılacak (kök layout'ta veri çekme yasağı).
- Plan 1'in `package.json` bağımlılık satırları — yalnız bu planla eklenenler sabit yazılır.

## Plan 2 sonunda elde edilen

Yerelde `npm run dev` ile açılan, `/panel/giris` üzerinden korunan bir yönetim paneli:
makale yazma/düzenleme/yayımlama, medya yükleme, kadro-alan-kategori-ayar yönetimi, gelen
mesajların okunması, panel kullanıcılarının yönetimi (son admin korumasıyla), rol ayrımı,
sunucu tarafı HTML temizleme ve onaylı reklam yasağı uyarısı. Genel sayfalar hâlâ sabit içerik
gösterir — veriye bağlama Plan 3'te.

## Plan 3'e devredilen doğrulama

Bu planın kodu üretimde doğrulanmadan tamamlanmış sayılmaz. Plan 3'ün **ilk** görevi şunları
gerçek Hostinger Business ortamında sınamak zorundadır:

1. **`UPLOAD_DIR` kalıcılığı (spec §13, ilk açık madde).** Panelden bir görsel yükle, yeniden
   dağıt, görselin hâlâ servis edildiğini doğrula. Yol dağıtım kökünün dışında olmalı. Sonuç
   olumsuzsa Cloudflare R2'ye geçilir; değişim `src/lib/media-storage.ts` ile sınırlıdır.
2. **MariaDB 10.11'de migration.** `drizzle/0000_*.sql` ve `0001_fulltext_articles.sql`
   gerçek 10.11 sunucusunda koşturulur; `uca1400` harmanlaması hatası çıkmamalı.
3. **`argon2` ve `sharp` yerel ikililerinin Hostinger derlemesinde çözülmesi.**
4. **`cacheComponents` kararı** ve okuma tarafının `'use cache'` + `cacheTag` ile bağlanması;
   Plan 2'nin ürettiği `revalidateTag` çağrıları ancak o zaman etkili olur.
