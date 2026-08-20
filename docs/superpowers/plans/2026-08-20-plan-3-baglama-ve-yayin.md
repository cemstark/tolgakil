# Plan 3 — Bağlama ve Yayın Uygulama Planı

> **Ajan uygulayıcılar için:** ZORUNLU ALT BECERİ: bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` kullanın. Adımlar takip için onay kutusu
> (`- [ ]`) sözdizimindedir.

**Hedef:** Halka açık sayfaları veritabanına bağlamak; makale arşivini arama, kategori
filtresi ve sayfalamayla çalışır hâle getirmek; iletişim formunu, harita rızasını ve SEO
beslemelerini kurmak. Plan sonunda site, panelden girilen içerikle tam olarak çalışır.

**Mimari:** Next.js 16.3 App Router. Halka açık sayfalar sunucu bileşenidir ve
`src/db/queries/public/` altındaki ayrı bir sorgu katmanından okur — panel sorguları
taslakları da döndürdüğü için halka açık taraf onları çağırmaz. Önbellekleme
`cacheComponents` + `'use cache'` + `cacheTag` üzerinden yürür; panelden içerik değişince
Plan 2'de yazılmış `revalidateTag(tag, 'max')` çağrıları ilgili etiketi tazeler.

**Teknoloji:** Next.js 16.3.0, React 19.2.4, TypeScript 5, Drizzle ORM 0.45.2 + mysql2,
MariaDB (yerel 12.2.2 / hedef 10.11), zod 4.4.3, sanitize-html 2.17.7, sharp 0.35.3,
nodemailer (**bu planda eklenen tek yeni bağımlılık** — spec §6'da kararlaştırılmıştı),
Vitest + Playwright + @axe-core/playwright.

---

## Küresel Kısıtlar

Her görevin gereksinimleri bu bölümü **örtük olarak** içerir.

### Ortam
- Node **22.23.2**, fnm ile yönetiliyor. Sistem Node'u 25.x — yanlış sürümle koşarsan
  derleme sessizce farklı davranır. Her Bash çağrısının başına:
  `export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";`
- Komutlar: `npm run dev`, `npm run build`, `npm test` (Vitest), `npm run test:e2e`
  (Playwright), `npx tsc --noEmit`, `npm run lint`, `npm run db:migrate`, `npm run db:seed`.
- Depo `main` dalında ve GitHub'a bağlı (`origin`). Her görev kendi commit'ini atar.

### Veritabanı
- `DATABASE_URL` içinde **`?charset=` kullanılmaz** — mysql2 bu parametreyi tanımaz.
- Yeni tabloda `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` **elle** yazılır;
  hedef MariaDB 10.11'de `uca1400` harmanlamaları yoktur.
- drizzle-kit MySQL FULLTEXT indeksi **üretemez** — elle SQL yazılır
  (örnek: `drizzle/0001_fulltext_articles.sql`).
- Havuzdaki her bağlantı `SET time_zone = '+00:00'` alır; zaman damgaları UTC'dir.
- Testler `TZ=America/New_York` ile koşar. Yerel saat varsayan test yazma —
  bu asimetri kasıtlıdır ve tarih hatalarını yakalamak içindir.
- Test veritabanının adı `_test` ile bitmek zorundadır; `vitest.setup.ts` aksi hâlde durur.

### Kod
- **Tailwind yok.** `globals.css` token'ları + `*.module.css`. Bileşen renk değeri yazmaz.
- Krem yüzey `[data-surface="paper"]` ile açılır; odak halkası `--focus-ring` üzerinden
  yüzeye göre değişir.
- **Hata yutulmaz.** Sessiz `catch { return null }` yasaktır. Veritabanı hatası
  `error.tsx` sınırına düşsün.
- **Kök `src/app/layout.tsx` içinde veri çekilmez** (spec §11, ölçülmüş kısıt): kök layout
  hatası Next'in Türkçe olmayan, telefonsuz, stilsiz kabuğunu döndürür. `getSettings()`
  yalnız `(site)/layout.tsx` veya sayfaların içinde çağrılır.
- `cacheComponents` açıkken segment export'ları `dynamic`, `dynamicParams`, `revalidate`,
  `fetchCache` **kaldırılmıştır** (Next v16.0.0). `export const revalidate = ...` yazma;
  süre `cacheLife()` ile verilir.
- `generateMetadata`, `generateStaticParams` ve sayfa bileşenlerinde `params` ve
  `searchParams` **Promise'tir** — `await` edilir.
- Panel altındaki her dışa aktarılmış sunucu aksiyonu `requireAccess` çağırmak zorundadır;
  `src/lib/panel-action-guards.test.ts` bunu kaynak taramasıyla denetler.
- Yorum "ne yaptığını" değil **"neden öyle yaptığını"** anlatır. Sihirli sayı yoktur.

### Güvenlik
- Kullanıcıdan gelen her veri güvenilmezdir: `zod` ile doğrula, HTML'i
  `sanitizeArticleHtml` ile temizle. **Panelden gelen veri de güvenilmezdir.**
- FULLTEXT araması `MATCH ... AGAINST (? IN BOOLEAN MODE)` ile **parametreli** yazılır;
  kullanıcı girdisi dizeye gömülmez ve boolean mode özel karakterleri (`+ - > < ( ) ~ * " @`)
  temizlenir.
- Arama terimi ekranda `dangerouslySetInnerHTML` ile vurgulanmaz.
- JSON-LD gömerken `</script>` kaçırma tuzağına dikkat (`src/lib/sanitize.ts` içinde not var).
- IP başlıkları sahte olabilir; hız sınırı yalnız IP'ye dayandırılmaz.

### Mevzuat ve içerik (spec §2.1 — pazarlık dışı)
- TBB Reklam Yasağı Yönetmeliği geçerlidir. Hiçbir yerde "en iyi", "uzman", "garanti",
  "kazanılan dava sayısı" türü ifade üretilmez.
- SEO'da `aggregateRating` ve `review` şeması **kullanılmaz** (yıldız işaretlemesi reklamdır).
- Sayfa başlıkları büro adı + sayfa konusuyla sınırlıdır.
- **Bu plan hukuki metin üretmez.** KVKK aydınlatma metni ve çerez politikası müvekkilden
  gelir; seed yalnız yer tutucu yazar.

### Erişilebilirlik (spec §8 — pazarlık dışı)
- Semantik HTML, sayfa başına tek `h1`, doğru başlık hiyerarşisi.
- Tüm renk çiftlerinde en az 4.5:1 kontrast. Yeni renk değeri yazılmaz, token kullanılır.
- Her görselde `alt` (dekoratifse `alt=""`). Alt metin veritabanından gelir.
- Klavye erişimi ve görünür odak zorunlu — harita rıza düğmesi ve WhatsApp dâhil.
- Aktif sayfalama bağlantısı `aria-current="page"` taşır.
- `prefers-reduced-motion` desteklenir.
- Arama ve filtre **JavaScript olmadan** çalışır (`<form method="get">` ve bağlantılar).

### Test (spec §12)
- Her yeni sorgu için "yayımlanmamış kayıt DÖNMEZ" olumsuz testi zorunludur.
- **Mutasyon kanıtı zorunludur:** yeni test yeşilken üretim kodunda bir koşul bozulur,
  testin kırmızıya döndüğü görülür, sonra geri alınır. Rapora yazılır.
  Kanıtsız test kabul edilmez — hiçbir şey iddia etmeyen test Plan 2'de yakalandı.
- e2e testleri veritabanına yazıyorsa kendi damgasını temizler (`e2e/db-cleanup.ts` düzeni);
  Plan 2'de sızan satırlar veritabanında birikmişti.
- Görev bitmiş sayılmaz: `npx tsc --noEmit`, `npm run lint`, `npm test` ve
  `npm run test:e2e` (hem dev hem `CI=1` kipinde) yeşil olmadan.

### Ölçüm kültürü
- Emin olmadığın API davranışını **ölç, varsayma.** Plan boyunca "ÖLÇÜLECEK" etiketli
  adımlar vardır; sonuçları uygulayıcı yazılı olarak rapor eder.
- Bir ölçüm planın varsaydığını çürütürse: **kod planı zorlamaz, plan durur** ve
  Aborjina'ya bildirilir.

---

### Görev 1: Önbellek mimarisini aç ve ÖLÇ

**Bu bir ölçüm görevidir.** Kod değişikliği küçük; asıl çıktı, sonraki bütün görevlerin
üzerine kurulacağı **ölçülmüş gerçekler**. Ölçüm olumsuzsa görev DURUR (bkz. Adım 10).

**Dosyalar:**
- Değiştir: `next.config.ts`
- Değiştir: `src/lib/cache-tags.ts`
- Test: `src/lib/cache-tags.test.ts` (yeni)
- Geçici sonda (**commit EDİLMEZ**, Adım 9'da silinir): `src/app/(site)/olcum-sonda/page.tsx`
- Ölçüm günlükleri (depo dışında): `/tmp/plan3/`

**Arayüzler:**
- Tüketir: yok (Plan 3'ün ilk görevi).
- Üretir:
  - `next.config.ts` içinde kök seviyede `cacheComponents: true` (sözleşme §4.1).
  - `TAGS.pages: 'pages'` ve `pageTag(slug: string): string` — Görev 2 bunları çağırır.
  - Bu görevin sonunda plana yazılan **ÖLÇÜM SONUCU** tablosu; Görev 3 ve sonrası
    `'use cache'` kararını o tablodan okur, hafızadan değil.

---

- [ ] **Adım 1: Kırmızı testi yaz**

`src/lib/cache-tags.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { TAGS, articleTag, pageTag } from '@/lib/cache-tags'

describe('önbellek etiketleri', () => {
  // Yazma tarafı revalidateTag'i, okuma tarafı cacheTag'i aynı dizeden alıyor. İki etiket
  // aynı değere düşerse bir bölümü tazelemek diğerini de sessizce düşürür; ters durumda
  // (elle yazılan bir dize) eşleşme hiç kurulmaz ve sayfa bayat kalır.
  it('sabit etiketlerin hepsi birbirinden farklı', () => {
    const degerler = Object.values(TAGS)
    expect(new Set(degerler).size).toBe(degerler.length)
  })

  it('sayfa metinleri için bir sabit etiket var', () => {
    expect(TAGS.pages).toBe('pages')
  })

  // Tekil sayfa, liste etiketinden bağımsız geçersizleştirilebilmeli: KVKK metnini
  // güncellemek /hakkimizda sayfasını da düşürmemeli.
  it('pageTag her slug için ayrı ve ön ekli etiket üretir', () => {
    expect(pageTag('kvkk')).toBe('page:kvkk')
    expect(pageTag('kvkk')).not.toBe(pageTag('hakkimizda'))
  })

  // İki ön ek çakışırsa 'article:kvkk' ile 'page:kvkk' aynı şeye düşerdi.
  it('makale ve sayfa etiketleri çakışmaz', () => {
    expect(pageTag('kvkk')).not.toBe(articleTag('kvkk'))
  })
})
```

- [ ] **Adım 2: Testin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/cache-tags.test.ts
```
Beklenen: FAIL — `pageTag` dışa aktarılmadığı için `TypeError: pageTag is not a function`
(veya `tsc` altında "has no exported member 'pageTag'").

- [ ] **Adım 3: En küçük uygulamayı yaz**

`src/lib/cache-tags.ts` — dosyanın tamamı:

```ts
// Önbellek etiketleri tek yerde toplanır: yazma tarafı revalidateTag'i, okuma tarafı
// cacheTag'i aynı dizeden alsın; elle yazılan bir etiket sessizce eşleşmeyi kaçırmasın.
export const TAGS = {
  articles: 'articles',
  lawyers: 'lawyers',
  practiceAreas: 'practice-areas',
  categories: 'categories',
  settings: 'settings',
  // Sabit satırlı `pages` tablosu (Görev 2): hakkımızda, KVKK ve çerez politikası metinleri.
  pages: 'pages',
} as const

// Tek bir makalenin ayrıntı sayfası, liste etiketinden bağımsız geçersizleştirilebilsin.
export function articleTag(slug: string): string {
  return `article:${slug}`
}

// Ön ek `page:` — `article:` ile çakışmaması şart: iki tür de slug taşıyor ve bir hukuk
// bürosunda "kvkk" hem bir makale hem bir sayfa adresi olabilir.
export function pageTag(slug: string): string {
  return `page:${slug}`
}
```

- [ ] **Adım 4: Testin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/cache-tags.test.ts
```
Beklenen: PASS — 4 test.

- [ ] **Adım 5: TABAN ÇİZGİSİNİ ölç (bayrak HENÜZ kapalıyken)**

Kıyas olmadan "kırıldı mı" sorusu cevaplanamaz. Bayrağa dokunmadan önce:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
mkdir -p /tmp/plan3
npm run build 2>&1 | tee /tmp/plan3/build-taban.txt
npm test 2>&1 | tail -20 | tee /tmp/plan3/vitest-taban.txt
npm run test:e2e 2>&1 | tail -30 | tee /tmp/plan3/e2e-taban.txt
```

`/tmp/plan3/build-taban.txt` içindeki **Route (app)** tablosunu ve altındaki **gösterge
(legend) satırlarını** olduğu gibi sakla. Sembollerin anlamını hafızandan yazma — Next'in
kendi bastığı açıklama satırı ne diyorsa o geçerlidir.

Taban sayıları not et: kaç birim testi, kaç e2e testi yeşil. Görev tanımındaki "271 e2e /
178 birim" sayıları **iddiadır**; ölçtüğün sayı farklıysa ölçtüğünü yaz.

- [ ] **Adım 6: `cacheComponents` bayrağını aç**

`next.config.ts` — mevcut nesnenin **kök seviyesine** (dikkat: `experimental` altına DEĞİL,
sözleşme §4.1) `poweredByHeader` satırından hemen sonra eklenir:

```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next 16'da kararlı ve KÖK seviyede (experimental altında değil). 'use cache' yönergesi
  // yalnız bu bayrak açıkken çalışıyor; Plan 2'de yazılmış revalidateTag(tag, 'max')
  // çağrıları da ancak okuma tarafı cacheTag ile bağlandığında bir işe yarıyor.
  //
  // Bayrağın YAN ETKİSİ var: segment export'ları `dynamic`, `dynamicParams`, `revalidate`,
  // `fetchCache` v16.0.0'da kaldırıldı. Bu depoda hiçbir sayfa `export const revalidate`
  // yazmaz; süre gerekiyorsa cacheLife ile verilir.
  cacheComponents: true,
  images: { formats: ['image/avif', 'image/webp'] },
  // ... dosyanın geri kalanı DEĞİŞMEZ ...
}
```

- [ ] **Adım 7: Ölçüm sondasını kur ve ÜRETİM DERLEMESİYLE ölç**

Sonda tek dosyada üç soruyu birden ölçüyor: `searchParams` okuyan sayfa derleniyor mu,
`'use cache'` fonksiyonu çalışıyor mu, `Date` taşıyan bir dönüş değeri önbellek sınırından
geçiyor mu (Görev 3'ün bütün tipleri `Date` taşıyor — bu soru cevaplanmadan o katman
yazılamaz).

`src/app/(site)/olcum-sonda/page.tsx`:

```tsx
// GEÇİCİ ÖLÇÜM SONDASI — Görev 1 Adım 9'da SİLİNİR, commit EDİLMEZ.
import { cacheTag } from 'next/cache'

async function sondaVerisi(): Promise<{ damga: Date; metin: string }> {
  'use cache'
  cacheTag('olcum-sonda')
  return { damga: new Date(0), metin: 'sonda' }
}

export default async function OlcumSondaSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const veri = await sondaVerisi()
  return (
    <main>
      <h1>Ölçüm sondası</h1>
      <p data-alan="q">{q ?? ''}</p>
      <p data-alan="damga">{veri.damga.toISOString()}</p>
      <p data-alan="metin">{veri.metin}</p>
    </main>
  )
}
```

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run build 2>&1 | tee /tmp/plan3/build-cachecomponents.txt
diff /tmp/plan3/build-taban.txt /tmp/plan3/build-cachecomponents.txt | tee /tmp/plan3/build-fark.txt
```

Ayrıca `cacheTag`'in **Next çalışma zamanı dışında** (yani Vitest'te) ne yaptığını ölç.
Bu, Görev 3'ün sorgu katmanına `'use cache'` konup konmayacağını belirleyen tek veridir:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
cat > /tmp/plan3/cachetag-sonda.mjs <<'EOF'
const { cacheTag } = await import('next/cache')
try {
  cacheTag('olcum')
  console.log('SONUC: cacheTag Next calisma zamani disinda FIRLATMADI')
} catch (error) {
  console.log('SONUC: cacheTag FIRLATTI ->', error.message)
}
EOF
node /tmp/plan3/cachetag-sonda.mjs 2>&1 | tee /tmp/plan3/cachetag-sonuc.txt
```

- [ ] **Adım 8: Bütün süiti hem dev hem CI kipinde koştur**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit
npm run lint
npm test 2>&1 | tail -20 | tee /tmp/plan3/vitest-cachecomponents.txt
npm run test:e2e 2>&1 | tail -40 | tee /tmp/plan3/e2e-cachecomponents.txt
```

**`/panel/**` en büyük risk.** Plan 2 panelinin tamamı istek bazlıdır: her sayfa
`requireAccess()` → `auth()` → `cookies()` zincirinden geçiyor. `cacheComponents` açıkken
bu sayfaların hâlâ çalıştığı **e2e ile** doğrulanmalı; derlemenin geçmesi yetmez.

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run test:e2e -- --grep "panel" 2>&1 | tail -40 | tee /tmp/plan3/e2e-panel.txt
```

- [ ] **Adım 9: Sondayı sil ve ölçümü plana iliştir**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
rm -rf "src/app/(site)/olcum-sonda"
git status --short
```
Beklenen: `git status --short` çıktısında `olcum-sonda` **geçmiyor**.

Sonra aşağıdaki tabloyu bu plan dosyasının içinde, tam bu adımın altına, **ölçülen
değerlerle** doldur. Boş bırakılan bir hücre görevi tamamlanmamış sayar.

```markdown
#### ÖLÇÜM SONUCU (uygulayıcı doldurur — tarih: ____)

| # | Soru | Ölçüm | Kanıt dosyası |
|---|---|---|---|
| a | Hangi rotalar statik, hangileri dinamik işaretleniyor? Next'in bastığı gösterge satırı nedir? | | `build-cachecomponents.txt` |
| a2 | Taban ile fark: hangi rotanın işareti DEĞİŞTİ? | | `build-fark.txt` |
| b | `searchParams` okuyan sayfa derlemeyi kırıyor mu, uyarı mı veriyor, sorunsuz mu? | | `build-cachecomponents.txt` |
| c | `/panel/**` (cookies() okuyan) sayfalar hâlâ çalışıyor mu? | | `e2e-panel.txt` |
| d1 | Birim testleri: taban ____ / sonra ____ | | `vitest-*.txt` |
| d2 | e2e testleri: taban ____ / sonra ____ | | `e2e-*.txt` |
| e | `Date` taşıyan dönüş değeri `'use cache'` sınırından geçiyor mu? (sonda sayfası `1970-01-01T00:00:00.000Z` basıyor mu) | | `build-cachecomponents.txt` |
| f | `cacheTag()` Next çalışma zamanı dışında (Vitest) ne yapıyor? | | `cachetag-sonuc.txt` |
```

#### ÖLÇÜM SONUCU (uygulayıcı doldurdu — tarih: 2026-08-20)

> **SONUÇ: OLUMSUZ. Bayrak geri kapatıldı; Görev 1 `BLOCKED` durumunda Aborjina'ya
> döndü.** Ham komut çıktıları ve kök sebep çözümlemesi için:
> `.superpowers/sdd/2026-08-20-plan-3-baglama-ve-yayin/gorev-1-rapor.md`.
> Ölçüm ortamı: Node v22.23.2, Next 16.3.0 (Turbopack), Vitest 4.1.11.

| # | Soru | Ölçüm | Kanıt dosyası |
|---|---|---|---|
| a | Hangi rotalar statik, hangileri dinamik işaretleniyor? Next'in bastığı gösterge satırı nedir? | **Bayrak açıkken rota tablosu HİÇ BASILMADI** — derleme dışa aktarma aşamasında düştü. Taban (bayrak kapalı) tablosunda 9 halka açık rota `○`, 18 panel rotası + `/api/auth/[...nextauth]` + `/medya/[...path]` `ƒ`. Next'in bastığı gösterge satırları: `○  (Static)   prerendered as static content` / `ƒ  (Dynamic)  server-rendered on demand` (ayrıca `ƒ Proxy (Middleware)`) | `build-taban.txt`, `build-cachecomponents.txt` |
| a2 | Taban ile fark: hangi rotanın işareti DEĞİŞTİ? | **Hiçbirinin işareti değişmedi — kıyaslanacak tablo oluşmadı.** Fark tablo satırlarında değil sonuçta: taban `✓ Generating static pages (25/25)` ile bitiyor, bayrak açıkken `Export encountered errors on 19 paths` ve çıkış kodu 1 | `build-fark.txt` |
| b | `searchParams` okuyan sayfa derlemeyi kırıyor mu, uyarı mı veriyor, sorunsuz mu? | **KIRIYOR** (uyarı değil, hata). `await searchParams` doğrudan sayfa gövdesinde, `<Suspense>` dışında → `Error: Route "/olcum-sonda": Next.js encountered uncached or runtime data during prerendering`. Aynı sayfa `next dev` altında HTTP 200 döndü ve `?q=deneme` değerini bastı: sorun **çalışma zamanı değil, ön işleme (prerender) zamanı** | `build-debug-prerender.txt`, `dev-server.log` |
| c | `/panel/**` (cookies() okuyan) sayfalar hâlâ çalışıyor mu? | **Derlemede HAYIR; dev çalışma zamanında açılıyorlar ama tur kırmızı.** 18 panel rotasının **tamamı** dışa aktarımda düştü. Kök sebep tek noktada: `src/app/panel/layout.tsx:15` → `getPanelUser()` → `auth()` (`src/lib/auth-guards.ts:21`), `<Suspense>` dışında. Dev'de sayfalar yanıt veriyor (`/panel/giris` 200, `/panel` 307) ama her istek aynı hatayı üretip Next dev hata katmanını (`<nextjs-portal>`) açıyor; katman tıklamaları yuttuğu için panel e2e turu düştü | `build-debug-prerender.txt`, `e2e-panel.txt`, `dev-server.log` |
| d1 | Birim testleri: taban **182** / sonra **182** | Değişmedi (17 dosya, 182 test yeşil). Vitest `next.config.ts` okumadığı için bayraktan etkilenmiyor. Not: görev tanımındaki "178" iddiası ile fark tam olarak bu görevde eklenen 4 testtir (178 + 4 = 182) | `vitest-taban.txt`, `vitest-cachecomponents.txt` |
| d2 | e2e testleri: taban **271** / sonra **266** | Taban: dev 271 ✓ / 47 atlandı; `CI=1` 271 ✓ / 47 atlandı (iddia edilen 271 birebir doğrulandı). Bayrak açıkken dev: **266 ✓, 1 ✘, 4 hiç koşmadı**; yalnız panel turunda **2 ✘, 4 hiç koşmadı**. `CI=1` kipinde **0 test koştu** — `webServer` komutu `npm run build && npm run start` olduğundan sunucu hiç ayağa kalkmadı (`Process from config.webServer was not able to start. Exit code: 1`), yani CI'da 271 testin tamamı kayıp | `e2e-taban.txt`, `e2e-taban-ci.txt`, `e2e-cachecomponents.txt`, `e2e-cachecomponents-ci.txt` |
| e | `Date` taşıyan dönüş değeri `'use cache'` sınırından geçiyor mu? | **EVET, bozulmadan geçiyor.** Brief'in tek sondası `searchParams`'a takılıp düştüğü için bu soru cevapsız kalıyordu; `searchParams` okumayan ikinci bir sonda (`/olcum-sonda-tarih`) yazıldı: HTTP 200 ve `data-alan="damga">1970-01-01T00:00:00.000Z`. Dönüş değeri sınırın öbür tarafında hâlâ `Date`. **Uyarı:** üretim derlemesi tamamlanmadığı için `next dev` ile ölçüldü | `dev-server.log` |
| f | `cacheTag()` Next çalışma zamanı dışında (Vitest) ne yapıyor? | **FIRLATIYOR:** `` `cacheTag()` is only available with the `cacheComponents` config. `` — ve bu ölçüm bayrak **AÇIKKEN** alındı; Vitest `next.config.ts` okumadığı için bayrağın açık olması durumu değiştirmiyor. "Sorgu katmanına `'use cache'` KONMAZ" kararı ölçümle doğrulandı | `cachetag-sonuc.txt` |

**Bayrağın geri kapatılması doğrulandı:** `git checkout -- next.config.ts` sonrası
`npm run build` taban tablosunun aynısını basıyor (25/25 statik sayfa, aynı 29 rota, aynı
işaretler); `npx tsc --noEmit`, `npm run lint` temiz; `npm test` 182/182; `npm run test:e2e`
ve `CI=1 npm run test:e2e` 271/271. Depoda `cacheComponents` **yok**.

**Görev 4+ için bağlayıcı uyarı:** brief'in "olumluysa bağlayıcı olur" dediği
`'use cache'` + `cacheTag` + `cacheLife` kalıbı **şu an bağlayıcı DEĞİLDİR** — bayrak
kapalıyken `cacheTag()` fırlatır. Kalıbın devreye girmesi, panel sarmalayıcısının veri
okuma sınırı hakkında verilecek mimari karara bağlıdır (bkz. rapor §7).

#### ÖLÇÜM SONUCU — GÖREV 1B (karar (A) denendi — tarih: 2026-08-20)

Aborjina kararı: **(A)** panel veri sınırı yeniden konumlandırılacak, bayrak açılacak
(gerekçe spec §6 ve §11). Uygulandı, ölçüldü, **ikinci kez düştü**. Ham çıktılar:
`.superpowers/sdd/2026-08-20-plan-3-baglama-ve-yayin/gorev-1-rapor.md` (Görev 1B bölümü).

| Konu | Ölçüm |
|---|---|
| **Panel statik kabuk denetimi** | **ÇÖZÜLDÜ.** `src/app/panel/layout.tsx` içine tek satır `export const instant = false`. Derlemedeki 19 yol hatası **0'a** indi, `npm run build` yeşil (29/29). Doküman doğrulaması yapıldı: `instant`, `route-segment-config/instant.md` içinde belgeli (`type InstantConfig = true \| false \| { level?: 'warning' }`, yalnız `cacheComponents` ile çalışır); "Disabling static shell validation" bölümü bu kullanımı birebir tarif ediyor. `<Suspense>` ölçümle elendi: sınır yalnız layout'ta değil, 18 sayfanın her biri gövdesinde `requireUser()`/`requireAccess()` çağırıyor |
| **Halka açık rotalar** | **KAYIP YOK.** 9 rota `○` olarak korundu; hiçbiri dinamiğe düşmedi |
| **Tek rota işareti değişimi** | 4 panel `[id]` rotası `ƒ` → `◐` (Partial Prerender). Sızıntı denetlendi: **panel altındaki 17 HTML kabuğunun tamamı 0 bayt**; halka açık sayfalar 15–25 KB gerçek HTML. `◐` muhasebe değişikliği, içerik değişikliği değil |
| **`searchParams` kalıbı (Görev 7)** | **ÇALIŞIYOR.** Sayfa `async` olmaz; `searchParams` promise'i `<Suspense>` ile sarılmış çocuğa prop geçirilir, `await` orada yapılır (`migrating-to-cache-components.md:726`). Üretim derlemesiyle kanıtlandı: kabukta yedek metin, istekte `?q=deneme&sayfa=3` doğru render |
| **`Date` önbellek sınırı** | **ÜRETİM derlemesiyle doğrulandı** (Görev 1'de yalnız dev ile ölçülebilmişti): `1970-01-01T00:00:00.000Z` hem statik kabukta hem istekte doğru |
| **KIRILMA: `notFound()` 404 → 200** | **6 taban testi kırmızı** (`panel-yetki.spec.ts:21`, "editor /panel/X adresine erişemez"): `Expected: 404 / Received: 200`. **İçerik sızmıyor** — editor "Sayfa bulunamadı" görüyor, gezinme yalnız yetkili bağlantıları çiziyor. Bozulan yalnız HTTP durumu. **Sebep `instant` değil:** aynı kodla dev kipinde 6 test geçiyor, üretim kipinde düşüyor. Doküman kaçınılmaz ilan ediyor (`not-found.md:193`): "With Cache Components, **every dynamic route streams a static shell first**, so run that check in `proxy` instead" |

**Neden burada durduk:** düzeltme, rol denetimini `src/proxy.ts`'e taşımayı gerektiriyor.
Proxy bugün bilinçli olarak "veritabanına ve argon2'ye dokunmaz"; taşımak ya JWT rolüne
güvenmeyi (rolü düşürülen kullanıcı 8 saat admin kalır — `auth-guards.ts:11-19` bunu açıkça
reddediyor) ya da proxy'ye veritabanı sorgusu koymayı gerektirir. İkisi de Plan 2'nin
güvenlik mimarisine ait kararlardır; alınmadı. **Bayrak ve `instant` geri alındı**, taban
eksiksiz geri geldi (182 birim, 271 e2e dev + `CI=1`, build 25/25, tsc/lint temiz).

**Karar bekleyen tek soru:** rol denetimi proxy'ye taşınsın mı — (A1) proxy DB okusun,
(A2) proxy JWT rolüne baksın + `requireAccess()` ikinci hat kalsın, (A3) 404 sözleşmesinden
bilinçli olarak vazgeçilsin ve test 200 + "Sayfa bulunamadı" içeriğini doğrulasın.

#### ÖLÇÜM SONUCU — GÖREV 1C: BAYRAK AÇILDI (karar (A3) — tarih: 2026-08-20)

Aborjina kararı: **(A3)** — panel için 404 sözleşmesinden bilinçli vazgeçildi. Gerekçe: üç
seçeneğin güvenlik sonucu aynı; panel `noindex` ve kimlik doğrulaması arkasında olduğu için
durum kodunun gerçek bir tüketicisi yok. **`cacheComponents: true` artık depoda AÇIK.**

**Karardan önce ölçülen kritik soru — halka açık taraf soft 404 üretiyor mu? HAYIR:**

```
/olcum-sonda/var-olan-yazi         HTTP=200     (generateStaticParams ile üretilmiş)
/olcum-sonda/olmayan-bir-yazi      HTTP=404     (notFound(), Suspense DIŞINDA)
/olmayan-sayfa                     HTTP=404
/olcum-sonda-akan/olmayan-bir-yazi HTTP=200     (notFound(), Suspense İÇİNDE -> soft 404)
```

**Görev 8 için BAĞLAYICI KURAL:** `notFound()` gerçek 404 döndürür **ancak ve ancak** akış
başlamadan, yani `<Suspense>` sınırının DIŞINDA çağrılırsa. Ayrıntı sayfalarında varlık
denetimi sayfa gövdesinde kalmalı; akan bir çocuğa taşınırsa 404 sessizce 200 olur ve arama
motoru boş sayfayı indeksler. Kural `next.config.ts` ve `src/lib/auth-guards.ts` yorumlarına
da işlendi.

**(A3) uygulanışı:** `tests/e2e/panel-yetki.spec.ts`'teki 6 editör testi zayıflatılmadı,
**güçlendirildi** — durum kodu iddiası yerine (a) ret ekranı görünüyor, (b) korunan sayfanın
başlığı/tablosu/formu `main` içinde hiç çizilmiyor, (c) gezinme yetkisiz bağlantı taşımıyor.
Test başına `expect` sayısı 1 → 5. `skip` eklenmedi. `admin ... görür` testlerine de başlığın
gerçekten görüldüğü iddiası eklendi (yoksa sızıntı testi boş sayfada da yeşil kalırdı).
Mutasyon kanıtı: `canAccess` → `return true` yapıldığında 6 testin hepsi kırmızı.

**Son durum (bayrak AÇIK):** `npm run build` yeşil (29/29), `npx tsc --noEmit` temiz (build'den
SONRA), `npm run lint` temiz, `npm test` 182/182, `npm run test:e2e` 271/271,
`CI=1 npm run test:e2e` 271/271 — **taban birebir korundu.**

**Raporlanan iki gözlem (düzeltilmedi):** (1) yetkisiz panel yolunda `<title>` bölüm adını
taşıyor — bayraktan ÖNCE de böyleydi, ölçüldü; veritabanı verisi sızmıyor, sayfa `noindex`.
(2) Üretim günlüğünde yeni `⨯ Error: The destination stream closed early.` satırı — akış
iptallerinden kaynaklanıyor, hiçbir teste yansımıyor.

#### BAĞLAYICI KALIPLAR (bayrak açık — Görev 3+ buradan okur)

1. **Sorgu katmanına `'use cache'` KONMAZ** — `cacheTag()` Vitest'te fırlatıyor (bayrak açıkken
   bile; Vitest `next.config.ts` okumuyor). Sorgular saf kalır, sınır tüketicide kurulur.
2. **Önbellekleme kalıbı** (üretim derlemesiyle doğrulandı; `cacheLife` rota tablosuna `1d 1w`
   olarak yansıyor):
   ```tsx
   async function CalismaAlanlariBlogu() {
     'use cache'
     cacheTag(TAGS.practiceAreas)
     cacheLife('days')
     const areas = await listPublicPracticeAreas()
     return <PracticeAreas areas={areas} />
   }
   ```
3. **`searchParams` kalıbı (Görev 7):** sayfa `async` OLMAZ; promise `<Suspense>` sarmalı
   çocuğa prop geçer, `await` orada yapılır.
4. **`notFound()` kuralı (Görev 8):** varlık denetimi `<Suspense>` DIŞINDA kalmalı.
5. **Panel:** `instant = false` ile statik kabuk denetiminin dışında; panelde `notFound()`
   durum kodu değil içerik engelliyor.

- [ ] **Adım 10: KARAR — olumsuzsa DUR**

**Olumsuz sayılan sonuçlar** (herhangi biri yeterli):
- `npm run build` bayrak açıkken başarısız oluyor;
- taban yeşil olan bir birim veya e2e testi bayraktan sonra kırmızı;
- `/panel/**` e2e turu kırmızı;
- `Date` önbellek sınırından geçemiyor (sonda sayfası hata veriyor veya damgayı bozuyor).

Olumsuzsa: tabloyu **olduğu gibi** doldur, sonra bayrağı geri kapat ve **DUR**:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git checkout -- next.config.ts
npm run build 2>&1 | tail -5
```
Aborjina'ya bildir. **Kendi başına mimari değiştirme** — `'use cache'`'siz bir Plan 3
mümkündür ama bu karar senin değil.

**Olumluysa** aşağıdaki kalıp bağlayıcı olur ve Görev 4+ sayfalarında kullanılır:

```tsx
// KALIP — sayfa/bileşen sınırında önbellekleme (Görev 4+ bunu kullanır).
import { cacheLife, cacheTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'

// 'use cache' kapsadığı her şeyin async olmasını istiyor. cacheTag ile panel tarafındaki
// revalidateTag(TAGS.practiceAreas, 'max') çağrısına bağlanıyor: avukat panelden kaydettiği
// anda bu blok düşüyor. cacheLife ikinci bir emniyet kemeri — etiket bir gün kaçırılırsa
// içerik sonsuza kadar bayat kalmasın.
async function CalismaAlanlariBlogu() {
  'use cache'
  cacheTag(TAGS.practiceAreas)
  cacheLife('days')

  const areas = await listPublicPracticeAreas()
  return <PracticeAreas areas={areas} />
}
```

**Sorgu katmanına `'use cache'` KONMAZ** (Görev 3). Gerekçe ölçüm (f)'e dayanır: `cacheTag()`
Next çalışma zamanı dışında çağrılamıyorsa, sorgu fonksiyonlarının içine yönerge koymak
`src/db/queries/public/*.test.ts` dosyalarının hepsini çalıştırılamaz hâle getirirdi.
Sorgular saf ve Vitest'ten doğrudan çağrılabilir kalır; önbellek **tüketici** sınırında
kurulur. Ölçüm (f) "fırlatmadı" derse bu karar yine de geçerlidir — sınırın tek bir yerde
(sayfada) durması, aynı sorgunun farklı sayfalarda farklı `cacheLife` ile kullanılabilmesini
sağlar.

- [ ] **Adım 11: Mutasyon kanıtı**

`src/lib/cache-tags.ts` içinde `page:` ön ekini `article:` yap:

```ts
export function pageTag(slug: string): string {
  return `article:${slug}`
}
```
Beklenen: `npm test -- src/lib/cache-tags.test.ts` → KIRMIZI, "makale ve sayfa etiketleri
çakışmaz" testi düşer. Geri al (`page:`), yeşile döndüğünü gör.

- [ ] **Adım 12: Commit**

```bash
git add next.config.ts src/lib/cache-tags.ts src/lib/cache-tags.test.ts docs/superpowers/plans/
git commit -m "feat: cacheComponents açıldı, ölçüldü ve sayfa etiketi eklendi

next.config.ts kök seviyesine cacheComponents: true eklendi (Next 16.3'te kararlı).
Üretim derlemesiyle ölçüldü: rota statik/dinamik işaretleri, searchParams davranışı,
/panel/** istek bazlı sayfaların durumu, Date'in önbellek sınırından geçişi ve
cacheTag'in Next çalışma zamanı dışındaki davranışı. Sonuçlar plana iliştirildi.
cache-tags.ts'e TAGS.pages ve pageTag(slug) eklendi (Görev 2 tüketecek).

Doğrulama: npx tsc --noEmit, npm run lint, npm test, npm run test:e2e, npm run build."
```

---

### Görev 2: `pages` tablosu + `articles.search_text`

Sözleşme §3.6 ve §3.7. İki ayrı düzeltme tek migration'da toplanıyor çünkü ikisi de aynı
`ALTER`/`CREATE` turunda uygulanıyor ve ikisi de Görev 3'ün önkoşulu.

**Dosyalar:**
- Değiştir: `src/db/schema.ts` (yeni `pages` tablosu, `articles.searchText`, `PAGE_SLUGS`)
- Oluştur: `drizzle/0002_pages_and_search_text.sql` (üretilir, sonra **elle düzenlenir**)
- Oluştur: `src/db/queries/pages.ts` (panel tarafı)
- Oluştur: `src/db/queries/public/pages.ts` (halka açık `getPage`)
- Test: `src/db/queries/pages.test.ts`
- Değiştir: `src/db/seed.ts` (üç sabit satır — yer tutucu metinle)
- Oluştur: `scripts/backfill-search-text.mts`
- Değiştir: `package.json` (`db:backfill-search` betiği)
- Değiştir: `src/app/panel/makaleler/actions.ts` (tek alan eklenir, **imza değişmez**)
- Değiştir: `src/lib/permissions.ts` + `src/lib/permissions.test.ts` (`'pages'` kaynağı)
- Değiştir: `src/lib/validation.ts` (`pageSchema`; ayrıca Adım 15-20'de
  `RESERVED_ARTICLE_SLUGS` ve `articleSchema`'ya yasaklı slug denetimi)
- Test: `src/lib/validation.test.ts` (yasaklı slug — Adım 15)
- Oluştur: `src/app/panel/sayfalar/page.tsx`, `src/app/panel/sayfalar/[slug]/page.tsx`,
  `src/app/panel/sayfalar/actions.ts`, `src/app/panel/sayfalar/page.module.css`
- Oluştur: `src/components/PageContentForm.tsx`
- Değiştir: `src/components/PanelNav.tsx` (tek satır bağlantı)
- Değiştir: `docs/superpowers/specs/2026-08-18-tolga-akil-hukuk-sitesi-design.md` (§13)

**Arayüzler:**
- Tüketir: `TAGS.pages`, `pageTag(slug)` (Görev 1); `requireAccess(resource)`,
  `sanitizeArticleHtml(html)`, `htmlToPlainText(html)`, `textColumnLengthError(value, alanAdi)`,
  `toFormState(error)`, `findBannedPhrases(text)`, `formatBannedMatch(match)`.
- Üretir:
  - `PAGE_SLUGS`, `type PageSlug`, `isPageSlug(value: string): value is PageSlug`
  - `getPage(slug: PageSlug): Promise<{ title: string; content: string; updatedAt: Date } | null>`
  - `articles.searchText` sütunu ve `(title, excerpt, search_text)` FULLTEXT indeksi —
    **Görev 3'ün arama sorgusu bu indekse dayanır.**

---

- [ ] **Adım 1: Kırmızı testi yaz**

`src/db/queries/pages.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, closeDb } from '@/db/client'
import { PAGE_SLUGS, articles, isPageSlug, pages } from '@/db/schema'
import { getPage } from '@/db/queries/public/pages'
import { listPages, updatePageContent } from '@/db/queries/pages'

// Testler tek bir gerçek şemayı paylaşıyor; her test kendi zeminini sıfırdan kurar
// (src/db/schema.test.ts ile aynı desen).
beforeEach(async () => {
  await db.delete(pages)
})

// Havuz globalThis üzerinde önbelleklendi; çağrılmazsa Vitest çıkışta asılır.
afterAll(async () => {
  await db.delete(pages)
  await db.delete(articles)
  await closeDb()
})

async function sayfaEkle(slug: string, baslik: string, icerik: string) {
  await db.insert(pages).values({ slug, title: baslik, content: icerik })
}

describe('PAGE_SLUGS', () => {
  // Sabit satırlı tablo: yeni satır oluşturulamıyor, silinemiyor. Liste kod tarafında
  // sabit olmasaydı panel var olmayan bir slug'a düzenleme formu açardı.
  it('spec §4 ile istenen üç sayfayı sayar', () => {
    expect([...PAGE_SLUGS]).toEqual(['hakkimizda', 'kvkk', 'cerez-politikasi'])
  })

  // Adres çubuğundan gelen slug kullanıcı verisidir; tanınmayan değer forma dönüşmemeli.
  it('tanınmayan slug reddedilir', () => {
    expect(isPageSlug('kvkk')).toBe(true)
    expect(isPageSlug('uydurma')).toBe(false)
  })
})

describe('getPage', () => {
  it('var olan sayfanın başlığını ve içeriğini döndürür', async () => {
    await sayfaEkle('kvkk', 'KVKK Aydınlatma Metni', '<p>Yer tutucu.</p>')
    const sayfa = await getPage('kvkk')
    expect(sayfa?.title).toBe('KVKK Aydınlatma Metni')
    expect(sayfa?.content).toBe('<p>Yer tutucu.</p>')
    expect(sayfa?.updatedAt).toBeInstanceOf(Date)
  })

  // Tohum verisi eksikse sayfa 404 olmalı; boş bir kabuk basılmamalı.
  it('satırı olmayan slug için null döndürür', async () => {
    expect(await getPage('cerez-politikasi')).toBeNull()
  })

  it('Türkçe harfleri kayıpsız taşır', async () => {
    await sayfaEkle('hakkimizda', 'Hakkımızda', '<p>Büro çalışma şeklimiz.</p>')
    const sayfa = await getPage('hakkimizda')
    expect(sayfa?.title).toBe('Hakkımızda')
    expect(sayfa?.content).toBe('<p>Büro çalışma şeklimiz.</p>')
  })
})

describe('listPages / updatePageContent', () => {
  it('sayfaları PAGE_SLUGS sırasında listeler', async () => {
    await sayfaEkle('cerez-politikasi', 'Çerez Politikası', '<p>c</p>')
    await sayfaEkle('hakkimizda', 'Hakkımızda', '<p>h</p>')
    await sayfaEkle('kvkk', 'KVKK', '<p>k</p>')

    // Ekleme sırası kasten karışık: liste veritabanı sırasına değil, sabit listeye uymalı;
    // aksi hâlde panelde sayfaların yeri her kayıttan sonra değişirdi.
    expect((await listPages()).map((p) => p.slug)).toEqual(['hakkimizda', 'kvkk', 'cerez-politikasi'])
  })

  it('içeriği günceller ve yeni satır AÇMAZ', async () => {
    await sayfaEkle('kvkk', 'KVKK', '<p>eski</p>')
    await updatePageContent('kvkk', { title: 'KVKK Aydınlatma Metni', content: '<p>yeni</p>' })

    const satirlar = await db.select().from(pages).where(eq(pages.slug, 'kvkk'))
    expect(satirlar).toHaveLength(1)
    expect(satirlar[0].content).toBe('<p>yeni</p>')
    expect(satirlar[0].title).toBe('KVKK Aydınlatma Metni')
  })
})
```

- [ ] **Adım 2: Testin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/db/queries/pages.test.ts
```
Beklenen: FAIL — `Cannot find module '@/db/queries/public/pages'` ve `'pages' has no
exported member` hataları.

- [ ] **Adım 3: Şemayı yaz**

`src/db/schema.ts` — üç düzenleme.

**(3a)** `articles` tablosunun sütun listesine, `content` satırından hemen sonra:

```ts
    content: text('content').notNull(),
    // FULLTEXT indeksi content'i kapsıyordu ve o sütun HTML tutuyor: "<strong>" araması
    // makale getiriyor, etiket adları terim olarak indeksleniyordu (Plan 2 borcu). Bu sütun
    // aynı metnin düz hâlini tutuyor ve indeks artık content yerine bunu kapsıyor.
    // Nullable: geri doldurma script'i koşmadan önceki satırlar NULL kalır ve NULL bir
    // FULLTEXT sütunu boş dize gibi davranır — o satır aramada çıkmaz, hata da vermez.
    searchText: text('search_text'),
```

**(3b)** Dosyanın sonuna, `settings` tablosundan sonra:

```ts
// Sabit satırlı sayfa metinleri: spec §4 /hakkimizda, /kvkk ve /cerez-politikasi sayfalarını
// istiyor ama spec §5 veri modelinde bu metinler için hiçbir alan yok. Kodda sabit metin
// olsalardı avukat kendi metnini panelden değiştiremezdi. Yeni satır oluşturulamaz, satır
// silinemez; yalnız düzenlenir (bkz. src/app/panel/sayfalar).
export const pages = mysqlTable('pages', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  title: varchar('title', { length: 220 }).notNull(),
  content: text('content').notNull(), // sanitizeArticleHtml'den geçmiş HTML
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})

// Liste sütunun YANINDA duruyor: slug kümesini kısıtlayan tek şey bu dizi (veritabanında
// ENUM yok — ENUM'a satır eklemek migration gerektirirdi ve buradaki amaç tam tersi,
// kümenin kod tarafında kilitli kalması).
export const PAGE_SLUGS = ['hakkimizda', 'kvkk', 'cerez-politikasi'] as const
export type PageSlug = (typeof PAGE_SLUGS)[number]

// Adres çubuğundan ve formdan gelen slug kullanıcı verisidir; daraltma bu yüklemle yapılır.
export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value)
}
```

**(3c)** Tip dışa aktarımlarının sonuna:

```ts
export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
```

- [ ] **Adım 4: Migration'ı üret ve ELLE tamamla**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx drizzle-kit generate --name=pages_and_search_text
ls drizzle
```
Beklenen: `drizzle/0002_pages_and_search_text.sql` + `drizzle/meta/0002_snapshot.json` +
`_journal.json`'a yeni girdi. (Üretilen dosya adı farklıysa aşağıdaki yolları ona göre düzelt.)

Üretilen dosyayı aç ve **iki elle düzenleme** yap:

**(4a)** `CREATE TABLE \`pages\`` ifadesinin sonundaki `;` işaretinden önce harmanlamanın
yazılı olduğunu doğrula. `0000_greedy_caretaker.sql` her tabloda
`) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;` yazıyor. Üretilen dosyada **yoksa**
elle ekle. Gerekçe bağlayıcı: yerel sunucunun varsayılanı `utf8mb4_uca1400_ai_ci` ve o
harmanlama ailesi MariaDB 11.4+ ile geldi — hedef sunucu 10.11'de yok, tablo orada oluşmaz.

**(4b)** Dosyanın **sonuna**, mevcut son ifadeden sonra `--> statement-breakpoint` ile
ayrılmış üç ifade ekle. (Ayrı bir migration dosyası açılmıyor: bu üç ifade `search_text`
sütunuyla aynı turda uygulanmak zorunda, ayrı dosyada uygulanırlarsa aradaki bir çökme
indeksi `search_text` olmadan bırakır.)

```sql
--> statement-breakpoint
-- drizzle-kit MySQL FULLTEXT indeksi üretemiyor (index() yalnızca btree/hash destekliyor),
-- bu yüzden elle. İndeks yeniden kuruluyor çünkü kapsamı DEĞİŞİYOR: content (HTML) çıkıyor,
-- search_text (düz metin) giriyor. MariaDB'de bir FULLTEXT indeksinin sütun listesi
-- değiştirilemez, ancak düşürülüp yeniden kurulabilir.
DROP INDEX `articles_fulltext_idx` ON `articles`;
--> statement-breakpoint
-- InnoDB FULLTEXT bütün sütunların aynı harmanlamada olmasını istiyor; üçü de tablo
-- varsayılanını (utf8mb4_unicode_ci) miras alıyor. Sözdizimi 10.11 uyumlu.
CREATE FULLTEXT INDEX `articles_fulltext_idx` ON `articles` (`title`, `excerpt`, `search_text`);
```

Uygula ve doğrula:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run db:migrate -- .env.test
npm run db:migrate -- .env.local
```
Beklenen: iki komut da "Migration'lar uygulandı." basıyor, hata yok.

- [ ] **Adım 5: Sorgu katmanını yaz**

`src/db/queries/pages.ts` (panel tarafı):

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { PAGE_SLUGS, pages, type PageSlug } from '@/db/schema'

export type PageListItem = {
  slug: PageSlug
  title: string
  updatedAt: Date
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün,
// panel sessizce boş liste göstermesin.
export async function listPages(): Promise<PageListItem[]> {
  const rows = await db.select({ slug: pages.slug, title: pages.title, updatedAt: pages.updatedAt }).from(pages)

  // Sıralama veritabanına bırakılmıyor: liste ekranda sabit durmalı. `updated_at`'e göre
  // dizilseydi bir sayfayı kaydeden kullanıcı listenin yeniden dizildiğini görür ve bir
  // sonraki tıklamada yanlış satıra basardı. Sabit liste dışındaki bir satır (elle eklenmiş
  // olabilir) düşüyor: panel yalnız yönetebildiği slug'ları göstermeli.
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  return PAGE_SLUGS.flatMap((slug) => {
    const row = bySlug.get(slug)
    return row === undefined ? [] : [{ slug, title: row.title, updatedAt: row.updatedAt }]
  })
}

export async function getPageBySlug(slug: PageSlug): Promise<{ title: string; content: string } | null> {
  const [row] = await db.select({ title: pages.title, content: pages.content }).from(pages).where(eq(pages.slug, slug))
  return row ?? null
}

/** Yalnız GÜNCELLER; satır oluşturmaz ve silmez (sabit satırlı tablo). */
export async function updatePageContent(slug: PageSlug, values: { title: string; content: string }): Promise<void> {
  await db.update(pages).set(values).where(eq(pages.slug, slug))
}
```

`src/db/queries/public/pages.ts` (halka açık; **Görev 3 aynı dizine dört dosya daha ekler**):

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { pages, type PageSlug } from '@/db/schema'

export type PublicPage = { title: string; content: string; updatedAt: Date }

/**
 * Sabit sayfa metni; satır yoksa null (tohum verisi eksikse sayfa 404 olmalı, boş bir
 * kabuk basılmamalı).
 *
 * `content` yazma tarafında sanitizeArticleHtml'den geçmiş HTML'dir. Panel sorgusu
 * KULLANILMIYOR: halka açık taraf panel sorgularına bağlanırsa ileride oraya eklenen bir
 * taslak/gizli alan sessizce yayına sızar (sözleşme §3).
 */
export async function getPage(slug: PageSlug): Promise<PublicPage | null> {
  const [row] = await db
    .select({ title: pages.title, content: pages.content, updatedAt: pages.updatedAt })
    .from(pages)
    .where(eq(pages.slug, slug))
  return row ?? null
}
```

- [ ] **Adım 6: Testin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/db/queries/pages.test.ts
```
Beklenen: PASS — 7 test.

- [ ] **Adım 7: Tohum verisi (yer tutucu metin)**

`src/db/seed.ts` — `SEED_PRACTICE_AREAS` dizisinden sonra:

```ts
// HUKUKİ METİN ÜRETİLMİYOR — bağlayıcı karar. KVKK aydınlatma metni ve çerez politikası
// hukuki belgedir; model üretimi bir metin, gerçek bir belge gibi görüneceği için burada
// yalnız yer tutucu duruyor. Müvekkilin gerçek metni panelden girmesi spec §13'te açık
// madde olarak kayıtlı.
const YER_TUTUCU = '<p>Bu metin büro tarafından panelden girilecektir.</p>'

const SEED_PAGES = [
  { slug: 'hakkimizda', title: 'Hakkımızda', content: YER_TUTUCU },
  { slug: 'kvkk', title: 'KVKK Aydınlatma Metni', content: YER_TUTUCU },
  { slug: 'cerez-politikasi', title: 'Çerez Politikası', content: YER_TUTUCU },
]
```

`seed()` gövdesinin sonuna, `settings` bloğundan sonra:

```ts
  // Idempotent: var olan satırın İÇERİĞİNİ EZMEZ. Aksi hâlde tohumu ikinci kez koşturmak
  // avukatın panelden girdiği gerçek KVKK metnini yer tutucuyla değiştirirdi.
  for (const page of SEED_PAGES) {
    const existing = await db.select().from(pages).where(eq(pages.slug, page.slug))
    if (existing.length === 0) await db.insert(pages).values(page)
  }
```

Import satırını genişlet (uzantılı ve göreli yol bilinçli — `scripts/seed.mts` bu dosyayı
doğrudan Node ESM ile yüklüyor):

```ts
import { categories, pages, practiceAreas, settings, users } from './schema.ts'
```

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run db:seed -- .env.local
npm run db:seed -- .env.local
```
Beklenen: iki koşum da "Tohum verisi yüklendi." basıyor; ikincisi hiçbir satır eklemiyor.

- [ ] **Adım 8: `search_text` yazma yolu + geri doldurma**

`src/app/panel/makaleler/actions.ts` — `values` nesnesine **tek satır** eklenir; fonksiyon
imzası ve mevcut hiçbir satır değişmez. `plainContent` zaten yukarıda üretiliyor:

```ts
  const values = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: parsed.data.excerpt,
    content,
    // FULLTEXT indeksi artık content'i değil bunu kapsıyor (bkz. schema.ts search_text).
    // Aynı düz metin reklam yasağı taramasında da kullanılıyor; bir kez üretiliyor.
    searchText: plainContent,
    status: parsed.data.status,
    categoryId: parsed.data.categoryId,
    authorId: parsed.data.authorId,
    coverMediaId,
    publishedAt,
  }
```

`scripts/backfill-search-text.mts` (`scripts/seed.mts` düzeninin birebir aynısı):

```ts
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Hangi .env dosyasının okunacağını çağıran belirler.
const envPath = process.argv[2] ?? '.env.local'

// process.loadEnvFile KULLANILMIYOR: ortamda zaten tanımlı bir değişkeni EZMİYOR ve bu
// betik satır GÜNCELLİYOR — hedefi daima argüman belirlemeli (bkz. scripts/seed.mts).
Object.assign(process.env, parseEnv(readFileSync(envPath, 'utf8')))

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error(`${envPath} içinde DATABASE_URL yok; geri doldurmanın hedefi belirsiz.`)

// Yalnız veritabanı adı yazdırılıyor — URL'de parola var.
console.log(`Hedef veritabanı: ${new URL(databaseUrl).pathname.replace(/^\//, '')} (${envPath})`)

// Dinamik import bilinçli: ortam değişkenleri client.ts'in modül seviyesindeki DATABASE_URL
// okumasından ÖNCE atanmalı, statik import bunu garanti etmiyor.
const { eq, isNull } = await import('drizzle-orm')
const { db, closeDb } = await import('../src/db/client.ts')
const { articles } = await import('../src/db/schema.ts')
const { htmlToPlainText } = await import('../src/lib/sanitize.ts')

// Yalnız NULL satırlar: betik yeniden koşturulduğunda hiçbir şey yapmaz ve panelden
// kaydedilmiş taze bir search_text'i eski içerikle ezmez.
const rows = await db
  .select({ id: articles.id, content: articles.content })
  .from(articles)
  .where(isNull(articles.searchText))

console.log(`Geri doldurulacak makale: ${rows.length}`)

for (const row of rows) {
  await db.update(articles).set({ searchText: htmlToPlainText(row.content) }).where(eq(articles.id, row.id))
}

console.log('search_text geri doldurma tamamlandı.')
await closeDb()
```

`package.json` `scripts` bölümüne, `db:seed` satırından sonra:

```json
    "db:backfill-search": "node scripts/backfill-search-text.mts",
```

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run db:backfill-search -- .env.local
npm run db:backfill-search -- .env.local
```
Beklenen: ilk koşum satır sayısı basıyor; **ikinci koşum "Geri doldurulacak makale: 0"**
(idempotent olduğunun kanıtı).

- [ ] **Adım 9: Yetki kaynağı ve doğrulama şeması**

`src/lib/permissions.ts`:

```ts
export type PanelResource =
  | 'articles' | 'media' | 'lawyers' | 'practiceAreas'
  | 'categories' | 'settings' | 'messages' | 'users' | 'pages'
```
`EDITOR_RESOURCES` **değişmez**: sayfa metinleri büroyu tanıtan kurumsal içerik ve KVKK
metni hukuki sorumluluk taşıyor; spec §3'e göre bu admin işidir.

`src/lib/permissions.test.ts` — iki `it.each` listesine `'pages'` eklenir:

```ts
  it.each(['lawyers', 'practiceAreas', 'categories', 'settings', 'messages', 'users', 'pages'] as const)(
```
```ts
  it.each(['articles', 'media', 'lawyers', 'practiceAreas', 'categories', 'settings', 'messages', 'users', 'pages'] as const)(
```

`src/lib/validation.ts` — `categorySchema`'dan sonra:

```ts
// Slug ŞEMADA YOK: sabit satırlı tabloda slug kullanıcı girdisi değil, rota parametresi.
// Server action onu isPageSlug ile daraltıyor; şemaya konsaydı "uydurma" bir slug şemadan
// geçer ve UPDATE hiçbir satırı etkilemeden "kaydedildi" denirdi.
export const pageSchema = z.object({
  title: z.string().trim().min(3, 'Başlık en az 3 karakter olmalı.').max(220, 'Başlık en fazla 220 karakter olabilir.'),
})
```

- [ ] **Adım 10: Panel — "Sayfa metinleri" bölümü**

`src/app/panel/sayfalar/actions.ts`:

```ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { getPageBySlug, updatePageContent } from '@/db/queries/pages'
import { isPageSlug } from '@/db/schema'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS, pageTag } from '@/lib/cache-tags'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'
import { pageSchema, textColumnLengthError, toFormState, type FormState } from '@/lib/validation'

const INVALID_SLUG: FormState = {
  ok: false,
  errors: {},
  message: 'Sayfa adresi okunamadı; listeye dönüp yeniden açın.',
}

// deletePage/createPage YOK ve olmayacak: tablo sabit satırlı (sözleşme §3.6). Silinen bir
// satır /kvkk adresini 404'e düşürürdü ve o adres KVKK metninin yasal yayın yeridir.
export async function savePage(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('pages')

  const rawSlug = formData.get('slug')
  if (typeof rawSlug !== 'string' || !isPageSlug(rawSlug)) return INVALID_SLUG

  const parsed = pageSchema.safeParse({ title: formData.get('title') })
  if (!parsed.success) return toFormState(parsed.error)

  // İstemci tarafı temizliği güvenlik önlemi sayılmaz; beyaz liste makaleyle aynı.
  const rawContent = formData.get('content')
  const content = typeof rawContent === 'string' ? sanitizeArticleHtml(rawContent) : ''
  // Boş <p></p> hâlâ HTML olarak dolu; "içerik girildi" sayılmaması için düz metne bakılıyor.
  const plainContent = htmlToPlainText(content)
  if (plainContent === '') {
    return { ok: false, errors: { content: ['İçerik temizlendikten sonra boş kaldı; metin ekleyin.'] } }
  }

  // Sütun TEXT = 65.535 bayt; denetim TEMİZLENMİŞ dize üzerinde (bkz. makaleler/actions.ts).
  const lengthError = textColumnLengthError(content, 'İçerik')
  if (lengthError !== null) return { ok: false, errors: { content: [lengthError] } }

  // Bu üç metin halka açık düzyazı ve doğrudan yayında: tarama makale ile aynı sözleşmede.
  const matches = findBannedPhrases([parsed.data.title, plainContent].join(' '))
  if (matches.length > 0 && formData.get('adBanAcknowledged') !== 'evet') {
    // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
    // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse kayıt tamamlanır.
    return { ok: false, errors: {}, warnings: matches.map(formatBannedMatch) }
  }

  const existing = await getPageBySlug(rawSlug)
  if (existing === null) {
    // Satır tohumdan gelir; yoksa sessizce INSERT etmiyoruz — eksik tohum bir kurulum
    // hatasıdır ve görünmesi gerekir.
    return { ok: false, errors: {}, message: 'Sayfa kaydı bulunamadı; tohum verisi (npm run db:seed) eksik.' }
  }

  await updatePageContent(rawSlug, { title: parsed.data.title, content })

  // İki argümanlı biçim zorunlu (Next 16.3, sözleşme §4.1).
  revalidateTag(TAGS.pages, 'max')
  revalidateTag(pageTag(rawSlug), 'max')
  revalidatePath('/panel/sayfalar')

  // Yönlendirme YOK: yeni kayıt oluşmuyor, kalınacak adres zaten burası. Bildirim
  // EntityForm'un ok-durumu üzerinden basılıyor (bkz. lib/panel-notice.ts gerekçesi).
  return { ok: true, errors: {}, message: 'Sayfa metni kaydedildi.' }
}
```

`src/components/PageContentForm.tsx`:

```tsx
'use client'

import {
  EntityForm, FieldBlock, FieldError, FieldLabel, TextField, useEntityValues, type EntityAction,
} from './EntityForm'
import { PublishChecklist } from './PublishChecklist'
import { RichTextEditor } from './RichTextEditor'

export type PageContentFormValues = {
  slug: string
  title: string
  content: string
}

type PageContentFormProps = {
  action: EntityAction
  values: PageContentFormValues
  secondaryAction?: React.ReactNode
}

// Slug alanı YOK: sabit satırlı tabloda adres düzenlenemez, gizli alanla taşınıyor.
export function PageContentForm({ action, values, secondaryAction }: PageContentFormProps) {
  const { values: form, set } = useEntityValues({ title: values.title })

  return (
    <EntityForm action={action} submitLabel="Kaydet" secondaryAction={secondaryAction}>
      {({ fieldError, state }) => (
        <>
          <input type="hidden" name="slug" value={values.slug} readOnly />

          <TextField
            id="page-title" name="title" label="Başlık"
            value={form.title} onChange={set('title')} error={fieldError('title')}
            hint="Sayfanın en üstündeki başlık ve sekme adı."
          />

          <FieldBlock>
            <FieldLabel>İçerik</FieldLabel>
            <RichTextEditor
              name="content"
              defaultValue={values.content}
              label="İçerik"
              invalid={fieldError('content') ? true : undefined}
              describedBy={fieldError('content') ? 'page-content-error' : undefined}
            />
            {fieldError('content') ? <FieldError id="page-content-error">{fieldError('content')}</FieldError> : null}
          </FieldBlock>

          <PublishChecklist warnings={state.warnings} />
        </>
      )}
    </EntityForm>
  )
}
```

`src/app/panel/sayfalar/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { listPages } from '@/db/queries/pages'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'

export const metadata: Metadata = {
  title: 'Sayfa metinleri',
  robots: { index: false, follow: false },
}

export default async function PagesPage() {
  await requireAccess('pages')
  const pages = await listPages()

  return (
    <>
      <PanelHeading
        title="Sayfa metinleri"
        description="Hakkımızda, KVKK aydınlatma metni ve çerez politikası. Yeni sayfa eklenemez, mevcutlar düzenlenir."
      />

      {pages.length === 0 ? (
        <PanelEmptyState>
          Sayfa kayıtları bulunamadı. Kurulum betiğini çalıştırın: npm run db:seed
        </PanelEmptyState>
      ) : (
        <PanelTable
          label="Sayfa metinleri listesi"
          caption="Sitedeki sabit sayfalar ve son güncelleme zamanları"
          columns={['Başlık', 'Adres', 'Son güncelleme', 'İşlem']}
        >
          {pages.map((page) => (
            <tr key={page.slug}>
              <th scope="row" className={table.nameCell}>
                {page.title}
              </th>
              <td>/{page.slug}</td>
              <td>{formatDateTime(page.updatedAt)}</td>
              <td>
                {/* Erişilebilir ad bağlantının kendisinde: ekran okuyucu kullanıcısı
                    bağlantı listesinde üç kez "Düzenle" duymamalı. */}
                <Link href={`/panel/sayfalar/${page.slug}`} prefetch={false}>
                  Düzenle<span className="visuallyHidden">: {page.title}</span>
                </Link>
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
```

> `visuallyHidden` sınıfının `src/app/globals.css` içinde tanımlı olduğunu **doğrula**
> (`grep -n "visuallyHidden" src/app/globals.css`). Yoksa mevcut panel listelerinde hangi
> yöntem kullanılıyorsa (ör. `aria-label`) onu taklit et; yeni bir sınıf uydurma.

`src/app/panel/sayfalar/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/db/queries/pages'
import { isPageSlug } from '@/db/schema'
import { requireAccess } from '@/lib/auth-guards'
import { PanelActionLink } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PageContentForm } from '@/components/PageContentForm'
import { savePage } from '../actions'

export const metadata: Metadata = {
  title: 'Sayfa metnini düzenle',
  robots: { index: false, follow: false },
}

type EditPageProps = { params: Promise<{ slug: string }> }

export default async function EditPagePage({ params }: EditPageProps) {
  await requireAccess('pages')

  const { slug } = await params
  // Adres kullanıcı verisi; sabit listede olmayan slug forma dönüşmez.
  if (!isPageSlug(slug)) notFound()

  const page = await getPageBySlug(slug)
  if (page === null) notFound()

  return (
    <>
      <PanelHeading title="Sayfa metnini düzenle" description={`Adres: /${slug}`} />

      <PageContentForm
        action={savePage}
        values={{ slug, title: page.title, content: page.content }}
        secondaryAction={<PanelActionLink href="/panel/sayfalar">Listeye dön</PanelActionLink>}
      />
    </>
  )
}
```

`src/app/panel/sayfalar/page.module.css`: `src/app/panel/kategoriler/page.module.css`
dosyasını oku; bu listede ek bir bölüm başlığı olmadığı için **yeni sınıf gerekmiyorsa dosyayı
hiç oluşturma** (yer tutucu dosya bırakma).

`src/components/PanelNav.tsx` — `PANEL_LINKS` dizisine, `kategoriler` satırından sonra:

```ts
  { href: '/panel/sayfalar', label: 'Sayfa Metinleri', resource: 'pages' },
```

- [ ] **Adım 11: Doğrulama**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit
npm run lint
npm test
npm run build
```
Beklenen: hepsi yeşil. `npm test` içinde `src/lib/panel-action-guards.test.ts` yeni
`sayfalar/actions.ts` dosyasını da tarar ve `savePage`'in `requireAccess` çağırdığını görür;
`taranacak actions.ts dosyalarını bulur` testi de artmış sayıyla geçer.

FULLTEXT indeksinin gerçekten yeniden kurulduğunu veritabanına sorarak doğrula:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
cat > /tmp/plan3/index-sonda.mjs <<'EOF'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
Object.assign(process.env, parseEnv(readFileSync('.env.local', 'utf8')))
const mysql = (await import('mysql2/promise')).default
const c = await mysql.createConnection(process.env.DATABASE_URL)
const [rows] = await c.query("SHOW INDEX FROM articles WHERE Key_name = 'articles_fulltext_idx'")
console.log(rows.map((r) => `${r.Seq_in_index}:${r.Column_name}`).join(' '))
await c.end()
EOF
node /tmp/plan3/index-sonda.mjs
```
Beklenen çıktı: `1:title 2:excerpt 3:search_text` — `content` **geçmiyor**.

- [ ] **Adım 12: Spec §13'e açık madde ekle**

`docs/superpowers/specs/2026-08-18-tolga-akil-hukuk-sitesi-design.md` §13 tablosuna, mevcut
son satırdan sonra:

```markdown
| KVKK aydınlatma metni ve çerez politikası gerçek içeriği (`pages` tablosunda bugün yer tutucu duruyor) | Müşteri + barosu | **Yayına almadan önce — zorunlu** |
```

- [ ] **Adım 13: Mutasyon kanıtı**

`src/db/queries/pages.ts` içinde `updatePageContent`'in `where` koşulunu düşür:

```ts
  await db.update(pages).set(values)
```
Beklenen: `npm test -- src/db/queries/pages.test.ts` → KIRMIZI, "içeriği günceller ve yeni
satır AÇMAZ" testi düşer (üç satırın hepsi güncellenir; `listPages` sırası testi de bozulur).
`where(eq(pages.slug, slug))` geri konur, yeşile döndüğü görülür.

İkinci mutasyon — geri doldurmanın gerçekten çalıştığını kanıtlar: `src/db/schema.ts` içinde
`searchText: text('search_text')` satırını yorum satırına al, `npx tsc --noEmit` çalıştır.
Beklenen: `scripts/backfill-search-text.mts` ve `makaleler/actions.ts` derlenmez. Geri al.

- [ ] **Adım 14: Commit**

```bash
git add src/db/schema.ts drizzle/ src/db/queries/pages.ts src/db/queries/public/pages.ts \
  src/db/queries/pages.test.ts src/db/seed.ts scripts/backfill-search-text.mts package.json \
  src/app/panel/makaleler/actions.ts src/lib/permissions.ts src/lib/permissions.test.ts \
  src/lib/validation.ts src/app/panel/sayfalar/ src/components/PageContentForm.tsx \
  src/components/PanelNav.tsx docs/superpowers/specs/
git commit -m "feat: sabit sayfa metinleri tablosu ve düz metin arama sütunu

pages tablosu (hakkimizda, kvkk, cerez-politikasi) eklendi: sabit satırlı, panelden yalnız
düzenlenir. Hukuki metinler ÜRETİLMEDİ; tohum yer tutucu yazıyor ve gerçek metin spec §13'e
açık madde olarak eklendi.

articles.search_text eklendi ve FULLTEXT indeksi (title, excerpt, content) yerine
(title, excerpt, search_text) olarak yeniden kuruldu: indeks HTML'i kapsıyordu ve etiket
adları terim olarak indeksleniyordu. Mevcut satırlar için idempotent geri doldurma betiği
yazıldı (npm run db:backfill-search).

Doğrulama: npx tsc --noEmit, npm run lint, npm test, npm run build, SHOW INDEX sondası."
```

- [ ] **Adım 15: Yasaklı makale slug'ı — kırmızı testi yaz**

**Neden burada:** Sözleşme §4 çakışma uyarısı. `/makaleler/kategori/[slug]` statik segmenti
`/makaleler/[slug]`'i önceliyor; slug'ı `kategori` olan bir makale ÇÖKMEZ, sessizce
**erişilemez** olur. Görünmezlik hata mesajından beterdir: avukat yazıyı yayımlar, panelde
"yayımlandı" görür, adres kategori arşivini açar. Kural doğrulamaya konmadan Görev 3
başlamaz — halka açık sorgu katmanı bu slug'ı zaten yayımlanmış olarak döndürecektir.

`src/lib/validation.test.ts` — `articleSchema` describe bloğunun sonuna:

```ts
  // /makaleler/kategori/[slug] statik segmenti /makaleler/[slug]'i önceler; bu slug'lı
  // makale 404 bile vermez, sessizce kategori arşivini açar (sözleşme §4).
  it('kategori slug\'ını reddeder', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, slug: 'kategori' })
    expect(sonuc.success).toBe(false)
    expect(toFormState(sonuc.error!).errors.slug).toContain(
      'Bu adres kategori arşivi için ayrılmıştır; başka bir slug yazın.',
    )
  })

  // Kural TAM EŞLEŞME olmalı. "kategori" ile başlayan her şeyi yasaklayan bir sürüm,
  // "kategoriler-arasi-fark" gibi meşru başlıkları da reddedip içerik kaybettirirdi.
  it('yasaklı slug\'a benzeyen değerleri kabul eder', () => {
    for (const slug of ['kategoriler', 'kategori-secimi', 'alt-kategori']) {
      const sonuc = articleSchema.safeParse({ ...gecerliMakale, slug })
      expect(sonuc.success, `slug=${slug} kabul edilmeliydi`).toBe(true)
    }
  })
```

- [ ] **Adım 16: Testin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/validation.test.ts
```
Beklenen: FAIL — `kategori slug'ını reddeder` düşer (`success` `true` gelir; bugün hiçbir
kural bu slug'ı engellemiyor). İkinci test bu noktada zaten yeşildir; kuralın aşırı geniş
yazılmasına karşı bekçidir.

- [ ] **Adım 17: Uygulamayı yaz**

Önce `src/lib/validation.ts` dosyasını oku: mevcut zod deseni (`z.object(...).transform(...)
.superRefine(...)`), `requireSlug` yardımcısı ve Türkçe hata mesajı biçimi taklit edilir;
yeni bir doğrulama üslubu getirilmez.

`requireSlug` tanımından hemen sonra:

```ts
// Rota segmentiyle çakışan slug'lar. Liste TAM EŞLEŞME ile karşılaştırılır: "kategoriler"
// gibi yalnızca benzeyen bir slug'ın çakışması yok, onu da yasaklamak içerik kaybettirir.
export const RESERVED_ARTICLE_SLUGS = ['kategori'] as const

function rejectReservedSlug(slug: string, ctx: z.RefinementCtx): void {
  if ((RESERVED_ARTICLE_SLUGS as readonly string[]).includes(slug)) {
    ctx.addIssue({
      code: 'custom',
      path: ['slug'],
      // Neden yasak olduğu yazılıyor: kullanıcı keyfî bir kısıt değil, adres çakışması
      // gördüğünü anlasın ve başka bir slug seçsin.
      message: 'Bu adres kategori arşivi için ayrılmıştır; başka bir slug yazın.',
    })
  }
}
```

`articleSchema`'nın `superRefine` gövdesinde, `requireSlug` çağrısının hemen altına:

```ts
    rejectReservedSlug(v.slug, ctx)
```

Kontrol `transform`'dan SONRA çalışır; yani elle girilen `Kategori` de `slugify` ile
`kategori` olduktan sonra yakalanır, büyük harfle yazarak kural atlatılamaz.

- [ ] **Adım 18: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/validation.test.ts && npx tsc --noEmit && npm run lint
```
Beklenen: üçü de PASS.

- [ ] **Adım 19: Mutasyon kanıtı**

1. `rejectReservedSlug` içindeki `.includes(slug)` koşulu `if (false)` yapılır.
   Beklenen kırmızı: `kategori slug'ını reddeder`. Geri al.
2. Aynı koşul tam eşleşme yerine ön ek eşleşmesine çevrilir:
   `(RESERVED_ARTICLE_SLUGS as readonly string[]).some((r) => slug.startsWith(r))`.
   Beklenen kırmızı: `yasaklı slug'a benzeyen değerleri kabul eder` (`kategoriler`
   reddedilir). Geri al — bu, kuralın gereğinden geniş olmadığını kanıtlar.

- [ ] **Adım 20: Commit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "fix: kategori slug'ı makalelere yasaklandı

/makaleler/kategori/[slug] statik segmenti /makaleler/[slug]'i öncelediği için slug'ı
kategori olan makale hata vermeden erişilemez kalıyordu (sözleşme §4). Kural TAM EŞLEŞME:
kategoriler, alt-kategori gibi slug'lar kabul edilmeye devam ediyor.

Doğrulama: npm test -- src/lib/validation.test.ts, npx tsc --noEmit, npm run lint.
Mutasyon kanıtı: koşul kapatıldı (yasak test kırmızı), koşul startsWith'e genişletildi
(aşırı genişlik testi kırmızı), ikisi de geri alındı."
```

---

### Görev 3: Halka açık sorgu katmanı

Sözleşme §3.1–§3.5'teki imzalar **birebir** uygulanır. Bu katman panel sorgularını
**çağırmaz**: panel sorguları taslakları da döndürüyor ve halka açık tarafa bağlanırlarsa
ileride oraya eklenen bir alan sessizce yayına sızar.

**Dosyalar:**
- Oluştur: `src/db/queries/public/articles.ts` + `articles.test.ts`
- Oluştur: `src/db/queries/public/categories.ts` + `categories.test.ts`
- Oluştur: `src/db/queries/public/lawyers.ts` + `lawyers.test.ts`
- Oluştur: `src/db/queries/public/practice-areas.ts` + `practice-areas.test.ts`

**Arayüzler:**
- Tüketir: `articles.searchText` sütunu ve `(title, excerpt, search_text)` FULLTEXT indeksi
  (Görev 2). `db` (`@/db/client`), şema tabloları.
- Üretir: sözleşme §3.1–§3.4'teki bütün tipler ve fonksiyonlar. Görev 4+ sayfaları yalnız
  bunları çağırır ve önbelleği **kendi** sınırında kurar (Görev 1 Adım 10 kalıbı).

**Bağlayıcı notlar:**
- Fonksiyonlara `'use cache'` **konmaz** (gerekçe Görev 1 Adım 10).
- Hiçbir sorgu `try/catch` ile hata yutmaz.
- `coverPath` / `photoPath` **ham göreli yoldur** (`2026/08/<özet>.webp`); adrese çeviren
  `mediaUrl()` bileşen tarafındadır.

---

- [ ] **Adım 1: Kırmızı testleri yaz**

`src/db/queries/public/articles.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { articles, categories, lawyers } from '@/db/schema'
import {
  ARTICLES_PER_PAGE, getPublishedArticleBySlug, listArticleFeedEntries, listLatestArticles,
  listPublishedArticles, toBooleanModeTerm,
} from './articles'

// FK sırası: articles önce (author_id/category_id kısıtları RESTRICT).
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

async function kategoriEkle(slug: string, ad: string): Promise<number> {
  const [sonuc] = await db.insert(categories).values({ slug, name: ad })
  return sonuc.insertId
}

type MakaleGirdi = {
  slug: string
  baslik?: string
  ozet?: string
  icerik?: string
  arama?: string | null
  durum?: 'draft' | 'published'
  yayin?: Date | null
  kategoriId?: number | null
}

// Tarihler açıkça veriliyor: sütun varsayılanı aynı saniyeye düşebiliyor ve "en yenisi"
// iddiası rastgeleleşirdi (queries/messages.test.ts ile aynı gerekçe).
async function makaleEkle(girdi: MakaleGirdi) {
  await db.insert(articles).values({
    slug: girdi.slug,
    title: girdi.baslik ?? 'Kira Tespit Davası',
    excerpt: girdi.ozet ?? 'Kira bedelinin tespiti için açılan davanın aşamaları.',
    content: girdi.icerik ?? '<p>Gövde metni.</p>',
    searchText: girdi.arama === undefined ? 'Gövde metni.' : girdi.arama,
    status: girdi.durum ?? 'published',
    publishedAt: girdi.yayin === undefined ? new Date(Date.UTC(2026, 0, 1)) : girdi.yayin,
    categoryId: girdi.kategoriId ?? null,
  })
}

describe('listPublishedArticles — yayımlanmışlık yüklemi', () => {
  it('taslak makaleyi DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'taslak', durum: 'draft' })
    const sonuc = await listPublishedArticles({})
    expect(sonuc.items).toHaveLength(0)
    expect(sonuc.total).toBe(0)
  })

  // "Yayında" işaretli ama tarihi boş kayıt: Plan 2'de status yayına alınıp publishedAt
  // atanmadan kaydedilmiş bir satır teoride mümkün ve sıralaması belirsiz olurdu.
  it('published_at NULL olan makaleyi DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'tarihsiz', durum: 'published', yayin: null })
    expect((await listPublishedArticles({})).items).toHaveLength(0)
  })

  // İleri tarihli yayın: avukat metni bugün yazıp gelecek haftaya kurabilmeli ve o tarihe
  // kadar adres 404 vermeli.
  it('gelecek tarihli makaleyi DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'gelecek', yayin: new Date(Date.now() + 86_400_000) })
    expect((await listPublishedArticles({})).items).toHaveLength(0)
  })

  it('yayımlanmış makaleyi kartı doldurarak döndürür', async () => {
    const kategoriId = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    await makaleEkle({ slug: 'kira-tespit', kategoriId })

    const [kart] = (await listPublishedArticles({})).items
    expect(kart.slug).toBe('kira-tespit')
    expect(kart.categoryName).toBe('Kira Hukuku')
    expect(kart.categorySlug).toBe('kira-hukuku')
    expect(kart.publishedAt).toBeInstanceOf(Date)
    expect(kart.coverPath).toBeNull()
  })
})

describe('listPublishedArticles — sayfalama', () => {
  it('sayfa boyutunu aşmaz ve pageCount hesaplar', async () => {
    for (let i = 0; i < ARTICLES_PER_PAGE + 2; i += 1) {
      await makaleEkle({ slug: `makale-${i}`, yayin: new Date(Date.UTC(2026, 0, 1, 0, i)) })
    }
    const ilk = await listPublishedArticles({ page: 1 })
    expect(ilk.items).toHaveLength(ARTICLES_PER_PAGE)
    expect(ilk.total).toBe(ARTICLES_PER_PAGE + 2)
    expect(ilk.pageCount).toBe(2)

    const ikinci = await listPublishedArticles({ page: 2 })
    expect(ikinci.items).toHaveLength(2)
  })

  // ?sayfa=0, ?sayfa=-3, ?sayfa=abc → hepsi adres çubuğundan gelebilir. Hata sayfası değil,
  // ilk sayfa gösterilmeli.
  it.each([0, -3, 1.5, Number.NaN])('geçersiz sayfa değeri %s ilk sayfaya çekilir', async (deger) => {
    await makaleEkle({ slug: 'tek' })
    expect((await listPublishedArticles({ page: deger })).page).toBe(1)
  })

  // Kayıt yokken bile bölme sonucu 0 olmamalı: "1 / 0" yazan bir sayfalama çizilirdi.
  it('hiç kayıt yokken pageCount en az 1', async () => {
    expect((await listPublishedArticles({})).pageCount).toBe(1)
  })
})

describe('toBooleanModeTerm', () => {
  // Temizlenmezse MariaDB "syntax error" fırlatır ve kullanıcı arama kutusuna ")" yazdığı
  // için hata sayfası görür.
  it('boolean mode özel karakterlerini atar', () => {
    expect(toBooleanModeTerm('+kira -tespit* (x) ~y "z" @w >a <b')).toBe('kira tespit x y z w a b')
  })

  it('yalnız özel karakterden oluşan girdide boş dize döndürür', () => {
    expect(toBooleanModeTerm('  +*~()  ')).toBe('')
  })
})

describe('listPublishedArticles — arama', () => {
  it('search_text içindeki kelimeyi bulur', async () => {
    await makaleEkle({ slug: 'bulunacak', arama: 'ihtarname gönderme usulü anlatılıyor' })
    await makaleEkle({ slug: 'bulunmayacak', arama: 'velayet düzenlemesi anlatılıyor' })

    const sonuc = await listPublishedArticles({ q: 'ihtarname' })
    expect(sonuc.items.map((i) => i.slug)).toEqual(['bulunacak'])
  })

  // Görev 2'nin asıl gerekçesi: indeks artık HTML'i kapsamıyor.
  it('HTML etiket adı arandığında sonuç DÖNMEZ', async () => {
    await makaleEkle({ slug: 'kalin', icerik: '<p><strong>Kalın</strong> metin.</p>', arama: 'Kalın metin.' })
    expect((await listPublishedArticles({ q: 'strong' })).items).toHaveLength(0)
  })

  it('arama sonucunda TASLAK makale DÖNMEZ', async () => {
    await makaleEkle({ slug: 'taslak-ihtar', durum: 'draft', arama: 'ihtarname gönderme usulü' })
    expect((await listPublishedArticles({ q: 'ihtarname' })).items).toHaveLength(0)
  })

  // Sözdizimi hatası fırlatmamalı; sonuç boş olabilir ama süreç ayakta kalmalı.
  it('yalnız özel karakterden oluşan arama süzgeci uygulamaz', async () => {
    await makaleEkle({ slug: 'tek' })
    expect((await listPublishedArticles({ q: '+*~()' })).items).toHaveLength(1)
  })
})

describe('listPublishedArticles — kategori süzgeci', () => {
  it('yalnız o kategorinin makalelerini döndürür', async () => {
    const kira = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    const aile = await kategoriEkle('aile-hukuku', 'Aile Hukuku')
    await makaleEkle({ slug: 'kira-1', kategoriId: kira })
    await makaleEkle({ slug: 'aile-1', kategoriId: aile })

    const sonuc = await listPublishedArticles({ categorySlug: 'kira-hukuku' })
    expect(sonuc.items.map((i) => i.slug)).toEqual(['kira-1'])
    expect(sonuc.total).toBe(1)
  })

  it('kategori süzgecinde de TASLAK DÖNMEZ', async () => {
    const kira = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    await makaleEkle({ slug: 'kira-taslak', durum: 'draft', kategoriId: kira })
    expect((await listPublishedArticles({ categorySlug: 'kira-hukuku' })).items).toHaveLength(0)
  })
})

describe('getPublishedArticleBySlug', () => {
  it('taslak makale için null döndürür — taslak adresi 404 olmalı', async () => {
    await makaleEkle({ slug: 'gizli-taslak', durum: 'draft' })
    expect(await getPublishedArticleBySlug('gizli-taslak')).toBeNull()
  })

  it('yayımlanmış makalenin yazarını ve kategorisini birlikte döndürür', async () => {
    const kategoriId = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    const [avukat] = await db.insert(lawyers).values({
      slug: 'tolga-akil', fullName: 'Tolga Akıl', title: 'Avukat', isPublished: true, sortOrder: 0,
    })
    await db.insert(articles).values({
      slug: 'kira-tespit', title: 'Kira Tespit Davası', excerpt: 'Özet metni burada duruyor.',
      content: '<p>Gövde.</p>', searchText: 'Gövde.', status: 'published',
      publishedAt: new Date(Date.UTC(2026, 0, 1)), categoryId: kategoriId, authorId: avukat.insertId,
    })

    const makale = await getPublishedArticleBySlug('kira-tespit')
    expect(makale?.authorName).toBe('Tolga Akıl')
    expect(makale?.authorSlug).toBe('tolga-akil')
    expect(makale?.categoryName).toBe('Kira Hukuku')
    expect(makale?.content).toBe('<p>Gövde.</p>')
    expect(makale?.updatedAt).toBeInstanceOf(Date)
  })

  it('olmayan slug için null döndürür', async () => {
    expect(await getPublishedArticleBySlug('yok-boyle-bir-sey')).toBeNull()
  })
})

describe('listLatestArticles / listArticleFeedEntries', () => {
  it('en yeniden eskiye sıralar ve sınırı aşmaz', async () => {
    for (const dakika of [1, 2, 3]) {
      await makaleEkle({ slug: `m-${dakika}`, yayin: new Date(Date.UTC(2026, 0, 1, 0, dakika)) })
    }
    expect((await listLatestArticles(2)).map((a) => a.slug)).toEqual(['m-3', 'm-2'])
  })

  it('listLatestArticles TASLAK DÖNDÜRMEZ', async () => {
    await makaleEkle({ slug: 'taslak', durum: 'draft' })
    expect(await listLatestArticles(5)).toHaveLength(0)
  })

  // Sessizce boş liste döndürmek yerine gürültü: çağıran kod hatası kullanıcıya "makale yok"
  // olarak görünmemeli.
  it('geçersiz limit ile çağrılırsa fırlatır', async () => {
    await expect(listLatestArticles(0)).rejects.toThrow()
  })

  it('listArticleFeedEntries yalnız yayımlanmışları verir', async () => {
    await makaleEkle({ slug: 'yayin', yayin: new Date(Date.UTC(2026, 0, 2)) })
    await makaleEkle({ slug: 'taslak', durum: 'draft' })
    expect((await listArticleFeedEntries()).map((a) => a.slug)).toEqual(['yayin'])
  })
})
```

`src/db/queries/public/categories.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { articles, categories } from '@/db/schema'
import { getPublicCategoryBySlug, listPublicCategories } from './categories'

async function temizle() {
  await db.delete(articles)
  await db.delete(categories)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

async function kategoriEkle(slug: string, ad: string, aciklama?: string): Promise<number> {
  const [sonuc] = await db.insert(categories).values({ slug, name: ad, description: aciklama ?? null })
  return sonuc.insertId
}

async function makaleEkle(slug: string, kategoriId: number, durum: 'draft' | 'published') {
  await db.insert(articles).values({
    slug, title: 'Başlık metni', excerpt: 'Özet metni burada duruyor ve yeterince uzun.',
    content: '<p>Gövde.</p>', searchText: 'Gövde.', status: durum,
    publishedAt: durum === 'published' ? new Date(Date.UTC(2026, 0, 1)) : null,
    categoryId: kategoriId,
  })
}

describe('listPublicCategories', () => {
  it('yayımlanmış makale sayısını verir', async () => {
    const id = await kategoriEkle('kira-hukuku', 'Kira Hukuku', 'Kira uyuşmazlıkları.')
    await makaleEkle('a', id, 'published')
    await makaleEkle('b', id, 'published')

    const [kategori] = await listPublicCategories()
    expect(kategori.articleCount).toBe(2)
    expect(kategori.description).toBe('Kira uyuşmazlıkları.')
  })

  // Boş bir arşiv sayfasına giden bağlantı üretilmemeli (sözleşme §3.2).
  it('hiç makalesi olmayan kategoriyi LİSTELEMEZ', async () => {
    await kategoriEkle('bos-kategori', 'Boş Kategori')
    expect(await listPublicCategories()).toHaveLength(0)
  })

  it('yalnız TASLAK makalesi olan kategoriyi LİSTELEMEZ', async () => {
    const id = await kategoriEkle('taslak-kategori', 'Taslak Kategori')
    await makaleEkle('taslak', id, 'draft')
    expect(await listPublicCategories()).toHaveLength(0)
  })

  it('taslakları saymaz', async () => {
    const id = await kategoriEkle('karisik', 'Karışık')
    await makaleEkle('yayin', id, 'published')
    await makaleEkle('taslak', id, 'draft')
    expect((await listPublicCategories())[0].articleCount).toBe(1)
  })
})

describe('getPublicCategoryBySlug', () => {
  it('olmayan slug için null döndürür', async () => {
    expect(await getPublicCategoryBySlug('yok')).toBeNull()
  })

  it('sayımda taslakları hesaba katmaz', async () => {
    const id = await kategoriEkle('kira-hukuku', 'Kira Hukuku')
    await makaleEkle('yayin', id, 'published')
    await makaleEkle('taslak', id, 'draft')
    expect((await getPublicCategoryBySlug('kira-hukuku'))?.articleCount).toBe(1)
  })
})
```

`src/db/queries/public/lawyers.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { articles, lawyers } from '@/db/schema'
import { getPublicLawyerBySlug, listPublicLawyers } from './lawyers'

async function temizle() {
  await db.delete(articles)
  await db.delete(lawyers)
}

beforeEach(temizle)
afterAll(async () => {
  await temizle()
  await closeDb()
})

async function avukatEkle(slug: string, ad: string, yayinda: boolean, sira = 0) {
  await db.insert(lawyers).values({
    slug, fullName: ad, title: 'Avukat', isPublished: yayinda, sortOrder: sira,
    practiceStartDate: '2010-03-15', bio: '<p>Özgeçmiş.</p>', email: 'a@ornek.test',
  })
}

describe('listPublicLawyers', () => {
  it('yayımlanmamış avukatı DÖNDÜRMEZ', async () => {
    await avukatEkle('gizli', 'Gizli Kişi', false)
    expect(await listPublicLawyers()).toHaveLength(0)
  })

  it('sort_order, sonra full_name sırasına uyar', async () => {
    await avukatEkle('c', 'Cem Yılmaz', true, 1)
    await avukatEkle('b', 'Berk Öz', true, 0)
    await avukatEkle('a', 'Ayşe Şahin', true, 0)

    expect((await listPublicLawyers()).map((l) => l.slug)).toEqual(['a', 'b', 'c'])
  })
})

describe('getPublicLawyerBySlug', () => {
  it('yayımlanmamış avukat için null döndürür', async () => {
    await avukatEkle('gizli', 'Gizli Kişi', false)
    expect(await getPublicLawyerBySlug('gizli')).toBeNull()
  })

  // Sütun mode:'string'; TZ=America/New_York altında Date'e çevrilseydi bir gün geriye kayardı.
  it('mesleğe başlama tarihini DİZE olarak taşır', async () => {
    await avukatEkle('tolga-akil', 'Tolga Akıl', true)
    const avukat = await getPublicLawyerBySlug('tolga-akil')
    expect(avukat?.practiceStartDate).toBe('2010-03-15')
    expect(avukat?.bio).toBe('<p>Özgeçmiş.</p>')
    expect(avukat?.photoPath).toBeNull()
  })

  it('olmayan slug için null döndürür', async () => {
    expect(await getPublicLawyerBySlug('yok')).toBeNull()
  })
})
```

`src/db/queries/public/practice-areas.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, closeDb } from '@/db/client'
import { practiceAreas } from '@/db/schema'
import { getPublicPracticeAreaBySlug, listPublicPracticeAreas } from './practice-areas'

beforeEach(async () => {
  await db.delete(practiceAreas)
})

afterAll(async () => {
  await db.delete(practiceAreas)
  await closeDb()
})

async function alanEkle(slug: string, ad: string, yayinda: boolean, sira = 0, icerik: string | null = null) {
  await db.insert(practiceAreas).values({
    slug, name: ad, summary: 'Bu alanın kapsamını anlatan yeterince uzun bir özet.',
    content: icerik, isPublished: yayinda, sortOrder: sira,
  })
}

describe('listPublicPracticeAreas', () => {
  it('yayımlanmamış alanı DÖNDÜRMEZ', async () => {
    await alanEkle('gizli', 'Gizli Alan', false)
    expect(await listPublicPracticeAreas()).toHaveLength(0)
  })

  it('sort_order, sonra name sırasına uyar', async () => {
    await alanEkle('ticaret', 'Ticaret Hukuku', true, 1)
    await alanEkle('is', 'İş Hukuku', true, 0)
    await alanEkle('aile', 'Aile Hukuku', true, 0)

    expect((await listPublicPracticeAreas()).map((a) => a.slug)).toEqual(['aile', 'is', 'ticaret'])
  })

  // Sözleşme §2: bileşen prop tipi { slug, name, summary } — kart bunun dışında alan almaz.
  it('kart yalnız slug, name ve summary taşır', async () => {
    await alanEkle('aile', 'Aile Hukuku', true, 0, '<p>Uzun içerik.</p>')
    expect(Object.keys((await listPublicPracticeAreas())[0]).sort()).toEqual(['name', 'slug', 'summary'])
  })
})

describe('getPublicPracticeAreaBySlug', () => {
  it('yayımlanmamış alan için null döndürür', async () => {
    await alanEkle('gizli', 'Gizli Alan', false)
    expect(await getPublicPracticeAreaBySlug('gizli')).toBeNull()
  })

  it('içeriği olmayan alanda content null döner', async () => {
    await alanEkle('aile', 'Aile Hukuku', true)
    expect((await getPublicPracticeAreaBySlug('aile'))?.content).toBeNull()
  })

  it('olmayan slug için null döndürür', async () => {
    expect(await getPublicPracticeAreaBySlug('yok')).toBeNull()
  })
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/db/queries/public
```
Beklenen: FAIL — dört dosyada da `Failed to load url ./articles` (ve benzerleri); modüller yok.

- [ ] **Adım 3: `src/db/queries/public/articles.ts`**

```ts
import { and, asc, count, desc, eq, isNotNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, categories, lawyers, media } from '@/db/schema'

export type PublicArticleCard = {
  slug: string
  title: string
  excerpt: string
  publishedAt: Date
  categoryName: string | null
  categorySlug: string | null
  coverPath: string | null
  coverAlt: string | null
}

export type PublicArticleDetail = {
  slug: string
  title: string
  excerpt: string
  content: string
  publishedAt: Date
  updatedAt: Date
  metaTitle: string | null
  metaDescription: string | null
  categoryName: string | null
  categorySlug: string | null
  authorName: string | null
  authorSlug: string | null
  coverPath: string | null
  coverAlt: string | null
}

export type ArticlePage = {
  items: PublicArticleCard[]
  total: number
  page: number
  pageCount: number
}

export type ArticleQuery = {
  q?: string
  categorySlug?: string
  page?: number
}

export const ARTICLES_PER_PAGE = 9

/**
 * Yayımlanmışlık yüklemi — TEK TANIM.
 *
 * Üç koşul birlikte gerekiyor: `status` yayına alınmış, tarih atanmış ve tarih geçmiş
 * olmalı. İkinci koşul olmadan tarihi boş bir satır sıralamada belirsiz yere düşer;
 * üçüncüsü olmadan ileri tarihli yayın hemen görünür.
 *
 * NOW() güvenli: havuzdaki her bağlantı SET time_zone = '+00:00' alıyor (db/client.ts),
 * yani sunucu dilimi ne olursa olsun karşılaştırma UTC'de yapılıyor.
 *
 * `and(...)` `SQL | undefined` döndürüyor; hem `.where()` hem iç içe `and()` bu tipi kabul
 * ettiği için cast gerekmiyor. Nesne değişmez, yeniden kullanılabilir.
 */
const publishedPredicate = and(
  eq(articles.status, 'published'),
  isNotNull(articles.publishedAt),
  lte(articles.publishedAt, sql`NOW()`),
)

// Kart ve ayrıntı sorgularının ortak gövdesi; kapak görseli media'dan geliyor.
const cardColumns = {
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  publishedAt: articles.publishedAt,
  categoryName: categories.name,
  categorySlug: categories.slug,
  // HAM göreli yol (2026/08/<özet>.webp). Adrese çeviren mediaUrl() bileşen tarafında:
  // sorgu katmanı sunum biçimi üretmemeli.
  coverPath: media.path,
  coverAlt: media.altText,
}

/**
 * Yüklem NULL'ları eliyor ama tip sistemi bunu bilemez.
 *
 * Sessiz bir cast yerine gerçek denetim: yüklem ileride bozulursa hata burada gürültüyle
 * çıksın, `undefined.toISOString()` olarak sayfanın ortasında değil.
 */
function requirePublishedAt(row: { slug: string; publishedAt: Date | null }): Date {
  if (row.publishedAt === null) {
    throw new Error(`Yayımlanmış sayılan "${row.slug}" makalesinin published_at değeri boş.`)
  }
  return row.publishedAt
}

function toCard(row: { publishedAt: Date | null } & Omit<PublicArticleCard, 'publishedAt'>): PublicArticleCard {
  return { ...row, publishedAt: requirePublishedAt(row) }
}

// MariaDB BOOLEAN MODE operatörleri. Temizlenmezse kullanıcının kutuya yazdığı bir ")"
// sorguyu sözdizimi hatasıyla düşürür ve arama sayfası hata sınırına gider.
const BOOLEAN_MODE_OPERATORS = /[+\-><()~*"@]/g

/**
 * Kullanıcı girdisini BOOLEAN MODE'a güvenli hâle getirir.
 *
 * Operatörler ATILIYOR, kaçırılmıyor: kaçırma yolu MariaDB'de güvenilir değil ve avukatın
 * müvekkiline sunduğu arama kutusunda "+" ile öncelik vermek gibi bir gereksinim yok.
 * Değerin kendisi sorguya PARAMETRE olarak gidiyor (dizeye gömülmüyor); bu temizlik
 * enjeksiyona karşı değil, SÖZDİZİMİ hatasına karşı.
 *
 * Bilinen sınır: innodb_ft_min_token_size = 3, yani "iş" gibi iki harfli terimler
 * indekste yok ve sonuç döndürmez. Bu sunucu ayarıdır, sorgu düzeltemez.
 */
export function toBooleanModeTerm(raw: string): string {
  return raw.replace(BOOLEAN_MODE_OPERATORS, ' ').replace(/\s+/g, ' ').trim()
}

// MATCH sütun listesi FULLTEXT indeksinin sütun listesiyle BİREBİR aynı olmak zorunda
// (Görev 2: title, excerpt, search_text); farklı olsaydı MariaDB indeksi kullanamaz ve
// "Can't find FULLTEXT index matching the column list" derdi.
function matchExpression(term: string) {
  return sql`MATCH (${articles.title}, ${articles.excerpt}, ${articles.searchText}) AGAINST (${term} IN BOOLEAN MODE)`
}

// ?sayfa= adres çubuğundan geliyor: 0, -3, 1.5 ve NaN hepsi mümkün. Hata değil, ilk sayfa.
function normalizePage(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value) || value < 1) return 1
  return value
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran sunucu bileşeni error.tsx sınırına
// düşsün, sayfa sessizce "makale yok" göstermesin (spec §11).
export async function listPublishedArticles(query: ArticleQuery): Promise<ArticlePage> {
  const filters = [publishedPredicate]

  const term = query.q === undefined ? '' : toBooleanModeTerm(query.q)
  if (term !== '') filters.push(matchExpression(term))
  if (query.categorySlug !== undefined && query.categorySlug !== '') {
    filters.push(eq(categories.slug, query.categorySlug))
  }
  const where = and(...filters)

  // Toplam ayrı sorgu: LIMIT'li sorgudan sayfa sayısı çıkarılamaz. media join'i burada YOK,
  // sayıma katkısı olmadığı için gereksiz.
  const [toplam] = await db
    .select({ total: count() })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(where)

  const total = toplam.total
  const pageCount = Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE))
  // Elle yazılmış ?sayfa=99 boş bir liste değil, son sayfayı göstermeli.
  const page = Math.min(normalizePage(query.page), pageCount)

  const rows = await db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(where)
    // İkincil anahtar slug: aynı saniyede yayımlanan iki makalenin sırası sayfalar arasında
    // değişirse bir kayıt iki sayfada birden çıkar ya da hiç çıkmaz.
    .orderBy(desc(articles.publishedAt), asc(articles.slug))
    .limit(ARTICLES_PER_PAGE)
    .offset((page - 1) * ARTICLES_PER_PAGE)

  return { items: rows.map(toCard), total, page, pageCount }
}

/** Yayımlanmamış makale için null döner — taslak adresi 404 olmalıdır. */
export async function getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      content: articles.content,
      updatedAt: articles.updatedAt,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
      authorName: lawyers.fullName,
      authorSlug: lawyers.slug,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    // leftJoin: yazarı atanmamış makale de yayımlanabiliyor (schema'da author_id nullable).
    .leftJoin(lawyers, eq(articles.authorId, lawyers.id))
    .where(and(publishedPredicate, eq(articles.slug, slug)))

  if (row === undefined) return null
  return { ...row, publishedAt: requirePublishedAt(row) }
}

/** Ana sayfa şeridi. */
export async function listLatestArticles(limit: number): Promise<PublicArticleCard[]> {
  // Çağıranın hatası sessizce "makale yok" olarak görünmemeli.
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`listLatestArticles pozitif tam sayı bekliyor; gelen: ${limit}`)
  }

  const rows = await db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(publishedPredicate)
    .orderBy(desc(articles.publishedAt), asc(articles.slug))
    .limit(limit)

  return rows.map(toCard)
}

/**
 * sitemap ve RSS için; tüm yayımlanmış makaleler, en yeni önce.
 *
 * LIMIT bilinçli olarak YOK: eksik bir sitemap sessizce arama motoruna yanlış bilgi verir ve
 * bu, listenin uzamasından daha pahalıdır. Bir büronun makale sayısı üç haneli mertebede
 * kalıyor; bu varsayım bozulursa besleme sayfalanmalıdır.
 */
export async function listArticleFeedEntries(): Promise<PublicArticleCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(media, eq(articles.coverMediaId, media.id))
    .where(publishedPredicate)
    .orderBy(desc(articles.publishedAt), asc(articles.slug))

  return rows.map(toCard)
}
```

- [ ] **Adım 4: `src/db/queries/public/categories.ts`**

```ts
import { and, asc, count, eq, isNotNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { articles, categories } from '@/db/schema'

export type PublicCategory = {
  slug: string
  name: string
  description: string | null
  articleCount: number
}

// Yüklem articles/public/articles.ts ile aynı üç koşul. İkinci kez yazılmasının tek nedeni
// modüller arası bağımlılık kurmamak; koşullardan biri değişirse İKİSİ birlikte değişir.
// (Tek dosyaya taşımak da mümkün ama o dosya iki tarafın da import ettiği üçüncü bir modül
// olurdu ve kazancı yok — koşul üç satır.)
const publishedArticleJoin = and(
  eq(articles.categoryId, categories.id),
  eq(articles.status, 'published'),
  isNotNull(articles.publishedAt),
  lte(articles.publishedAt, sql`NOW()`),
)

const categoryColumns = {
  slug: categories.slug,
  name: categories.name,
  description: categories.description,
  // count(articles.id): ham count() COUNT(*) üretir ve eşleşme olmasa bile 1 sayardı.
  articleCount: count(articles.id),
}

const categoryGrouping = [categories.id, categories.slug, categories.name, categories.description]

/**
 * articleCount = 0 olan kategoriler listede GÖSTERİLMEZ (boş arşiv sayfası üretmesin).
 *
 * Bunu sağlayan innerJoin: yayımlanmışlık koşulu ON içinde, dolayısıyla yalnız taslağı olan
 * kategori hiç eşleşmiyor ve satır düşüyor. HAVING ile de yazılabilirdi; join daha ucuz.
 */
export async function listPublicCategories(): Promise<PublicCategory[]> {
  return db
    .select(categoryColumns)
    .from(categories)
    .innerJoin(articles, publishedArticleJoin)
    .groupBy(...categoryGrouping)
    .orderBy(asc(categories.name))
}

/**
 * Kategori arşiv sayfası için; makalesi olmayan kategoride articleCount 0 döner (null DEĞİL).
 * Böyle bir adrese listeden bağlantı verilmiyor ama elle yazılabilir; sayfa "bu kategoride
 * henüz makale yok" diyebilmeli, 404 vermek zorunda kalmamalı — karar Görev 4'ün.
 */
export async function getPublicCategoryBySlug(slug: string): Promise<PublicCategory | null> {
  const [row] = await db
    .select(categoryColumns)
    .from(categories)
    // leftJoin: burada eşleşme yokluğu satırı düşürmemeli, yalnız sayıyı 0 yapmalı.
    .leftJoin(articles, publishedArticleJoin)
    .where(eq(categories.slug, slug))
    .groupBy(...categoryGrouping)

  return row ?? null
}
```

- [ ] **Adım 5: `src/db/queries/public/lawyers.ts`**

```ts
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { lawyers, media } from '@/db/schema'

export type PublicLawyerCard = {
  slug: string
  fullName: string
  title: string
  photoPath: string | null
  photoAlt: string | null
}

export type PublicLawyerDetail = PublicLawyerCard & {
  barAssociation: string | null
  barRegistryNo: string | null
  tbbRegistryNo: string | null
  practiceStartDate: string | null
  university: string | null
  languages: string | null
  email: string | null
  bio: string | null
}

const cardColumns = {
  slug: lawyers.slug,
  fullName: lawyers.fullName,
  title: lawyers.title,
  // HAM göreli yol; mediaUrl() bileşen tarafında (bkz. public/articles.ts).
  photoPath: media.path,
  photoAlt: media.altText,
}

// Panel sorgusu (queries/lawyers.ts) KULLANILMIYOR: o taraf yayımlanmamış kayıtları da
// döndürüyor ve buraya bağlanırsa gizli bir özgeçmiş sızabilir (sözleşme §3).
export async function listPublicLawyers(): Promise<PublicLawyerCard[]> {
  return db
    .select(cardColumns)
    .from(lawyers)
    .leftJoin(media, eq(lawyers.photoMediaId, media.id))
    .where(eq(lawyers.isPublished, true))
    // Panel de aynı sırayı gösteriyor; "sıra" alanının ne yaptığı ekrandan anlaşılsın.
    .orderBy(asc(lawyers.sortOrder), asc(lawyers.fullName))
}

export async function getPublicLawyerBySlug(slug: string): Promise<PublicLawyerDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      barAssociation: lawyers.barAssociation,
      barRegistryNo: lawyers.barRegistryNo,
      tbbRegistryNo: lawyers.tbbRegistryNo,
      // mode:'string' sütun (schema.ts): 'YYYY-MM-DD' olarak taşınıyor. Date'e çevrilseydi
      // TZ=America/New_York altında bir gün geriye kayardı.
      practiceStartDate: lawyers.practiceStartDate,
      university: lawyers.university,
      languages: lawyers.languages,
      email: lawyers.email,
      // Yazma tarafında sanitizeArticleHtml'den geçmiş HTML.
      bio: lawyers.bio,
    })
    .from(lawyers)
    .leftJoin(media, eq(lawyers.photoMediaId, media.id))
    .where(and(eq(lawyers.slug, slug), eq(lawyers.isPublished, true)))

  return row ?? null
}
```

- [ ] **Adım 6: `src/db/queries/public/practice-areas.ts`**

```ts
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { practiceAreas } from '@/db/schema'

// Sözleşme §2: Plan 1'in PracticeAreas({ areas }) bileşeni tam olarak bu üç alanı bekliyor.
export type PublicPracticeAreaCard = { slug: string; name: string; summary: string }
export type PublicPracticeAreaDetail = PublicPracticeAreaCard & { content: string | null }

const cardColumns = {
  slug: practiceAreas.slug,
  name: practiceAreas.name,
  summary: practiceAreas.summary,
}

// Panel sorgusu KULLANILMIYOR: o taraf yayımlanmamış alanları da döndürüyor (sözleşme §3).
export async function listPublicPracticeAreas(): Promise<PublicPracticeAreaCard[]> {
  return db
    .select(cardColumns)
    .from(practiceAreas)
    .where(eq(practiceAreas.isPublished, true))
    .orderBy(asc(practiceAreas.sortOrder), asc(practiceAreas.name))
}

export async function getPublicPracticeAreaBySlug(slug: string): Promise<PublicPracticeAreaDetail | null> {
  const [row] = await db
    // İçerik yalnız ayrıntı sayfasında: kart sorgusuna TEXT sütunu koymak on kayıt için
    // yüz kilobayt taşırdı.
    .select({ ...cardColumns, content: practiceAreas.content })
    .from(practiceAreas)
    .where(and(eq(practiceAreas.slug, slug), eq(practiceAreas.isPublished, true)))

  return row ?? null
}
```

- [ ] **Adım 7: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/db/queries/public
npx tsc --noEmit
npm run lint
```
Beklenen: dört dosya, toplam 33 test PASS; tsc ve lint temiz.

> **Arama testi kırmızıysa önce şunu ölç, kodu değiştirme:** MariaDB'nin
> `innodb_ft_min_token_size` değeri 3 (Plan 2'de ölçüldü) ve **stopword listesi** bazı yaygın
> kelimeleri hiç indekslemez. Test terimlerinin ("ihtarname", "velayet") üç harften uzun
> olduğu seçilmiştir. Yine de boş dönüyorsa indeksin sütun listesini Görev 2 Adım 11'deki
> `SHOW INDEX` sondasıyla doğrula.

- [ ] **Adım 8: Mutasyon kanıtı (dört dosyanın her biri için ayrı)**

| Dosya | Bozulacak satır | Kırmızıya dönmesi beklenen test |
|---|---|---|
| `public/articles.ts` | `publishedPredicate` içinden `eq(articles.status, 'published')` satırı silinir | "taslak makaleyi DÖNDÜRMEZ" |
| `public/articles.ts` | `lte(articles.publishedAt, sql\`NOW()\`)` satırı silinir | "gelecek tarihli makaleyi DÖNDÜRMEZ" |
| `public/articles.ts` | `toBooleanModeTerm` gövdesi `return raw` yapılır | "boolean mode özel karakterlerini atar" (ve arama testleri MariaDB sözdizimi hatası verir) |
| `public/categories.ts` | `.innerJoin(` → `.leftJoin(` | "hiç makalesi olmayan kategoriyi LİSTELEMEZ" |
| `public/lawyers.ts` | `.where(eq(lawyers.isPublished, true))` kaldırılır | "yayımlanmamış avukatı DÖNDÜRMEZ" |
| `public/practice-areas.ts` | `eq(practiceAreas.isPublished, true)` kaldırılır | "yayımlanmamış alanı DÖNDÜRMEZ" |

Her mutasyondan sonra `npm test -- src/db/queries/public` koşulur, KIRMIZI görülür ve satır
**hemen geri alınır**. Altı mutasyonun altısı da kırmızı vermek zorunda; vermeyen bir test
hiçbir şeyi korumuyor demektir ve düzeltilmeden görev kapanmaz.

- [ ] **Adım 9: Bütün süit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit
npm run lint
npm test
npm run build
```
Beklenen: hepsi yeşil. (`npm run test:e2e` bu görevde yeni bir akış açmıyor — halka açık
sayfalar Görev 4'te bağlanacak; yine de taban sayısıyla aynı kalmalı.)

- [ ] **Adım 10: Commit**

```bash
git add src/db/queries/public/
git commit -m "feat: halka açık sorgu katmanı

src/db/queries/public/ altına dört sorgu modülü: makaleler (arama + kategori + sayfalama),
kategoriler, kadro ve çalışma alanları. Panel sorguları çağrılmıyor — o taraf taslakları da
döndürüyor ve bağlanmak sızıntı yolu açardı.

Yayımlanmışlık yüklemi tek sabitte toplandı: status = 'published' AND published_at IS NOT
NULL AND published_at <= NOW(). Arama MATCH ... AGAINST (? IN BOOLEAN MODE) ile yazıldı;
kullanıcı girdisi parametre olarak geçiyor ve boolean mode operatörleri temizleniyor.

Her sorgu için 'yayımlanmamış kayıt DÖNMEZ' olumsuz testi var; altı mutasyonun altısı da
kırmızı verdi.

Doğrulama: npx tsc --noEmit, npm run lint, npm test, npm run build."
```

---

### Görev 4: Ana sayfa ve kabuk veriye bağlanır

**Dosyalar:**
- Oluştur: `src/lib/contact-links.ts`
- Test: `src/lib/contact-links.test.ts`
- Oluştur: `src/db/queries/public/site-identity.ts`
- Değiştir: `src/lib/date.ts`, `src/lib/date.test.ts`
- Değiştir: `src/components/SiteShell.tsx`, `src/components/SiteHeader.tsx`,
  `src/components/SiteFooter.tsx`, `src/components/Hero.tsx`,
  `src/components/PracticeAreas.tsx`, `src/components/ArticleStrip.tsx`,
  `src/components/TeamStrip.tsx`
- Değiştir: `src/app/(site)/layout.tsx`, `src/app/(site)/page.tsx`, `src/app/not-found.tsx`
- Değiştir: `src/content/site.ts` (yalnız yorum), `tests/e2e/home.spec.ts`
- Sil: `src/content/sample-content.ts`
- Test: `tests/e2e/anasayfa-veri.spec.ts`

**Arayüzler:**
- Tüketir (Görev 3'ten, sözleşme §3.1/§3.3/§3.4):
  `listPublicPracticeAreas(): Promise<PublicPracticeAreaCard[]>`,
  `listLatestArticles(limit: number): Promise<PublicArticleCard[]>`,
  `listPublicLawyers(): Promise<PublicLawyerCard[]>`
- Tüketir (mevcut): `getSettings(): Promise<Settings>` — `src/db/queries/settings.ts`
- Üretir:
  - `telHref(phone: string): string`, `whatsappHref(number: string): string` — `@/lib/contact-links`
  - `isoDate(value: Date): string` — `@/lib/date`
  - `type PublicSiteIdentity`, `getPublicSiteIdentity(): Promise<PublicSiteIdentity>`
    — `@/db/queries/public/site-identity`
  - `SiteShell({ children, identity })`, `SiteHeader({ officeName })`,
    `SiteFooter({ identity })`

**Sözleşme notu — `site-identity.ts` neden var:** §3.5 "ikinci bir sorgu yazılmaz" diyor ve
bu kural korunuyor; modül **SQL yazmaz**, var olan `getSettings()`'i çağırır. Var olma
nedeni önbellek kabuğudur: `cacheComponents` açıkken önbelleklenmemiş bir okuma çağıran
segmenti dinamikleştirir ve kabuk her sayfada çizildiği için bu, sitenin tamamını
statiklikten çıkarırdı. `<Suspense>` ile çözülemez — spec §11 telefon numarasının
JavaScript'siz HTML'de bulunmasını şart koşuyor, Suspense'e alınan içerik ise akışın
sonunda istemci betiğiyle yerine taşınır. Dosya adı §3.5'in başlığındaki `settings.ts`
değil, çakışmayı önlemek için `site-identity.ts`.

- [ ] **Adım 1: Kırmızı testleri yaz**

`src/lib/contact-links.test.ts` (yeni dosya):

```ts
import { describe, expect, it } from 'vitest'
import { telHref, whatsappHref } from '@/lib/contact-links'

describe('telHref', () => {
  // Ayarlardaki telefon insan için biçimli yazılıyor; boşluklu hâli bazı çeviricilerde
  // hiç aranmıyor. Bu test biçimlemenin gerçekten söküldüğünü sabitler.
  it('boşluk ve parantezleri söker, artı işaretini korur', () => {
    expect(telHref('+90 216 000 00 00')).toBe('tel:+902160000000')
    expect(telHref('(0216) 000-00-00')).toBe('tel:02160000000')
  })

  it('baştaki artı yoksa uydurmaz', () => {
    expect(telHref('0216 000 00 00')).toBe('tel:02160000000')
  })
})

describe('whatsappHref', () => {
  // wa.me artı işaretini KABUL ETMEZ: yalnız ülke koduyla başlayan salt rakam ister.
  it('artı işaretini atar', () => {
    expect(whatsappHref('+90 532 000 00 00')).toBe('https://wa.me/905320000000')
  })
})
```

`src/lib/date.test.ts` — dosyanın SONUNA eklenir (mevcut iki `describe` bloğuna dokunulmaz):

```ts
describe('isoDate', () => {
  // Testler TZ=America/New_York altında koşuyor (vitest.config.mts). getFullYear/getMonth/
  // getDate ile yazılmış bir gerçekleme burada 11 Ağustos üretir; ISO gövdesinden kesen
  // gerçekleme 12 Ağustos üretir. <time dateTime> ile görünen tarih bu yüzden ayrışmamalı.
  it('UTC gününü döndürür, yerel dilime kaymaz', () => {
    expect(isoDate(new Date('2026-08-12T02:00:00Z'))).toBe('2026-08-12')
  })

  it('gün sınırında de kaymaz', () => {
    expect(isoDate(new Date('2026-08-01T00:00:00Z'))).toBe('2026-08-01')
  })
})
```

Aynı dosyanın ilk satırındaki import genişletilir:

```ts
import { formatDate, formatDateTime, isoDate } from '@/lib/date'
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/contact-links.test.ts src/lib/date.test.ts
```

Beklenen: FAIL — `Failed to resolve import "@/lib/contact-links"` ve
`isoDate is not a function` (`date.ts` bu adı henüz dışa aktarmıyor).

- [ ] **Adım 3: En küçük uygulamayı yaz**

`src/lib/contact-links.ts` (yeni dosya):

```ts
// tel: ve wa.me adresleri yalnız rakam (ve tel: için baştaki +) taşıyabilir. Ayarlardaki
// telefon insan için biçimli giriliyor; iki biçimi ayıran tek yer burası olsun diye
// dönüştürme sabitler dosyasında değil, kendi modülünde ve testli duruyor.
function dialable(value: string): string {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

export function telHref(phone: string): string {
  return `tel:${dialable(phone)}`
}

// wa.me ARTI İŞARETİ KABUL ETMEZ; ülke koduyla başlayan salt rakam bekler.
export function whatsappHref(number: string): string {
  return `https://wa.me/${dialable(number).replace(/^\+/, '')}`
}
```

`src/lib/date.ts` — dosyanın sonuna eklenir:

```ts
// <time dateTime> özniteliği için gün. Yerel saat yöntemleriyle (getFullYear/getMonth/
// getDate) üretilseydi negatif ofsetli bir sunucuda gün bir geriye kayar ve öznitelik,
// formatDate'in UTC'ye sabitli çıktısıyla çelişirdi — home.spec.ts tam olarak bu iki
// değerin aynı günü göstermesini ölçüyor.
export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}
```

`src/db/queries/public/site-identity.ts` (yeni dosya):

```ts
import { cacheLife, cacheTag } from 'next/cache'
import { getSettings } from '@/db/queries/settings'
import { TAGS } from '@/lib/cache-tags'
import { telHref, whatsappHref } from '@/lib/contact-links'

export type PublicSiteIdentity = {
  officeName: string
  address: string
  phone: string
  phoneHref: string
  email: string
  emailHref: string
  whatsappHref: string | null
  footerText: string | null
}

// SQL YOK: sözleşme §3.5 gereği tek ayar sorgusu getSettings()'te kalıyor. Bu modül onun
// önbellek kabuğu ve halka açık izdüşümü. Kabuk şart, çünkü başlık/alt bilgi her sayfada
// çiziliyor: önbelleklenmemiş bir okuma sitenin tamamını dinamikleştirirdi. Suspense
// alternatif değil — spec §11 telefonun JavaScript'siz HTML'de bulunmasını istiyor.
//
// cacheLife('max') + cacheTag: panelin ayar kaydı zaten revalidateTag(TAGS.settings, 'max')
// çağırıyor (src/app/panel/ayarlar/actions.ts), yani süre değil olay tazeliyor.
//
// Hata YUTULMUYOR: getSettings() satır yoksa fırlatır ve fırlatma buradan geçer.
export async function getPublicSiteIdentity(): Promise<PublicSiteIdentity> {
  'use cache'
  cacheTag(TAGS.settings)
  cacheLife('max')

  const s = await getSettings()
  const whatsapp = s.whatsapp === null || s.whatsapp.trim() === '' ? null : s.whatsapp

  return {
    officeName: s.officeName,
    address: s.address,
    phone: s.phone,
    phoneHref: telHref(s.phone),
    email: s.email,
    emailHref: `mailto:${s.email}`,
    whatsappHref: whatsapp === null ? null : whatsappHref(whatsapp),
    footerText: s.footerText,
  }
}
```

- [ ] **Adım 4: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/contact-links.test.ts src/lib/date.test.ts
```

Beklenen: PASS (5 test).

- [ ] **Adım 5: Kabuğu ve ana sayfayı veriye bağla**

`src/components/SiteHeader.tsx` — yalnız üç yer değişir: `SITE` importu yok, prop eklenir,
marka metni veriden gelir.

```tsx
type SiteHeaderProps = { officeName: string }

export function SiteHeader({ officeName }: SiteHeaderProps) {
```

ve marka bağlantısı:

```tsx
        <Link href="/" className={styles.brand}>
          {officeName}
        </Link>
```

(Elle yazılmış "AKIL · HUKUK" metni ve ayraç `<span>`'i kaldırılır; büro adı panelden
değişince başlıkta eski ad kalmasın. `.brand` sınıfı `white-space: nowrap` taşıdığı için
uzun adlarda hap taşabilir — `SiteHeader.module.css` içinde `.brand` kuralına
`overflow: hidden; text-overflow: ellipsis; min-width: 0;` eklenir ve `.pill`'e
`min-width: 0;` konur.)

`src/components/SiteFooter.tsx` (tam içerik):

```tsx
import Link from 'next/link'
import { NAV_LINKS } from '@/lib/navigation'
import type { PublicSiteIdentity } from '@/db/queries/public/site-identity'
import styles from './SiteFooter.module.css'

type SiteFooterProps = { identity: PublicSiteIdentity }

export function SiteFooter({ identity }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brand}>{identity.officeName}</p>
          <address className={styles.address}>
            {identity.address}
            <br />
            <a href={identity.phoneHref} className="textLink">{identity.phone}</a>
            <br />
            <a href={identity.emailHref} className="textLink">{identity.email}</a>
          </address>
          {/* Alt bilgi metni boş bırakılabilir; boşken paragraf hiç çizilmez ki
              alt bilgide anlamsız bir boşluk kalmasın. */}
          {identity.footerText !== null && identity.footerText.trim() !== '' ? (
            <p className={styles.note}>{identity.footerText}</p>
          ) : null}
        </div>

        <nav aria-label="Alt bilgi gezinmesi" className={styles.links}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Yasal" className={styles.links}>
          <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link href="/cerez-politikasi">Çerez Politikası</Link>
        </nav>
      </div>
    </footer>
  )
}
```

`src/components/SiteFooter.module.css` — sona eklenir:

```css
.note {
  margin-top: 16px;
  font-size: 15px;
}
```

`src/components/SiteShell.tsx` (tam içerik):

```tsx
import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import type { PublicSiteIdentity } from '@/db/queries/public/site-identity'

type SiteShellProps = { children: ReactNode; identity: PublicSiteIdentity }

// Kabuk hem (site) rota grubunun layout'unda hem de kök not-found.tsx'te kullanılıyor:
// eşleşmeyen adreslerde Next kök layout'u çiziyor, rota grubunun layout'unu değil.
// Kimlik veriyi kabuk KENDİ çekmiyor, prop olarak alıyor: iki çağıranın ikisi de sunucu
// bileşeni ve okuma zaten önbellekli; kabuğun kendi veri bağımlılığı olması onu her
// kullanan yerde async'e zorlardı.
export function SiteShell({ children, identity }: SiteShellProps) {
  return (
    <>
      <a href="#content" className="skipLink">
        İçeriğe atla
      </a>
      <SiteHeader officeName={identity.officeName} />
      <main id="content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter identity={identity} />
    </>
  )
}
```

`src/app/(site)/layout.tsx` (tam içerik):

```tsx
import type { ReactNode } from 'react'
import { SiteShell } from '@/components/SiteShell'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'

// Ayar okuması BURADA, kök layout'ta değil (spec §11): kök layout hatasında sunucu Next'in
// __next_error__ kabuğunu döndürüyor ve telefon numarası kayboluyor (Plan 1'de ölçüldü).
// Okuma önbellekli olduğu için üretim derlemesinde değer sayfaya gömülü gelir; çalışma
// anında veritabanı düşse bile kabuk ve telefon numarası yayında kalır.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const identity = await getPublicSiteIdentity()
  return <SiteShell identity={identity}>{children}</SiteShell>
}
```

`src/app/not-found.tsx` (tam içerik):

```tsx
import { SiteShell } from '@/components/SiteShell'
import { NotFoundContent } from '@/components/NotFoundContent'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'

// Hiçbir rotayla eşleşmeyen adresler kök layout'u kullanır, (site) grubunun layout'unu
// almaz; kabuk bu yüzden burada elle sarılıyor ve kimlik verisi de burada okunuyor.
export default async function NotFoundPage() {
  const identity = await getPublicSiteIdentity()
  return (
    <SiteShell identity={identity}>
      <NotFoundContent />
    </SiteShell>
  )
}
```

`src/components/Hero.tsx` — `SITE` importu `getPublicSiteIdentity` ile değişir, bileşen
`async` olur, prop imzası (`<Hero />`) korunur:

```tsx
import Link from 'next/link'
import { CTA_LINK } from '@/lib/navigation'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'
import styles from './Hero.module.css'

// async sunucu bileşeni: prop imzası değişmeden veriye bağlanmanın tek yolu bu. Kurulu
// @types/react 19 bunu destekliyor (JSXElementConstructor: `(props: P): ReactNode |
// Promise<ReactNode>`), yani ayrıca bir tip hilesi gerekmiyor.
//
// Tanıtım metni (h1 ve lead) veritabanında karşılığı olmayan sabit metindir; TBB reklam
// yasağına uygun (iddia, üstünlük ve başarı ifadesi içermez) ve `settings` tablosunda
// böyle bir alan yok. Yalnız büro adı veriden geliyor.
export async function Hero() {
  const { officeName } = await getPublicSiteIdentity()

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{officeName}</p>
          <h1 className={styles.title}>
            Hukuki süreçlerde
            <br />
            yanınızdayız
          </h1>
          <p className={styles.lead}>
            Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık hizmeti sunuyoruz.
          </p>
          <div className={styles.actions}>
            <Link href={CTA_LINK.href} className={styles.pillFilled}>
              {CTA_LINK.label}
            </Link>
            <Link href="/calisma-alanlari" className={styles.pillOutline}>
              Çalışma alanlarını görün
            </Link>
          </div>
        </div>
        {/* Dekoratif zemin; içerik taşımadığı için erişilebilirlik ağacından çıkarılıyor. */}
        <div className={styles.visual} aria-hidden="true" />
      </div>
    </section>
  )
}
```

`src/components/PracticeAreas.tsx` (tam içerik) — prop adı `areas` korunur, öğe tipi
sorgu katmanından gelir, boş durum eklenir:

```tsx
import Link from 'next/link'
import type { PublicPracticeAreaCard } from '@/db/queries/public/practice-areas'
import styles from './PracticeAreas.module.css'

type PracticeAreasProps = { areas: PublicPracticeAreaCard[] }

// Liste boşken bölüm KALDIRILMIYOR, boş durum yazılıyor: başlıklar kaybolunca ana sayfa
// yalnızca hero'dan ibaret kalıyor ve düzen bozuk görünüyor. Başlık her hâlükârda duruyor,
// altındaki ızgara yerine tek satırlık bir açıklama geliyor.
export function PracticeAreas({ areas }: PracticeAreasProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>Çalışma Alanları</h2>
        {areas.length === 0 ? (
          <p className={styles.empty}>Çalışma alanları yakında yayımlanacak.</p>
        ) : (
          <ul className={styles.grid}>
            {areas.map((area) => (
              <li key={area.slug}>
                <Link href={`/calisma-alanlari/${area.slug}`} className={`card ${styles.cardLayout}`}>
                  <h3 className={styles.cardTitle}>{area.name}</h3>
                  <p className={styles.cardSummary}>{area.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
```

`src/components/PracticeAreas.module.css` ve `src/components/TeamStrip.module.css` —
ikisinin de sonuna:

```css
.empty {
  margin-top: 32px;
  color: var(--text-muted);
}
```

`src/components/ArticleStrip.tsx` (tam içerik):

```tsx
import Link from 'next/link'
import type { PublicArticleCard } from '@/db/queries/public/articles'
import { formatDate, isoDate } from '@/lib/date'
import styles from './ArticleStrip.module.css'

type ArticleStripProps = { articles: PublicArticleCard[] }

export function ArticleStrip({ articles }: ArticleStripProps) {
  return (
    // Dıştaki <div>, diğer bölümlerle aynı dikey ritmi (padding: var(--section) var(--pad))
    // sağlayan saydam bir kapsayıcı. Krem yüzey sözleşmesi — zemin, metin ve odak halkası
    // data-surface="paper" ile birlikte gelir — asıl tematik <section>'da, `id` de burada.
    <div className={styles.section}>
      <section id="articles" data-surface="paper" className={styles.inner}>
        <div className={styles.header}>
          <h2>Makaleler</h2>
          <Link href="/makaleler" className="textLink">
            Tümünü gör
          </Link>
        </div>
        {articles.length === 0 ? (
          <p className={styles.empty}>Henüz yayımlanmış makale yok.</p>
        ) : (
          <ul className={styles.list}>
            {articles.map((article) => {
              // Gün ISO gövdesinden kesiliyor; formatDate de UTC'ye sabitli, böylece
              // görünen tarih ile dateTime özniteliği asla ayrışmıyor.
              const gun = isoDate(article.publishedAt)
              return (
                <li key={article.slug} className={styles.item}>
                  <Link href={`/makaleler/${article.slug}`} className={styles.itemLink}>
                    {/* Kategori zorunlu değil (ON DELETE RESTRICT olsa da sütun nullable);
                        yoksa boş bir etiket kutusu çizmek yerine hiç çizilmiyor. */}
                    {article.categoryName !== null ? (
                      <span className={styles.category}>{article.categoryName}</span>
                    ) : null}
                    <h3 className={styles.itemTitle}>{article.title}</h3>
                    <time dateTime={gun} className={styles.date}>
                      {formatDate(gun)}
                    </time>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
```

`src/components/ArticleStrip.module.css` — sona:

```css
.empty {
  margin-top: 32px;
  color: var(--text-muted);
}
```

`src/components/TeamStrip.tsx` (tam içerik) — prop adı `lawyers` korunur; alan adı
`name` → `fullName` olur (sorgu katmanının tipi):

```tsx
import Link from 'next/link'
import type { PublicLawyerCard } from '@/db/queries/public/lawyers'
import styles from './TeamStrip.module.css'

type TeamStripProps = { lawyers: PublicLawyerCard[] }

// Fotoğraf Görev 5'te ortak LawyerCard bileşeniyle geliyor; bu görev yalnız veri kaynağını
// değiştiriyor, işaretlemeyi değil.
export function TeamStrip({ lawyers }: TeamStripProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2>Kadro</h2>
        {lawyers.length === 0 ? (
          <p className={styles.empty}>Kadro bilgileri yakında yayımlanacak.</p>
        ) : (
          <ul className={styles.grid}>
            {lawyers.map((lawyer) => (
              <li key={lawyer.slug}>
                <Link href={`/kadro/${lawyer.slug}`} className={`card ${styles.cardLayout}`}>
                  <h3 className={styles.name}>{lawyer.fullName}</h3>
                  <p className={styles.title}>{lawyer.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
```

`src/app/(site)/page.tsx` (tam içerik):

```tsx
import { Hero } from '@/components/Hero'
import { PracticeAreas } from '@/components/PracticeAreas'
import { ArticleStrip } from '@/components/ArticleStrip'
import { TeamStrip } from '@/components/TeamStrip'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { listLatestArticles } from '@/db/queries/public/articles'
import { listPublicLawyers } from '@/db/queries/public/lawyers'

// Şeritteki makale sayısı: ızgara masaüstünde üç sütun, tek satır dolsun.
const HOME_ARTICLE_COUNT = 3

export default async function HomePage() {
  // Üç sorgu paralel; sıralı await'te toplam gecikme üçünün toplamı olurdu. Hata
  // yakalanmıyor: veritabanı erişilemezse sayfa (site)/error.tsx sınırına düşsün.
  const [areas, articles, lawyers] = await Promise.all([
    listPublicPracticeAreas(),
    listLatestArticles(HOME_ARTICLE_COUNT),
    listPublicLawyers(),
  ])

  return (
    <>
      <Hero />
      <PracticeAreas areas={areas} />
      <ArticleStrip articles={articles} />
      <TeamStrip lawyers={lawyers} />
    </>
  )
}
```

`src/content/site.ts` — değerler AYNEN kalır, yalnız baştaki yorum değişir:

```ts
// Son çare sabitleri. Ayarlar artık veritabanından geliyor (getPublicSiteIdentity); burada
// yalnız veri ÇEKİLEMEYEN yerler kaldı:
//   1) kök layout metadata'sı — spec §11 kök layout'ta veri çekmeyi yasaklıyor,
//   2) (site)/error.tsx ve global-error.tsx — istemci bileşenleri, üstelik hatanın kaynağı
//      veritabanının kendisi olabilir; oradan tekrar sorgulamak ikinci bir çöküş demektir,
//   3) /iletisim — Plan 3'ün iletişim görevinde getPublicSiteIdentity'ye bağlanacak.
// Değerler tohumdaki settings satırıyla aynı; büro adı değişirse burası da elle güncellenir.
```

Sabit dosyayı sil:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
rm src/content/sample-content.ts
```

- [ ] **Adım 6: e2e testlerini gerçek veriye taşı**

`tests/e2e/home.spec.ts` içinden ŞU testler çıkarılır (veri gerektiriyorlar, ana sayfada
tohumda makale/avukat yok):
`makale kartındaki <time>, ISO tarihi dateTime özniteliğinde taşır`,
`makale kartındaki <time>, dateTime özniteliğiyle aynı günü gösterir`,
`makale bandındaki bağlantıya odaklanınca halka altın-ink olur`.

`çalışma alanı ve kadro kartları doğru rotalara bağlanır` testi şununla değiştirilir
(çalışma alanları tohumda yayında; kadro bağlantısı yeni spec'e taşınıyor):

```ts
test('çalışma alanı kartları doğru rotaya bağlanır', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href^="/calisma-alanlari/"]').first()).toBeVisible()
})
```

`tests/e2e/anasayfa-veri.spec.ts` (yeni dosya):

```ts
import { test, expect } from '@playwright/test'
import { girisYap, ADMIN } from './helpers/auth'
import { testIcerigiHazirla, type TestIcerigi } from './helpers/test-content'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// Ana sayfa artık veritabanından besleniyor ve tohumda ne makale ne avukat var. Veri
// PANELDEN üretiliyor, doğrudan SQL ile DEĞİL: üretim derlemesinde ana sayfa önbellekli
// ve yalnız server action'ların revalidateTag çağrısı onu tazeliyor. Ham INSERT sessizce
// görünmez kalır ve test nedenini anlaşılmaz biçimde kaybederdi.
let icerik: TestIcerigi | null = null
let temizlik: Temizlikci | null = null
const avukatAdlari: string[] = []

test.beforeEach(async () => {
  icerik = await testIcerigiHazirla()
  temizlik = await temizlikciAc()
})

test.afterEach(async () => {
  const mevcutIcerik = icerik
  const mevcutTemizlik = temizlik
  icerik = null
  temizlik = null
  if (mevcutTemizlik !== null) {
    for (const ad of avukatAdlari) {
      await mevcutTemizlik.silmeyeCalis('DELETE FROM lawyers WHERE full_name LIKE ?', [`%${ad}%`])
    }
    await mevcutTemizlik.kapat()
  }
  await mevcutIcerik?.temizle()
})

function hazir(): TestIcerigi {
  if (icerik === null) throw new Error('Test içeriği hazırlanmadı; beforeEach düşmüş olmalı.')
  return icerik
}

test('yayımlanan makale ve avukat ana sayfada görünür', async ({ page }) => {
  const damga = hazir().damga
  const makaleBasligi = `Kira tespit notu ${damga}`
  const avukatAdi = `Deneme Avukat ${damga}`
  avukatAdlari.push(avukatAdi)

  await girisYap(page, ADMIN)

  // 1) Makale: yaz → kategori seç → yayımla.
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(makaleBasligi)
  await page.getByLabel('Özet').fill('Kira bedelinin belirlenmesinde uygulanan ölçütler üzerine kısa not.')
  await page.locator('[contenteditable="true"]').fill('Kiracının hakları ve süreler.')
  await page.getByLabel('Kategori').selectOption({ label: hazir().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  // 2) Avukat: ekle → yayına al.
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(avukatAdi)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  // 3) Ana sayfa: iki kayıt da görünüyor.
  await page.goto('/')
  await expect(page.getByRole('link', { name: new RegExp(makaleBasligi) })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(avukatAdi) })).toBeVisible()
  await expect(page.locator('a[href^="/kadro/"]').first()).toBeVisible()

  // 4) <time>: öznitelik ISO gün, görünen metin aynı gün (formatDate/isoDate sözleşmesi).
  const time = page.locator('#articles ul time').first()
  const gun = await time.getAttribute('datetime')
  expect(gun).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const [yil, ay, günRakami] = gun!.split('-')
  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ]
  await expect(time).toHaveText(`${günRakami} ${aylar[Number(ay) - 1]} ${Number(yil)}`)

  // 5) Krem yüzeyde odak halkası --gold-ink'e döner (data-surface sözleşmesi).
  const link = page.locator('#articles ul a').first()
  await link.focus()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await expect(link).toHaveCSS('outline-width', '2px')
  await expect(link).toHaveCSS('outline-color', 'rgb(125, 95, 38)')
})

test('yayımlanmamış avukat ana sayfada görünmez', async ({ page }) => {
  const avukatAdi = `Taslak Avukat ${hazir().damga}`
  avukatAdlari.push(avukatAdi)

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(avukatAdi)
  await page.getByLabel('Unvan').fill('Avukat')
  // "Yayında" İŞARETLENMİYOR: sızıntının ölçüldüğü tek yer bu.
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  await page.goto('/')
  await expect(page.getByText(avukatAdi)).toHaveCount(0)
})
```

- [ ] **Adım 7: ÖLÇÜLECEK — üretim derlemesi ve önbellek davranışı**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit && npm run lint && npm run build
```

Ölçülecek üç şey, sonucu Görev 4 raporuna **yazılı** geçirilir:

1. `npx tsc --noEmit` — `async function Hero()` JSX içinde tip hatası veriyor mu?
   (Kurulu `@types/react` 19'da `JSXElementConstructor` `Promise<ReactNode>` döndürmeye
   izin veriyor; beklenen sonuç HATA YOK. Hata çıkarsa Aborjina'ya sorulur — çözüm
   `Hero`'ya prop eklemektir ve bu sözleşme §2'yi değiştirir.)
2. `npm run build` çıktısında `/` ve 404 rotası **statik** (`○`/`SSG`) mi işaretleniyor?
   Değilse `getPublicSiteIdentity` önbelleği devreye girmemiştir; `cacheComponents`
   ayarının Görev 1'de açıldığı doğrulanır.
3. Derleme "needs a Suspense boundary" benzeri bir hata veriyor mu? Veriyorsa bu, bir
   okumanın önbelleklenmemiş olduğunun işaretidir; **Suspense EKLENMEZ** (spec §11),
   önbelleklenmeyen okuma bulunup `'use cache'` altına alınır.

- [ ] **Adım 8: Tüm testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test && npm run test:e2e
```

Beklenen: PASS.

- [ ] **Adım 9: Mutasyon kanıtı**

`src/lib/date.ts` içindeki `isoDate` gövdesi geçici olarak şu satırla değiştirilir:

```ts
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
```

`npm test -- src/lib/date.test.ts` → **FAIL**: `expected '2026-08-11' to be '2026-08-12'`
(testler `TZ=America/New_York` altında koşuyor). Satır geri alınır, test yeşile döner.

İkinci mutasyon: `src/lib/contact-links.ts` içinde `dialable` gövdesi
`return trimmed` yapılır → `npm test -- src/lib/contact-links.test.ts` **FAIL**
(`'tel:+90 216 000 00 00'`). Geri alınır.

- [ ] **Adım 10: Commit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git add src/lib/contact-links.ts src/lib/contact-links.test.ts src/lib/date.ts src/lib/date.test.ts \
  src/db/queries/public/site-identity.ts src/components src/app/\(site\)/layout.tsx \
  src/app/\(site\)/page.tsx src/app/not-found.tsx src/content/site.ts \
  src/content/sample-content.ts tests/e2e/home.spec.ts tests/e2e/anasayfa-veri.spec.ts
git commit -m "feat: ana sayfa ve site kabuğu veritabanına bağlandı

Örnek içerik sabitleri silindi; bölümler halka açık sorgu katmanından besleniyor.
Ayarlar (site)/layout.tsx içinde önbellekli okunuyor — kök layout'ta veri çekilmiyor.
Doğrulama: npm test, npm run lint, npx tsc --noEmit, npm run build, npm run test:e2e."
```

---

### Görev 5: Kadro listesi ve avukat özgeçmiş sayfası

**Dosyalar:**
- Oluştur: `src/lib/render-html.ts`
- Test: `src/lib/render-html.test.ts`
- Oluştur: `src/lib/lawyer-facts.ts`
- Test: `src/lib/lawyer-facts.test.ts`
- Oluştur: `src/components/LawyerCard.tsx`, `src/components/LawyerCard.module.css`
- Oluştur: `src/app/(site)/kadro/[slug]/page.tsx`,
  `src/app/(site)/kadro/[slug]/page.module.css`
- Oluştur: `src/app/(site)/kadro/page.module.css`
- Değiştir: `src/app/(site)/kadro/page.tsx`, `src/components/TeamStrip.tsx`,
  `src/components/TeamStrip.module.css`
- Test: `tests/e2e/kadro.spec.ts`

**Arayüzler:**
- Tüketir (sözleşme §3.3): `listPublicLawyers(): Promise<PublicLawyerCard[]>`,
  `getPublicLawyerBySlug(slug: string): Promise<PublicLawyerDetail | null>`
- Tüketir (mevcut): `mediaUrl(relativePath: string): string` — `@/lib/media-url`;
  `formatDate(iso: string): string` — `@/lib/date`;
  `sanitizeArticleHtml(dirty: string): string` — `@/lib/sanitize`
- Üretir:
  - `renderableHtml(stored: string): { __html: string }` — `@/lib/render-html`
  - `type LawyerFact = { label: string; value: string; href?: string }`,
    `lawyerFacts(lawyer: PublicLawyerDetail): LawyerFact[]` — `@/lib/lawyer-facts`
  - `LawyerCard({ lawyer }: { lawyer: PublicLawyerCard })` — `@/components/LawyerCard`

- [ ] **Adım 1: Kırmızı testleri yaz**

`src/lib/render-html.test.ts` (yeni dosya):

```ts
import { describe, expect, it } from 'vitest'
import { renderableHtml } from '@/lib/render-html'

describe('renderableHtml', () => {
  // dangerouslySetInnerHTML'e giden TEK kapı burası. Satırlar tek yoldan gelmiyor:
  // drizzle studio, migration, tohum ve ileride yazılacak her yeni yazma yolu panelin
  // temizleyicisini atlayabilir; atlanan tek yol doğrudan XSS demektir.
  it('script etiketini basmaz', () => {
    expect(renderableHtml('<p>Merhaba</p><script>alert(1)</script>').__html)
      .toBe('<p>Merhaba</p>')
  })

  it('olay özniteliğini söker', () => {
    expect(renderableHtml('<p onclick="alert(1)">Metin</p>').__html).toBe('<p>Metin</p>')
  })

  it('izin verilen biçimlendirmeyi korur', () => {
    expect(renderableHtml('<p><strong>Kalın</strong></p>').__html)
      .toBe('<p><strong>Kalın</strong></p>')
  })
})
```

`src/lib/lawyer-facts.test.ts` (yeni dosya):

```ts
import { describe, expect, it } from 'vitest'
import { lawyerFacts, IZINLI_ETIKETLER } from '@/lib/lawyer-facts'
import type { PublicLawyerDetail } from '@/db/queries/public/lawyers'

function avukat(ustuneYaz: Partial<PublicLawyerDetail> = {}): PublicLawyerDetail {
  return {
    slug: 'deneme-avukat',
    fullName: 'Deneme Avukat',
    title: 'Avukat',
    photoPath: null,
    photoAlt: null,
    barAssociation: null,
    barRegistryNo: null,
    tbbRegistryNo: null,
    practiceStartDate: null,
    university: null,
    languages: null,
    email: null,
    bio: null,
    ...ustuneYaz,
  }
}

describe('lawyerFacts', () => {
  it('boş, null ve yalnız boşluk taşıyan alanları listeye koymaz', () => {
    const facts = lawyerFacts(avukat({ barAssociation: '', university: '   ', languages: null }))
    expect(facts).toEqual([])
  })

  // TZ=America/New_York altında koşuyor: tarih Date'e çevrilip yerel yöntemlerle
  // okunursa 14 Mart çıkar. Sütun mode:'string' ve buradan da dize olarak geçiyor.
  it('mesleğe başlama tarihini gün kaydırmadan Türkçe basar', () => {
    const facts = lawyerFacts(avukat({ practiceStartDate: '2010-03-15' }))
    expect(facts).toEqual([{ label: 'Mesleğe başlama', value: '15 Mart 2010' }])
  })

  it('e-postayı mailto bağlantısıyla verir', () => {
    const facts = lawyerFacts(avukat({ email: 'avukat@ornek.test' }))
    expect(facts).toEqual([
      { label: 'E-posta', value: 'avukat@ornek.test', href: 'mailto:avukat@ornek.test' },
    ])
  })

  // TBB Reklam Yasağı Yönetmeliği'nin saydığı alanlar dışında hiçbir şey basılmamalı
  // (spec §2.1). Liste büyürse bu test kırmızıya döner ve değişiklik görünür olur.
  it('yalnız mevzuatın saydığı etiketleri, sabit sırayla döndürür', () => {
    const facts = lawyerFacts(avukat({
      barAssociation: 'İstanbul Barosu',
      barRegistryNo: '12345',
      tbbRegistryNo: '67890',
      practiceStartDate: '2010-03-15',
      university: 'İstanbul Üniversitesi Hukuk Fakültesi',
      languages: 'Türkçe, İngilizce',
      email: 'avukat@ornek.test',
    }))
    expect(facts.map((f) => f.label)).toEqual([...IZINLI_ETIKETLER])
  })
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/render-html.test.ts src/lib/lawyer-facts.test.ts
```

Beklenen: FAIL — `Failed to resolve import "@/lib/render-html"` ve
`Failed to resolve import "@/lib/lawyer-facts"`.

- [ ] **Adım 3: En küçük uygulamayı yaz**

`src/lib/render-html.ts` (yeni dosya):

```ts
import { sanitizeArticleHtml } from '@/lib/sanitize'

// Saklanan HTML yazma anında zaten temizleniyor (panel, spec §6). Okuma anında BİR KEZ
// DAHA temizleniyor. Gerekçe maliyet/risk dengesi:
//   - Maliyet: çağıran her sayfa 'use cache' altında çiziliyor, yani temizleyici her
//     ziyarette değil, her tazelemede bir kez koşuyor.
//   - Risk: satırlar tek yoldan gelmiyor. drizzle studio, migration, tohum ve ileride
//     eklenecek her yazma yolu panelin temizleyicisini atlayabilir; atlanan tek bir yol
//     doğrudan XSS demektir.
// Güven veri KAYNAĞINA değil, BASMA anına bağlanıyor: dangerouslySetInnerHTML'e giden
// tek kapı bu fonksiyondur, doğrudan nesne yazılmaz.
export function renderableHtml(stored: string): { __html: string } {
  return { __html: sanitizeArticleHtml(stored) }
}
```

`src/lib/lawyer-facts.ts` (yeni dosya):

```ts
import type { PublicLawyerDetail } from '@/db/queries/public/lawyers'
import { formatDate } from '@/lib/date'

export type LawyerFact = { label: string; value: string; href?: string }

// TBB Reklam Yasağı Yönetmeliği'nin (son değişiklik 9 Ağustos 2024) saydığı alanlar —
// spec §2.1. Sıra da burada: gösterim sırası bileşende değil, tek kaynakta dursun.
// Bu listeye yeni bir etiket eklemek mevzuat kararıdır, tasarım kararı değildir.
export const IZINLI_ETIKETLER = [
  'Baro',
  'Baro sicil no',
  'TBB sicil no',
  'Mesleğe başlama',
  'Üniversite',
  'Yabancı diller',
  'E-posta',
] as const

function dolu(value: string | null): value is string {
  return value !== null && value.trim() !== ''
}

export function lawyerFacts(lawyer: PublicLawyerDetail): LawyerFact[] {
  const facts: LawyerFact[] = []

  if (dolu(lawyer.barAssociation)) facts.push({ label: 'Baro', value: lawyer.barAssociation })
  if (dolu(lawyer.barRegistryNo)) facts.push({ label: 'Baro sicil no', value: lawyer.barRegistryNo })
  if (dolu(lawyer.tbbRegistryNo)) facts.push({ label: 'TBB sicil no', value: lawyer.tbbRegistryNo })
  // practiceStartDate 'YYYY-MM-DD' dizesi (şema mode:'string'); formatDate de UTC'ye
  // sabitli, yani hiçbir adımda Date nesnesine dönüp gün kaydırmıyor.
  if (dolu(lawyer.practiceStartDate)) {
    facts.push({ label: 'Mesleğe başlama', value: formatDate(lawyer.practiceStartDate) })
  }
  if (dolu(lawyer.university)) facts.push({ label: 'Üniversite', value: lawyer.university })
  if (dolu(lawyer.languages)) facts.push({ label: 'Yabancı diller', value: lawyer.languages })
  if (dolu(lawyer.email)) {
    facts.push({ label: 'E-posta', value: lawyer.email, href: `mailto:${lawyer.email}` })
  }

  return facts
}
```

- [ ] **Adım 4: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/render-html.test.ts src/lib/lawyer-facts.test.ts
```

Beklenen: PASS (7 test).

- [ ] **Adım 5: Kart bileşeni, liste sayfası ve özgeçmiş sayfası**

`src/components/LawyerCard.tsx` (yeni dosya):

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { PublicLawyerCard } from '@/db/queries/public/lawyers'
import { mediaUrl } from '@/lib/media-url'
import styles from './LawyerCard.module.css'

type LawyerCardProps = { lawyer: PublicLawyerCard }

// Ad BAŞLIK ETİKETİYLE yazılmıyor. Kart iki farklı bağlamda kullanılıyor: ana sayfada
// <h2>Kadro</h2> altında (h3 doğru olurdu), /kadro sayfasında <h1>Kadro</h1> altında
// (orada h3 bir seviye atlardı). Sabit bir seviye ikisinde birden doğru olamayacağı için
// gezinme yükü <ul>/<li> liste yapısına bırakıldı; bağlantı metni zaten avukatın adı.
export function LawyerCard({ lawyer }: LawyerCardProps) {
  return (
    <Link href={`/kadro/${lawyer.slug}`} className={`card ${styles.card}`}>
      {lawyer.photoPath !== null ? (
        <span className={styles.photoFrame}>
          <Image
            // alt metni medya kitaplığından geliyor (media.alt_text NOT NULL, panelde
            // zorunlu alan). photoAlt yalnız fotoğraf hiç yokken null olabilir ve o
            // durumda bu dal zaten çizilmiyor; ?? '' tip daraltmasının gereği.
            src={mediaUrl(lawyer.photoPath)}
            alt={lawyer.photoAlt ?? ''}
            fill
            sizes="(min-width: 768px) 360px, 100vw"
            className={styles.photo}
          />
        </span>
      ) : null}
      <span className={styles.name}>{lawyer.fullName}</span>
      <span className={styles.title}>{lawyer.title}</span>
    </Link>
  )
}
```

`src/components/LawyerCard.module.css` (yeni dosya):

```css
.card {
  display: grid;
  gap: 4px;
  align-content: start;
  height: 100%;
}

/* next/image `fill` konumlandırma için ölçülü ve position:relative bir kap ister.
   Oran sabit: farklı en-boy oranındaki portreler ızgarayı zıplatmasın. */
.photoFrame {
  position: relative;
  display: block;
  aspect-ratio: 3 / 4;
  margin-bottom: 12px;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--surface);
}

.photo {
  object-fit: cover;
}

.name {
  font-family: var(--font-display), Georgia, serif;
  font-size: 22px;
  line-height: 1.2;
}

.title {
  color: var(--text-muted);
}
```

`src/components/TeamStrip.tsx` — `<Link>` bloğu `LawyerCard` ile değiştirilir:

```tsx
import { LawyerCard } from '@/components/LawyerCard'
```

```tsx
              <li key={lawyer.slug}>
                <LawyerCard lawyer={lawyer} />
              </li>
```

(`Link` importu ve `TeamStrip.module.css` içindeki `.cardLayout`, `.name`, `.title`
kuralları kaldırılır; ölçüler artık `LawyerCard.module.css` içinde.)

`src/app/(site)/kadro/page.module.css` (yeni dosya):

```css
.grid {
  list-style: none;
  display: grid;
  gap: 20px;
}

.empty {
  color: var(--text-muted);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

`src/app/(site)/kadro/page.tsx` (tam içerik):

```tsx
import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { LawyerCard } from '@/components/LawyerCard'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import styles from './page.module.css'

// Başlık büro adı + sayfa konusuyla sınırlı (spec §10); kök layout şablonu büro adını ekler.
export const metadata: Metadata = { title: 'Kadro' }

export default async function TeamPage() {
  const lawyers = await listPublicLawyers()

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Avukatlar" title="Kadro" />
      {lawyers.length === 0 ? (
        <p className={styles.empty}>Kadro bilgileri yakında yayımlanacak.</p>
      ) : (
        <ul className={styles.grid}>
          {lawyers.map((lawyer) => (
            <li key={lawyer.slug}>
              <LawyerCard lawyer={lawyer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

`src/app/(site)/kadro/[slug]/page.module.css` (yeni dosya):

```css
.layout {
  display: grid;
  gap: 32px;
  align-items: start;
}

.photoFrame {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--surface-raised);
}

.photo {
  object-fit: cover;
}

.facts {
  display: grid;
  gap: 14px;
  margin-bottom: 40px;
}

.fact {
  display: grid;
  gap: 2px;
}

.factLabel {
  color: var(--text-muted);
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

@media (min-width: 768px) {
  .layout {
    grid-template-columns: 320px 1fr;
    gap: 48px;
  }
}
```

`src/app/(site)/kadro/[slug]/page.tsx` (yeni dosya):

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { PageHeading } from '@/components/PageHeading'
import { getPublicLawyerBySlug, listPublicLawyers } from '@/db/queries/public/lawyers'
import { lawyerFacts } from '@/lib/lawyer-facts'
import { mediaUrl } from '@/lib/media-url'
import { renderableHtml } from '@/lib/render-html'
import styles from './page.module.css'

// params Next 16'da Promise; await edilmeden okunamaz.
type LawyerPageProps = { params: Promise<{ slug: string }> }

// Yalnız YAYIMLANMIŞ avukatlar ön üretilir; taslak adresleri derleme çıktısında hiç
// görünmesin. Bilinmeyen bir slug istendiğinde sayfa çalışma anında çizilir ve
// getPublicLawyerBySlug null döndüğü için notFound()'a düşer.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const lawyers = await listPublicLawyers()
  return lawyers.map((lawyer) => ({ slug: lawyer.slug }))
}

export async function generateMetadata({ params }: LawyerPageProps): Promise<Metadata> {
  const { slug } = await params
  const lawyer = await getPublicLawyerBySlug(slug)
  // Bulunamayan kayıtta sayfanın kendisi notFound()'a düşecek; burada yalnız nötr bir
  // başlık veriliyor, hata fırlatılmıyor (metadata çöktüğünde 404 sayfası da çökerdi).
  if (lawyer === null) return { title: 'Sayfa bulunamadı' }

  // Övgü sıfatı yok, mevzuatın saydığı alanlar dışına çıkılmıyor (spec §2.1, §10).
  return { title: `${lawyer.fullName} — ${lawyer.title}` }
}

export default async function LawyerPage({ params }: LawyerPageProps) {
  const { slug } = await params
  const lawyer = await getPublicLawyerBySlug(slug)
  if (lawyer === null) notFound()

  const facts = lawyerFacts(lawyer)
  const hasBio = lawyer.bio !== null && lawyer.bio.trim() !== ''

  return (
    <article className="pageShell">
      {/* Sayfanın tek h1'i ad; unvan üst etiket olarak veriliyor. */}
      <PageHeading eyebrow={lawyer.title} title={lawyer.fullName} />

      <div className={styles.layout}>
        {/* Fotoğrafı olmayan avukatta boş çerçeve çizilmiyor; ızgara tek sütuna düşüyor. */}
        {lawyer.photoPath !== null ? (
          <div className={styles.photoFrame}>
            <Image
              src={mediaUrl(lawyer.photoPath)}
              alt={lawyer.photoAlt ?? ''}
              fill
              sizes="(min-width: 768px) 320px, 100vw"
              className={styles.photo}
              priority
            />
          </div>
        ) : null}

        <div>
          {/* Boş alanlar hiç çizilmiyor: etiketi olup değeri olmayan satır,
              bilgi eksikliğini bilgiymiş gibi gösterir. */}
          {facts.length > 0 ? (
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div key={fact.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{fact.label}</dt>
                  <dd>
                    {fact.href !== undefined ? (
                      <a href={fact.href} className="textLink">{fact.value}</a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {/* Özgeçmiş metni panelde temizlenerek yazılıyor; renderableHtml basma anında
              bir kez daha temizler (gerekçe: src/lib/render-html.ts). */}
          {hasBio ? (
            <div className="prose" dangerouslySetInnerHTML={renderableHtml(lawyer.bio!)} />
          ) : null}
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Adım 6: e2e testini yaz**

`tests/e2e/kadro.spec.ts` (yeni dosya):

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

// Kayıtlar PANELDEN üretiliyor: üretim derlemesinde /kadro önbellekli ve yalnız server
// action'ların revalidateTag çağrısı onu tazeliyor (bkz. anasayfa-veri.spec.ts).
let temizlik: Temizlikci | null = null
const adlar: string[] = []

test.beforeAll(async () => {
  temizlik = await temizlikciAc()
})

test.afterAll(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  for (const ad of adlar) {
    await mevcut.silmeyeCalis('DELETE FROM lawyers WHERE full_name LIKE ?', [`%${ad}%`])
  }
  await mevcut.kapat()
})

function yeniAd(onEk: string): string {
  // İki Playwright projesi (masaustu/mobil) aynı anda koşuyor ve lawyers.slug UNIQUE.
  const ad = `${onEk} ${Date.now()}${Math.floor(Math.random() * 1000)}`
  adlar.push(ad)
  return ad
}

test('yayımlanan avukat listede ve özgeçmiş sayfasında mevzuatın alanlarıyla görünür', async ({ page }) => {
  const ad = yeniAd('Deneme Avukat')

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  await page.getByLabel('Baro', { exact: true }).fill('İstanbul Barosu')
  await page.getByLabel('Baro sicil no').fill('12345')
  await page.getByLabel('Mesleğe başlama tarihi').fill('2010-03-15')
  await page.getByLabel('Yayında').check()
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  await page.goto('/kadro')
  const kart = page.getByRole('link', { name: new RegExp(ad) })
  await expect(kart).toBeVisible()
  await kart.click()

  await expect(page.getByRole('heading', { level: 1, name: ad })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByText('İstanbul Barosu')).toBeVisible()
  await expect(page.getByText('12345')).toBeVisible()
  // Gün kaymıyor: sütun mode:'string', formatDate UTC'ye sabitli.
  await expect(page.getByText('15 Mart 2010')).toBeVisible()
  // Girilmeyen alan hiç çizilmiyor — etiketi bile yok.
  await expect(page.getByText('TBB sicil no')).toHaveCount(0)

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('yayımlanmamış avukatın adresi 404 verir', async ({ page }) => {
  const ad = yeniAd('Taslak Avukat')

  await girisYap(page, ADMIN)
  await page.goto('/panel/kadro/yeni')
  await page.getByLabel('Ad soyad').fill(ad)
  await page.getByLabel('Unvan').fill('Avukat')
  // "Yayında" İŞARETLENMİYOR.
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Avukat kaydedildi.')

  // Slug'ı panel üretiyor; adresi bilmek için veritabanından okunuyor.
  const [satir] = await temizlik!.sorgu<{ slug: string }>(
    'SELECT slug FROM lawyers WHERE full_name = ?', [ad]
  )
  expect(satir).toBeDefined()

  const yanit = await page.goto(`/kadro/${satir.slug}`)
  expect(yanit?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /sayfa bulunamadı/i })).toBeVisible()
})

test('olmayan avukat adresi 404 verir', async ({ page }) => {
  const yanit = await page.goto('/kadro/hic-boyle-bir-avukat-yok')
  expect(yanit?.status()).toBe(404)
})
```

- [ ] **Adım 7: Doğrulama**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:e2e
```

Beklenen: PASS. `npm run build` çıktısında `/kadro/[slug]` rotası
`generateStaticParams`'tan gelen slug'larla ön üretilmiş görünmeli.

**ÖLÇÜLECEK:** `generateStaticParams` listesinde OLMAYAN bir slug istendiğinde
`cacheComponents` açıkken sayfanın çalışma anında çizilip 404 verdiği,
"olmayan avukat adresi 404 verir" testiyle üretim derlemesinde ölçülür
(`CI=1 npm run test:e2e`). Test 404 yerine 500 veya boş sayfa görürse sonuç Görev 1'in
ölçüm notuyla birlikte Aborjina'ya bildirilir — kaçış yolu `notFound()` değil, rota
yapılandırmasıdır ve bu sözleşme kararıdır.

- [ ] **Adım 8: Mutasyon kanıtı**

1. `src/lib/lawyer-facts.ts` içindeki `dolu` gövdesi geçici olarak `return true` yapılır →
   `npm test -- src/lib/lawyer-facts.test.ts` **FAIL**:
   "boş, null ve yalnız boşluk taşıyan alanları listeye koymaz" testi 7 elemanlı dizi
   görür. Geri alınır.
2. `src/lib/render-html.ts` gövdesi geçici olarak `return { __html: stored }` yapılır →
   `npm test -- src/lib/render-html.test.ts` **FAIL**: script etiketi çıktıda kalır.
   Geri alınır.

- [ ] **Adım 9: Commit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git add src/lib/render-html.ts src/lib/render-html.test.ts src/lib/lawyer-facts.ts \
  src/lib/lawyer-facts.test.ts src/components/LawyerCard.tsx src/components/LawyerCard.module.css \
  src/components/TeamStrip.tsx src/components/TeamStrip.module.css \
  src/app/\(site\)/kadro tests/e2e/kadro.spec.ts
git commit -m "feat: kadro listesi ve avukat özgeçmiş sayfası veriye bağlandı

Gösterilen alanlar TBB Reklam Yasağı Yönetmeliği'nin saydıklarıyla sınırlı (spec §2.1);
boş alanlar çizilmiyor. Özgeçmiş HTML'i basma anında yeniden temizleniyor.
Doğrulama: npm test, npm run lint, npx tsc --noEmit, npm run build, npm run test:e2e."
```

---

### Görev 6: Çalışma alanları ve sabit metin sayfaları

**Dosyalar:**
- Oluştur: `src/db/queries/public/static-pages.ts`
- Oluştur: `src/components/StaticPage.tsx`
- Oluştur: `src/components/PracticeAreaCard.tsx`, `src/components/PracticeAreaCard.module.css`
- Oluştur: `src/app/(site)/calisma-alanlari/page.module.css`,
  `src/app/(site)/calisma-alanlari/[slug]/page.tsx`,
  `src/app/(site)/calisma-alanlari/[slug]/page.module.css`
- Değiştir: `src/app/(site)/calisma-alanlari/page.tsx`, `src/components/PracticeAreas.tsx`,
  `src/components/PracticeAreas.module.css`
- Değiştir: `src/app/(site)/hakkimizda/page.tsx`, `src/app/(site)/kvkk/page.tsx`,
  `src/app/(site)/cerez-politikasi/page.tsx`
- Değiştir: `src/lib/cache-tags.ts`
- Test: `tests/e2e/calisma-alanlari.spec.ts`, `tests/e2e/pages.spec.ts`

**Arayüzler:**
- Tüketir (sözleşme §3.4): `listPublicPracticeAreas(): Promise<PublicPracticeAreaCard[]>`,
  `getPublicPracticeAreaBySlug(slug): Promise<PublicPracticeAreaDetail | null>`
- Tüketir (sözleşme §3.6, Görev 2): `PAGE_SLUGS`, `type PageSlug`,
  `getPage(slug: PageSlug): Promise<{ title: string; content: string; updatedAt: Date } | null>`
- Tüketir (Görev 5): `renderableHtml(stored: string): { __html: string }`
- Üretir:
  - `loadStaticPage(slug: PageSlug)` — `@/db/queries/public/static-pages`
  - `StaticPage({ eyebrow, title, content })` — `@/components/StaticPage`
  - `PracticeAreaCard({ area })` — `@/components/PracticeAreaCard`

**Görev 2 bağımlılığı — uygulamadan ÖNCE doğrula:**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
grep -rn "export function getPage\|export async function getPage\|PAGE_SLUGS" src/
mysql --defaults-file=/dev/null -e "SELECT slug, title FROM pages" 2>/dev/null || \
  node -e "const m=require('mysql2/promise');const {parseEnv}=require('node:util');const fs=require('node:fs');(async()=>{const c=await m.createConnection({uri:parseEnv(fs.readFileSync('.env.local','utf8')).DATABASE_URL});const [r]=await c.query('SELECT slug, title FROM pages');console.table(r);await c.end()})()"
```

İki şey doğrulanır ve sonuç rapora yazılır:
1. `getPage` ve `PAGE_SLUGS`'ın gerçek import yolu. Aşağıdaki kod `@/db/queries/pages`
   varsayıyor; Görev 2 başka bir yola koyduysa **yalnız import yolu** düzeltilir, imza
   sözleşme §3.6'dan gelir ve değişmez.
2. `pages` tablosundaki başlıklar tam olarak `Hakkımızda`, `KVKK Aydınlatma Metni`,
   `Çerez Politikası` olmalıdır. `tests/e2e/pages.spec.ts` sayfa başlığını bu değerlerle
   ölçüyor ve bu görevden sonra başlık veritabanından geliyor. Başlık farklıysa
   **tohum düzeltilir**, test gevşetilmez.

- [ ] **Adım 1: Kırmızı testi yaz**

`tests/e2e/pages.spec.ts` — dosyanın SONUNA eklenir (mevcut testlere dokunulmaz):

```ts
// Sabit metin sayfaları artık `pages` tablosundan besleniyor. Bu test veri bağının
// gerçekten kurulduğunu ölçer: metin kodda sabit kalsaydı da h1 ve başlık geçerdi,
// ama panelden girilen gövde HTML'i .prose kabında çizilmezdi.
const VERI_SAYFALARI = [
  { path: '/hakkimizda', slug: 'hakkimizda' },
  { path: '/kvkk', slug: 'kvkk' },
  { path: '/cerez-politikasi', slug: 'cerez-politikasi' },
] as const

for (const s of VERI_SAYFALARI) {
  test(`${s.path} gövdesini veritabanından alır`, async ({ page }) => {
    await page.goto(s.path)
    const prose = page.locator('.prose')
    await expect(prose).toHaveCount(1)
    // Yer tutucu bile olsa gövde BOŞ olamaz: boş .prose, veri bağının koptuğu anlamına gelir.
    expect((await prose.innerText()).trim().length).toBeGreaterThan(0)
  })
}
```

`tests/e2e/calisma-alanlari.spec.ts` (yeni dosya):

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { girisYap, ADMIN } from './helpers/auth'
import { temizlikciAc, type Temizlikci } from './helpers/db-cleanup'

let temizlik: Temizlikci | null = null
const adlar: string[] = []

test.beforeAll(async () => {
  temizlik = await temizlikciAc()
})

test.afterAll(async () => {
  const mevcut = temizlik
  temizlik = null
  if (mevcut === null) return
  for (const ad of adlar) {
    await mevcut.silmeyeCalis('DELETE FROM practice_areas WHERE name LIKE ?', [`%${ad}%`])
  }
  await mevcut.kapat()
})

function yeniAd(): string {
  // slug UNIQUE ve iki Playwright projesi aynı anda koşuyor.
  const ad = `Deneme Alanı ${Date.now()}${Math.floor(Math.random() * 1000)}`
  adlar.push(ad)
  return ad
}

test('tohumdaki çalışma alanları listede ve tekil sayfada görünür', async ({ page }) => {
  await page.goto('/calisma-alanlari')
  const kart = page.getByRole('link', { name: /Aile Hukuku/ })
  await expect(kart).toBeVisible()
  await kart.click()

  await expect(page.getByRole('heading', { level: 1, name: 'Aile Hukuku' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page).toHaveTitle('Aile Hukuku | Akıl Hukuk Bürosu')

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('yayımlanmamış çalışma alanının adresi 404 verir', async ({ page }) => {
  const ad = yeniAd()

  await girisYap(page, ADMIN)
  await page.goto('/panel/calisma-alanlari/yeni')
  await page.getByLabel('Ad').fill(ad)
  await page.getByLabel('Özet').fill('Yalnız test için oluşturulmuş kayıt.')
  // "Yayında" İŞARETLENMİYOR.
  await page.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Çalışma alanı kaydedildi.')

  const [satir] = await temizlik!.sorgu<{ slug: string }>(
    'SELECT slug FROM practice_areas WHERE name = ?', [ad]
  )
  expect(satir).toBeDefined()

  const yanit = await page.goto(`/calisma-alanlari/${satir.slug}`)
  expect(yanit?.status()).toBe(404)
})

test('olmayan çalışma alanı adresi 404 verir', async ({ page }) => {
  const yanit = await page.goto('/calisma-alanlari/hic-boyle-bir-alan-yok')
  expect(yanit?.status()).toBe(404)
})
```

> Panel form etiketleri (`Ad`, `Özet`, `Yayında`) ve bildirim metni
> (`Çalışma alanı kaydedildi.`) uygulamadan önce `tests/e2e/panel-alanlar.spec.ts`
> dosyasından doğrulanır; farklıysa gerçek etiketler yazılır.

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run test:e2e -- tests/e2e/pages.spec.ts tests/e2e/calisma-alanlari.spec.ts
```

Beklenen: FAIL — `/hakkimizda` sayfasında `.prose` yok (`toHaveCount(1)` → 0);
`/calisma-alanlari/aile-hukuku` adresi 404 (rota henüz yok).

- [ ] **Adım 3: Önbellek etiketi ve sabit sayfa okuyucusu**

`src/lib/cache-tags.ts` — `TAGS` nesnesine tek satır eklenir:

```ts
  pages: 'pages',
```

> Görev 2 bu satırı zaten eklediyse adım atlanır (aynı anahtar iki kez yazılmaz).
> **Görev 2'ye bağlı zorunluluk:** panelin "Sayfa metinleri" kaydetme server action'ı
> `revalidateTag(TAGS.pages, 'max')` çağırmalıdır; çağırmazsa panelden düzenlenen metin
> sitede görünmez. Eksikse Aborjina'ya bildirilir.

`src/db/queries/public/static-pages.ts` (yeni dosya):

```ts
import { cacheLife, cacheTag } from 'next/cache'
// Yol Görev 2'nin çıktısı; uygulamadan önce doğrulanır (görev başındaki grep adımı).
import { getPage } from '@/db/queries/pages'
import type { PageSlug } from '@/db/queries/pages'
import { TAGS } from '@/lib/cache-tags'

export type StaticPageContent = { title: string; content: string; updatedAt: Date }

// SQL YOK: sorgu Görev 2'nin getPage()'inde. Bu modül yalnız önbellek kabuğu — sabit metin
// sayfaları içerik değişene kadar yeniden çizilmesin ve cacheComponents altında statik
// kalsınlar. Panelin sayfa kaydı revalidateTag(TAGS.pages, 'max') ile tazeler.
//
// Hata YUTULMUYOR: getPage fırlatırsa fırlatma buradan geçer ve error.tsx sınırına düşer.
// null yalnız "böyle bir satır yok" demektir ve çağıran onu notFound()'a çevirir.
export async function loadStaticPage(slug: PageSlug): Promise<StaticPageContent | null> {
  'use cache'
  cacheTag(TAGS.pages)
  cacheLife('max')

  return getPage(slug)
}
```

- [ ] **Adım 4: Sunum bileşenleri**

`src/components/StaticPage.tsx` (yeni dosya):

```tsx
import { PageHeading } from '@/components/PageHeading'
import { renderableHtml } from '@/lib/render-html'

type StaticPageProps = { eyebrow: string; title: string; content: string }

// /hakkimizda, /kvkk ve /cerez-politikasi aynı desendir: başlık + tek gövde metni.
// Üçü de bu bileşeni kullanır; hukuki metinlerin sunumu tek yerde değişsin.
//
// Gövde HTML'i panelde temizlenerek yazılıyor, renderableHtml basma anında bir kez daha
// temizler (gerekçe: src/lib/render-html.ts). Metnin KENDİSİ bu kodda YAZILMAZ — KVKK
// aydınlatma metni ve çerez politikası hukuki belgedir, büro panelden girer (sözleşme §3.6).
export function StaticPage({ eyebrow, title, content }: StaticPageProps) {
  return (
    <article className="pageShell">
      <PageHeading eyebrow={eyebrow} title={title} />
      <div className="prose" dangerouslySetInnerHTML={renderableHtml(content)} />
    </article>
  )
}
```

`src/components/PracticeAreaCard.tsx` (yeni dosya):

```tsx
import Link from 'next/link'
import type { PublicPracticeAreaCard } from '@/db/queries/public/practice-areas'
import styles from './PracticeAreaCard.module.css'

type PracticeAreaCardProps = { area: PublicPracticeAreaCard }

// Başlık etiketi kullanılmıyor: kart hem ana sayfada <h2> altında hem /calisma-alanlari
// sayfasında <h1> altında çiziliyor, sabit bir seviye ikisinde birden doğru olamaz
// (LawyerCard ile aynı gerekçe). Gezinme yükü <ul>/<li> yapısında.
export function PracticeAreaCard({ area }: PracticeAreaCardProps) {
  return (
    <Link href={`/calisma-alanlari/${area.slug}`} className={`card ${styles.card}`}>
      <span className={styles.name}>{area.name}</span>
      <span className={styles.summary}>{area.summary}</span>
    </Link>
  )
}
```

`src/components/PracticeAreaCard.module.css` (yeni dosya):

```css
.card {
  display: grid;
  gap: 12px;
  align-content: start;
  height: 100%;
}

.name {
  font-family: var(--font-display), Georgia, serif;
  font-size: 22px;
  line-height: 1.2;
}

.summary {
  color: var(--text-muted);
}
```

`src/components/PracticeAreas.tsx` — ızgara gövdesi karta devredilir:

```tsx
import { PracticeAreaCard } from '@/components/PracticeAreaCard'
```

```tsx
              <li key={area.slug}>
                <PracticeAreaCard area={area} />
              </li>
```

(`Link` importu ve `PracticeAreas.module.css` içindeki `.cardLayout`, `.cardTitle`,
`.cardSummary` kuralları kaldırılır.)

- [ ] **Adım 5: Sayfaları yaz**

`src/app/(site)/calisma-alanlari/page.module.css` (yeni dosya):

```css
.grid {
  list-style: none;
  display: grid;
  gap: 20px;
}

.empty {
  color: var(--text-muted);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

`src/app/(site)/calisma-alanlari/page.tsx` (tam içerik):

```tsx
import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { PracticeAreaCard } from '@/components/PracticeAreaCard'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'Çalışma Alanları' }

export default async function PracticeAreasPage() {
  const areas = await listPublicPracticeAreas()

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Hizmet Alanları" title="Çalışma Alanları" />
      {areas.length === 0 ? (
        <p className={styles.empty}>Çalışma alanları yakında yayımlanacak.</p>
      ) : (
        <ul className={styles.grid}>
          {areas.map((area) => (
            <li key={area.slug}>
              <PracticeAreaCard area={area} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

`src/app/(site)/calisma-alanlari/[slug]/page.module.css` (yeni dosya):

```css
.lead {
  max-width: 68ch;
  margin-bottom: 40px;
  font-size: 19px;
  color: var(--text-muted);
}
```

`src/app/(site)/calisma-alanlari/[slug]/page.tsx` (yeni dosya):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeading } from '@/components/PageHeading'
import {
  getPublicPracticeAreaBySlug,
  listPublicPracticeAreas,
} from '@/db/queries/public/practice-areas'
import { renderableHtml } from '@/lib/render-html'
import styles from './page.module.css'

type AreaPageProps = { params: Promise<{ slug: string }> }

// Yalnız yayımlanmış alanlar ön üretilir; taslak adresleri derleme çıktısında görünmez.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const areas = await listPublicPracticeAreas()
  return areas.map((area) => ({ slug: area.slug }))
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { slug } = await params
  const area = await getPublicPracticeAreaBySlug(slug)
  if (area === null) return { title: 'Sayfa bulunamadı' }

  // Açıklama alanın kendi özetinden geliyor; övgü sıfatı ya da şehir + hukuk dalı
  // kalıbı eklenmiyor (spec §2.1 anahtar kelime sınırı).
  return { title: area.name, description: area.summary }
}

export default async function PracticeAreaPage({ params }: AreaPageProps) {
  const { slug } = await params
  const area = await getPublicPracticeAreaBySlug(slug)
  if (area === null) notFound()

  const hasContent = area.content !== null && area.content.trim() !== ''

  return (
    <article className="pageShell">
      <PageHeading eyebrow="Çalışma Alanı" title={area.name} />
      <p className={styles.lead}>{area.summary}</p>
      {/* Ayrıntı metni girilmemiş alanda yalnız özet kalır; boş bir .prose kabı çizilmez. */}
      {hasContent ? (
        <div className="prose" dangerouslySetInnerHTML={renderableHtml(area.content!)} />
      ) : null}
    </article>
  )
}
```

`src/app/(site)/hakkimizda/page.tsx` (tam içerik):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Başlık da gövde de veritabanından; büro metni panelden düzenlenebilir olmalı (sözleşme
// §3.6). İki çağrı var ama sorgu bir: loadStaticPage 'use cache' altında.
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('hakkimizda')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  return { title: page.title }
}

export default async function AboutPage() {
  const page = await loadStaticPage('hakkimizda')
  // Satır yoksa bu bir kurulum eksikliğidir; sessizce boş sayfa göstermek yerine 404.
  if (page === null) notFound()

  return <StaticPage eyebrow="Büro" title={page.title} content={page.content} />
}
```

`src/app/(site)/kvkk/page.tsx` (tam içerik):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Aydınlatma metni HUKUKİ BELGEDİR ve bu kodda yazılmaz; büro panelden girer. Tohumdaki
// yer tutucu, gerçek metin girilene kadar durur (sözleşme §3.6, spec §13).
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('kvkk')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  return { title: page.title }
}

export default async function KvkkPage() {
  const page = await loadStaticPage('kvkk')
  if (page === null) notFound()

  return <StaticPage eyebrow="Yasal" title={page.title} content={page.content} />
}
```

`src/app/(site)/cerez-politikasi/page.tsx` (tam içerik):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaticPage } from '@/components/StaticPage'
import { loadStaticPage } from '@/db/queries/public/static-pages'

// Çerez politikası da hukuki belgedir; metin bu kodda yazılmaz (bkz. kvkk/page.tsx).
export async function generateMetadata(): Promise<Metadata> {
  const page = await loadStaticPage('cerez-politikasi')
  if (page === null) return { title: 'Sayfa bulunamadı' }
  return { title: page.title }
}

export default async function CookiePolicyPage() {
  const page = await loadStaticPage('cerez-politikasi')
  if (page === null) notFound()

  return <StaticPage eyebrow="Yasal" title={page.title} content={page.content} />
}
```

- [ ] **Adım 6: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:e2e
```

Beklenen: PASS. `npm run build` çıktısında `/hakkimizda`, `/kvkk`, `/cerez-politikasi`
ve `/calisma-alanlari/[slug]` **statik** işaretlenmelidir; değilse `loadStaticPage`
veya sorgu katmanının `'use cache'` bağı kopmuştur.

- [ ] **Adım 7: Mutasyon kanıtı**

1. `src/app/(site)/calisma-alanlari/[slug]/page.tsx` içindeki
   `if (area === null) notFound()` satırı geçici olarak silinir →
   `npm run test:e2e -- tests/e2e/calisma-alanlari.spec.ts` **FAIL**:
   "olmayan çalışma alanı adresi 404 verir" testi 404 yerine 500 görür
   (`area` null olduğu için `area.name` okuması patlar). Satır geri alınır.
2. `src/components/StaticPage.tsx` içindeki `.prose` sınıfı `""` yapılır →
   `npm run test:e2e -- tests/e2e/pages.spec.ts` **FAIL**: üç "gövdesini veritabanından
   alır" testi `.prose` bulamaz. Geri alınır.

- [ ] **Adım 8: Commit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git add src/db/queries/public/static-pages.ts src/components/StaticPage.tsx \
  src/components/PracticeAreaCard.tsx src/components/PracticeAreaCard.module.css \
  src/components/PracticeAreas.tsx src/components/PracticeAreas.module.css \
  src/lib/cache-tags.ts src/app/\(site\)/calisma-alanlari src/app/\(site\)/hakkimizda \
  src/app/\(site\)/kvkk src/app/\(site\)/cerez-politikasi \
  tests/e2e/calisma-alanlari.spec.ts tests/e2e/pages.spec.ts
git commit -m "feat: çalışma alanları ve sabit metin sayfaları veriye bağlandı

/hakkimizda, /kvkk ve /cerez-politikasi ortak StaticPage bileşenini kullanıyor ve
gövdelerini pages tablosundan alıyor; hukuki metinler kodda yazılmadı.
Doğrulama: npm test, npm run lint, npx tsc --noEmit, npm run build, npm run test:e2e."
```

---

### Görev 7: Makale arşivi — `/makaleler` ve `/makaleler/kategori/[slug]`

**Dosyalar:**
- Oluştur: `src/lib/site-url.ts`
- Oluştur: `src/lib/article-archive.ts`
- Oluştur: `src/components/ArticleArchive.tsx`
- Oluştur: `src/components/ArticleArchive.module.css`
- Oluştur: `src/components/Pagination.tsx`
- Oluştur: `src/components/Pagination.module.css`
- Oluştur: `src/app/(site)/makaleler/archive.ts`
- Oluştur: `src/app/(site)/makaleler/kategori/[slug]/page.tsx`
- Oluştur: `src/app/(site)/makaleler/kategori/[slug]/page.module.css`
- Değiştir: `src/app/(site)/makaleler/page.tsx` (yer tutucu içerik silinir)
- Değiştir: `src/app/layout.tsx` (`metadataBase` eklenir)
- Değiştir: `vitest.config.mts` (`env` bloğuna `SITE_URL` eklenir — `site-url.ts` modül
  seviyesinde çözüm yaptığı için bu değişken testte tanımlı olmazsa modülü import eden
  her test dosyası ilk satırda düşer)
- Değiştir: `.env.local`, `.env.example`, `.env.test` (yeni `SITE_URL` satırı)
- Test: `src/lib/site-url.test.ts`, `src/lib/article-archive.test.ts`, `tests/e2e/makale-arsivi.spec.ts`

**Arayüzler:**
- Tüketir (Görev 3'ten, sözleşme §3.1/§3.2):
  `listPublishedArticles(query: ArticleQuery): Promise<ArticlePage>`,
  `listPublicCategories(): Promise<PublicCategory[]>`,
  `getPublicCategoryBySlug(slug: string): Promise<PublicCategory | null>`,
  `ARTICLES_PER_PAGE`, tipler `ArticlePage`, `PublicArticleCard`, `PublicCategory`.
  Ayrıca mevcut: `mediaUrl(relativePath: string): string`, `formatDate(iso: string): string`.
- Üretir (Görev 8, Görev 10 ve Görev 11 bunlara dayanır):
  ```ts
  // src/lib/site-url.ts — TEK SAHİBİ BU GÖREVDİR; Görev 10 yalnız tüketir.
  export function resolveSiteUrl(raw: string | undefined): string
  export const SITE_URL: string
  export function absoluteUrl(path: string): string

  // src/lib/article-archive.ts
  export const SEARCH_PARAM = 'q'
  export const PAGE_PARAM = 'sayfa'
  export const MAX_SEARCH_LENGTH = 80
  export const PAGE_WINDOW = 5
  export type RawSearchParams = Record<string, string | string[] | undefined>
  export function parseSearchTerm(raw: string | string[] | undefined): string | undefined
  export function parsePageNumber(raw: string | string[] | undefined): number
  export function archiveHref(basePath: string, params: { q?: string; page?: number }): string
  export function pageWindow(page: number, pageCount: number): number[]
  ```

**Bu görevin kararları (gerekçeleriyle):**

1. **JavaScript olmadan tam çalışır.** Arama `<form method="get" action={basePath}>`; kategori
   filtresi ve sayfalama `<Link>`. Hiçbir istemci bileşeni yok — `'use client'` yazılmaz.
   Formda gizli `sayfa` alanı **yoktur**: yeni arama daima ilk sayfadan başlamalı.
2. **Aralık dışı sayfa → `notFound()`, son sayfaya kırpma yok.** Kırpma, birbirinden farklı
   onlarca adresin aynı içeriği 200 ile döndürmesi demektir (yumuşak 404); hem tarayıcıya hem
   arama motoruna yalan söyler. Sayısal olmayan / sıfır / negatif değerler ise sözleşme §3.1
   gereği 1'e çekilir, 404 olmaz — adres çubuğuna elle yazılan çöp yüzünden kullanıcı boş
   sayfa görmez.
3. **Arama terimi vurgulanmaz.** `dangerouslySetInnerHTML` ile `<mark>` sarmak, kullanıcının
   yazdığı diziyi HTML olarak sayfaya basmak demektir — doğrudan XSS kapısı. Terim yalnız
   React'in kendi kaçışıyla düz metin olarak gösterilir.
4. **Canonical:** aramasız sayfalarda `archiveHref(...)` çıktısı (yani `?sayfa=1` çıplak adrese
   çözülür, iki adres olarak indekslenmez). **Arama sonucu sayfalarında canonical VERİLMEZ**,
   yerine `robots: { index: false, follow: true }` konur: arama sonucu sonsuz kombinasyon üretir
   ve `noindex` ile `canonical` birlikte çelişkili sinyaldir.
5. **Kategori arşivi aynı bileşeni kullanır.** Veri yükleme `archive.ts::loadArchive` içinde tek
   kopya; iki sayfa arasında yalnız `basePath`, başlık ve `categorySlug` farklıdır.
6. Kapak küçük görselleri `alt=""` ile çizilir: görsel kartın bağlantısının içindedir ve
   başlık zaten bağlantının erişilebilir adını veriyor; `coverAlt` burada okunsaydı ekran
   okuyucu her kartta aynı bilgiyi iki kez duyururdu. Tekil makalede (Görev 8) gerçek `alt` var.

- [ ] **Adım 0: Görev 1'in `cacheComponents` ölçüm notunu oku (ÖLÇÜLECEK)**

Sözleşme §4.1, `cacheComponents` açıkken `searchParams` okuyan sayfanın davranışının
**ölçülmemiş** olduğunu söylüyor. Bu görev **varsayılan olarak Suspense kullanmaz**: sayfa
bileşeni `searchParams`'ı doğrudan `await` eder. Gerekçe: `notFound()` bir Suspense sınırının
içinden atıldığında akış çoktan başlamış olabilir ve yanıt 200 ile gider — yani karar 2
(gerçek 404) sessizce kaybolur.

Uygulayıcı önce şunu yapar:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
grep -n "cacheComponents" next.config.ts || echo "KAPALI"
```

- Çıktı `KAPALI` ise: aşağıdaki kod olduğu gibi uygulanır, ek adım yok.
- `cacheComponents: true` görülüyorsa: Adım 4'teki `npm run build` çıktısı okunur. Derleme
  "dynamic API used outside Suspense" benzeri bir hatayla düşerse **ancak o zaman**
  `src/app/(site)/makaleler/page.tsx` içindeki `<ArticleArchive .../>` çağrısı
  `<Suspense fallback={<p>Yazılar yükleniyor…</p>}>` ile sarılır, `loadArchive` çağrısı ayrı
  bir `async function ArchiveResults({ searchParams })` bileşenine taşınır ve **plan raporuna
  şu satır yazılır:** "Aralık dışı sayfa artık 404 yerine 200 + not-found arayüzü döndürüyor;
  bu ölçülmüş bir ödün, gizlenmedi." Ölçüm yapılmadan bu değişiklik uygulanmaz.

- [ ] **Adım 1: Kırmızı testleri yaz**

`src/lib/site-url.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { absoluteUrl, resolveSiteUrl } from '@/lib/site-url'

describe('resolveSiteUrl', () => {
  it('geçerli adresi normalleştirir', () => {
    expect(resolveSiteUrl('https://ornek.av.tr/')).toBe('https://ornek.av.tr')
  })

  // Sessizce localhost'a düşmek, yayına localhost yazan bir sitemap çıkarmak demekti;
  // arama motoru onu indeksledikten sonra geri alması pahalıdır.
  it('tanımsız değerde fırlatır', () => {
    expect(() => resolveSiteUrl(undefined)).toThrow(/SITE_URL/)
    expect(() => resolveSiteUrl('')).toThrow(/SITE_URL/)
    expect(() => resolveSiteUrl('   ')).toThrow(/SITE_URL/)
  })

  it('adres olmayan değerde fırlatır', () => {
    expect(() => resolveSiteUrl('ornek.av.tr')).toThrow(/geçerli bir adres/)
    expect(() => resolveSiteUrl('javascript:alert(1)')).toThrow()
  })

  // Yol veya sorgu taşıyan bir taban, her canonical'ı ikiye katlanmış bir adrese çevirirdi.
  it('yol, sorgu veya çapa taşıyan adresi reddeder', () => {
    expect(() => resolveSiteUrl('https://ornek.av.tr/alt')).toThrow(/kök adres/)
    expect(() => resolveSiteUrl('https://ornek.av.tr/?a=1')).toThrow(/kök adres/)
  })
})

describe('absoluteUrl', () => {
  it('kök yolu tekrarlanan bölü işareti olmadan birleştirir', () => {
    expect(absoluteUrl('/')).toMatch(/^https?:\/\/[^/]+$/)
    expect(absoluteUrl('/makaleler')).toMatch(/\/makaleler$/)
    expect(absoluteUrl('makaleler')).toBe(absoluteUrl('/makaleler'))
  })
})
```

`src/lib/article-archive.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  MAX_SEARCH_LENGTH,
  archiveHref,
  pageWindow,
  parsePageNumber,
  parseSearchTerm,
} from './article-archive'

describe('parseSearchTerm', () => {
  it('boşlukları kırpar', () => {
    expect(parseSearchTerm('  kira  ')).toBe('kira')
  })

  it('boş ve yalnız boşluktan oluşan terimi yok sayar', () => {
    expect(parseSearchTerm('')).toBeUndefined()
    expect(parseSearchTerm('   ')).toBeUndefined()
    expect(parseSearchTerm(undefined)).toBeUndefined()
  })

  it('tekrarlanan parametrede ilk değeri alır', () => {
    expect(parseSearchTerm(['kira', 'tahliye'])).toBe('kira')
  })

  it('terimi MAX_SEARCH_LENGTH ile sınırlar', () => {
    expect(parseSearchTerm('a'.repeat(500))).toHaveLength(MAX_SEARCH_LENGTH)
  })
})

describe('parsePageNumber', () => {
  it('geçerli sayıyı okur', () => {
    expect(parsePageNumber('3')).toBe(3)
  })

  it('eksik, sayısal olmayan, sıfır ve negatif değeri 1 yapar (sözleşme §3.1)', () => {
    expect(parsePageNumber(undefined)).toBe(1)
    expect(parsePageNumber('abc')).toBe(1)
    expect(parsePageNumber('0')).toBe(1)
    expect(parsePageNumber('-4')).toBe(1)
  })

  it('sayıya benzeyen ama sayfa numarası olmayan biçimleri 1 yapar', () => {
    // Number('2e1') 20 verir, Number(' 2 ') 2 verir; ikisi de adres çubuğundan gelmemeli.
    expect(parsePageNumber('2e1')).toBe(1)
    expect(parsePageNumber(' 2 ')).toBe(1)
  })
})

describe('archiveHref', () => {
  it('ilk sayfa ve aramasız durumda çıplak adres üretir', () => {
    // ?sayfa=1 ile çıplak adres iki ayrı adres olarak indekslenmemeli.
    expect(archiveHref('/makaleler', { page: 1 })).toBe('/makaleler')
    expect(archiveHref('/makaleler', {})).toBe('/makaleler')
  })

  it('sayfa ve aramayı sözleşmedeki parametre adlarıyla yazar', () => {
    expect(archiveHref('/makaleler', { page: 3 })).toBe('/makaleler?sayfa=3')
    expect(archiveHref('/makaleler', { q: 'kira', page: 2 })).toBe('/makaleler?q=kira&sayfa=2')
  })

  it('arama terimini adres için kodlar', () => {
    expect(archiveHref('/makaleler', { q: 'kira & tahliye' })).toBe('/makaleler?q=kira+%26+tahliye')
  })

  it('kategori arşivi için de aynı biçimi üretir', () => {
    expect(archiveHref('/makaleler/kategori/is-hukuku', { page: 2 }))
      .toBe('/makaleler/kategori/is-hukuku?sayfa=2')
  })
})

describe('pageWindow', () => {
  it('pencereye sığan tüm sayfaları verir', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
  })

  it('geçerli sayfayı ortalar', () => {
    expect(pageWindow(6, 12)).toEqual([4, 5, 6, 7, 8])
  })

  it('kenarlarda pencereyi kaydırır, taşırmaz', () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(12, 12)).toEqual([8, 9, 10, 11, 12])
  })
})
```

`tests/e2e/makale-arsivi.spec.ts`:

```ts
import { randomBytes } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { temizlikciAc } from './helpers/db-cleanup'

// Sayfalama sınırını FULLTEXT aramasına bağlamak kırılgan olurdu (jetonlaştırma, min token
// boyu, doğal dil kipi). Onun yerine bu süit kendi kategorisini kuruyor: kategori arşivinin
// sayısı tohum verisinden bağımsız ve tam olarak bilinir.
const SAYFA_BOYUTU = 9
const TOPLAM_YAYIMLI = SAYFA_BOYUTU + 1

type ArsivIcerigi = {
  damga: string
  kategoriSlug: string
  kategoriAdi: string
  taslakSlug: string
  temizle: () => Promise<void>
}

async function arsivIcerigiHazirla(): Promise<ArsivIcerigi> {
  const damga = `e2e${randomBytes(5).toString('hex')}`
  const kategoriSlug = `e2e-arsiv-${damga}`
  const kategoriAdi = `E2E Arşiv ${damga}`
  const taslakSlug = `e2e-taslak-${damga}`
  const temizlikci = await temizlikciAc()

  await temizlikci.calistir('INSERT INTO categories (slug, name, description) VALUES (?, ?, ?)', [
    kategoriSlug,
    kategoriAdi,
    'E2E kategori açıklaması.',
  ])
  const [kategori] = await temizlikci.sorgu<{ id: number }>(
    'SELECT id FROM categories WHERE slug = ?',
    [kategoriSlug],
  )

  for (let i = 0; i < TOPLAM_YAYIMLI; i += 1) {
    // published_at saniye saniye ayrılıyor: eşit tarihlerde sıralama belirsiz kalır ve
    // "2. sayfada tam 1 kayıt" iddiası koşumdan koşuma değişebilirdi.
    await temizlikci.calistir(
      `INSERT INTO articles (slug, title, excerpt, content, category_id, status, published_at)
       VALUES (?, ?, ?, ?, ?, 'published', DATE_SUB(NOW(), INTERVAL ? SECOND))`,
      [
        `e2e-yazi-${i}-${damga}`,
        `E2E Yazı ${i} ${damga}`,
        `E2E özet ${i}.`,
        `<p>E2E gövde ${i}.</p>`,
        kategori.id,
        i,
      ],
    )
  }

  await temizlikci.calistir(
    `INSERT INTO articles (slug, title, excerpt, content, category_id, status)
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [taslakSlug, `E2E Taslak ${damga}`, 'E2E taslak özeti.', '<p>E2E taslak gövdesi.</p>', kategori.id],
  )

  return {
    damga,
    kategoriSlug,
    kategoriAdi,
    taslakSlug,
    async temizle() {
      try {
        // Sıra zorunlu: articles.category_id kısıtı ON DELETE RESTRICT.
        await temizlikci.sil('DELETE FROM articles WHERE title LIKE ?', [`%${damga}%`])
        await temizlikci.sil('DELETE FROM categories WHERE slug = ?', [kategoriSlug])
      } finally {
        await temizlikci.kapat()
      }
    },
  }
}

async function kartBasliklari(page: Page): Promise<string[]> {
  return page.locator('[data-testid="article-card"] h2').allInnerTexts()
}

test.describe('makale arşivi', () => {
  let icerik: ArsivIcerigi

  test.beforeEach(async () => {
    icerik = await arsivIcerigiHazirla()
  })

  test.afterEach(async () => {
    await icerik.temizle()
  })

  test('kategori arşivi ilk sayfada tam sayfa boyutu kadar yazı gösterir', async ({ page }) => {
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}`)
    await expect(page.getByRole('heading', { level: 1, name: icerik.kategoriAdi })).toBeVisible()
    await expect(page.locator('[data-testid="article-card"]')).toHaveCount(SAYFA_BOYUTU)
  })

  test('ikinci sayfa kalan yazıyı gösterir ve etkin bağlantı aria-current taşır', async ({ page }) => {
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}?sayfa=2`)
    await expect(page.locator('[data-testid="article-card"]')).toHaveCount(
      TOPLAM_YAYIMLI - SAYFA_BOYUTU,
    )
    const sayfalama = page.getByRole('navigation', { name: 'Sayfalama' })
    await expect(sayfalama.locator('[aria-current="page"]')).toHaveText(/2/)
    // Birinci sayfada gösterilen başlıklar ikinci sayfada tekrarlanmamalı.
    const ikinci = await kartBasliklari(page)
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}`)
    const birinci = await kartBasliklari(page)
    expect(birinci.filter((baslik) => ikinci.includes(baslik))).toEqual([])
  })

  test('taslak makale arşivde görünmez', async ({ page }) => {
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}`)
    await expect(page.getByText(`E2E Taslak ${icerik.damga}`)).toHaveCount(0)
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}?sayfa=2`)
    await expect(page.getByText(`E2E Taslak ${icerik.damga}`)).toHaveCount(0)
  })

  test('aralık dışı sayfa 404 döner, son sayfaya kırpılmaz', async ({ page }) => {
    const yanit = await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}?sayfa=99`)
    expect(yanit?.status()).toBe(404)
  })

  test('geçersiz sayfa değeri ilk sayfaya çekilir, 404 olmaz', async ({ page }) => {
    const yanit = await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}?sayfa=abc`)
    expect(yanit?.status()).toBe(200)
    await expect(page.locator('[data-testid="article-card"]')).toHaveCount(SAYFA_BOYUTU)
  })

  test('sonuçsuz arama boş durum metni ve temizleme bağlantısı gösterir', async ({ page }) => {
    await page.goto(`/makaleler?q=zzzz${icerik.damga}`)
    await expect(page.getByText('Aramanıza uygun yazı bulunamadı.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Filtreleri temizleyin' })).toHaveAttribute(
      'href',
      '/makaleler',
    )
    // Sayfa sayısı 1 iken sayfalama bölgesi HİÇ çizilmez.
    await expect(page.getByRole('navigation', { name: 'Sayfalama' })).toHaveCount(0)
  })

  test('arama terimi sayfaya ham HTML olarak basılmaz', async ({ page }) => {
    await page.goto('/makaleler?q=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E')
    // Terim düz metin olarak görünür; enjekte edilen etiket DOM'a hiç girmez.
    await expect(page.locator('main img[onerror]')).toHaveCount(0)
    await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
  })

  test('kategori filtresi ve sayfalama gerçek bağlantıdır', async ({ page }) => {
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}`)
    const filtre = page.getByRole('navigation', { name: 'Kategoriler' })
    await expect(filtre.getByRole('link', { name: /Tümü/ })).toHaveAttribute('href', '/makaleler')
    await expect(filtre.locator('[aria-current="page"]')).toContainText(icerik.kategoriAdi)
    const sonraki = page.getByRole('link', { name: /Sonraki/ })
    await expect(sonraki).toHaveAttribute('href', /sayfa=2$/)
  })

  test('arşiv erişilebilirlik denetimini geçer', async ({ page }) => {
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}`)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations).toEqual([])
  })
})

// JavaScript kapalıyken arama, filtre ve sayfalama çalışmak ZORUNDA (görev kararı 1).
test.describe('arşiv JavaScript olmadan', () => {
  test.use({ javaScriptEnabled: false })

  let icerik: ArsivIcerigi

  test.beforeEach(async () => {
    icerik = await arsivIcerigiHazirla()
  })

  test.afterEach(async () => {
    await icerik.temizle()
  })

  test('arama formu GET ile gönderilir', async ({ page }) => {
    await page.goto('/makaleler')
    const form = page.getByRole('search')
    await expect(form).toHaveAttribute('method', 'get')
    await expect(form).toHaveAttribute('action', '/makaleler')
    await page.getByLabel('Makalelerde ara').fill(icerik.damga)
    await page.getByRole('button', { name: 'Ara' }).click()
    await expect(page).toHaveURL(new RegExp(`/makaleler\\?q=${icerik.damga}$`))
  })

  test('sayfalama bağlantısı JavaScript olmadan ikinci sayfayı açar', async ({ page }) => {
    await page.goto(`/makaleler/kategori/${icerik.kategoriSlug}`)
    await page.getByRole('link', { name: /Sonraki/ }).click()
    await expect(page).toHaveURL(/sayfa=2$/)
    await expect(page.locator('[data-testid="article-card"]')).toHaveCount(
      TOPLAM_YAYIMLI - SAYFA_BOYUTU,
    )
  })
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/site-url.test.ts src/lib/article-archive.test.ts
```
Beklenen: FAIL — `Failed to resolve import "@/lib/site-url"` ve `"./article-archive"` (modüller yok).

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx playwright test tests/e2e/makale-arsivi.spec.ts --project=masaustu
```
Beklenen: FAIL — `/makaleler` yer tutucu metin gösterdiği için `[data-testid="article-card"]`
hiç bulunamaz; `/makaleler/kategori/...` ise 404 döner (rota yok).

- [ ] **Adım 3: En küçük uygulamayı yaz**

`vitest.config.mts` (değişiklik — `env` bloğu):

```ts
    // site-url.ts modül seviyesinde SITE_URL'i çözüyor ve değişken yoksa FIRLATIYOR
    // (gerekçesi orada). Değer testte de tanımlı olmalı, yoksa o modülü import eden her
    // test dosyası daha ilk satırda düşer.
    env: { TZ: 'America/New_York', SITE_URL: 'https://test.ornek.av.tr' },
```

`src/lib/site-url.ts`:

```ts
/**
 * Ham ortam değerini normalleştirilmiş kök adrese çevirir.
 *
 * FIRLATIYOR, varsayılana DÜŞMÜYOR. Sessizce `http://localhost:3000` yazan bir sürüm,
 * `localhost` adresleriyle dolu bir `sitemap.xml`'i ve her sayfada yanlış bir canonical'ı
 * yayına çıkarırdı. Arama motoru bunları indeksledikten sonra geri almak haftalar sürer;
 * derlemenin durması ise dakikalar. Ucuz hatayı seçiyoruz.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  const deger = (raw ?? '').trim()
  if (deger === '') {
    throw new Error(
      'SITE_URL tanımlı değil. Örnek: SITE_URL=https://ornek.av.tr',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(deger)
  } catch (error) {
    // Özgün hata `cause` ile taşınıyor; yutulmuyor.
    throw new Error(`SITE_URL geçerli bir adres değil: ${deger}`, { cause: error })
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`SITE_URL http veya https olmalı: ${deger}`)
  }
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new Error(`SITE_URL kök adres olmalı (yol, sorgu veya çapa taşımamalı): ${deger}`)
  }
  return `${parsed.protocol}//${parsed.host}`
}

// Modül seviyesinde çözülüyor: `next build` kök layout'un metadata'sını değerlendirirken
// bu modülü yüklüyor, yani değişken eksikse DERLEME DÜŞER — tam olarak istenen davranış.
export const SITE_URL = resolveSiteUrl(process.env.SITE_URL)

export function absoluteUrl(path: string): string {
  const temiz = path.startsWith('/') ? path : `/${path}`
  return temiz === '/' ? SITE_URL : `${SITE_URL}${temiz}`
}
```

`src/lib/article-archive.ts`:

```ts
// Sorgu parametresi adları sözleşme §4'te sabit. Tek yerde toplanıyor: sayfa, bileşen ve
// canonical üreteci aynı dizeyi okusun, elle yazılan bir ad sessizce eşleşmeyi kaçırmasın.
export const SEARCH_PARAM = 'q'
export const PAGE_PARAM = 'sayfa'

// Adres çubuğundan gelen değer güvenilmezdir. 80 karakter hem FULLTEXT sorgusunu hem de
// sayfada gösterilen "… için sonuçlar" satırını makul sınırda tutar.
export const MAX_SEARCH_LENGTH = 80

// Sayfalamada aynı anda çizilen en fazla sayfa numarası. Tek sayı: geçerli sayfa ortada durur.
export const PAGE_WINDOW = 5

export type RawSearchParams = Record<string, string | string[] | undefined>

// `?q=a&q=b` dizi verir. İlkini almak, diziyi metne çevirip "a,b" aratmaktan öngörülebilir.
function ilkDeger(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseSearchTerm(raw: string | string[] | undefined): string | undefined {
  const deger = ilkDeger(raw)?.trim()
  if (!deger) return undefined
  return deger.slice(0, MAX_SEARCH_LENGTH)
}

/** Geçersiz, eksik, sıfır ve negatif sayfa 1'e çekilir (sözleşme §3.1). */
export function parsePageNumber(raw: string | string[] | undefined): number {
  const deger = ilkDeger(raw)
  if (deger === undefined) return 1
  // Number() yerine desen denetimi: Number(' 2 ') ve Number('2e1') sayı üretir, ikisi de
  // adres çubuğunda sayfa numarası olarak beklenen bir şey değil.
  if (!/^\d+$/.test(deger)) return 1
  const sayi = Number(deger)
  return sayi >= 1 ? sayi : 1
}

export type ArchiveHrefParams = { q?: string; page?: number }

/**
 * Arşiv adresi üretir. İlk sayfa ve aramasız durumda çıplak adres döner — canonical de bu
 * fonksiyondan geliyor, `?sayfa=1` ile çıplak adres iki ayrı adres olarak indekslenmesin.
 */
export function archiveHref(basePath: string, { q, page = 1 }: ArchiveHrefParams): string {
  const params = new URLSearchParams()
  if (q) params.set(SEARCH_PARAM, q)
  if (page > 1) params.set(PAGE_PARAM, String(page))
  const sorgu = params.toString()
  return sorgu ? `${basePath}?${sorgu}` : basePath
}

/** Geçerli sayfanın çevresinde en çok PAGE_WINDOW numara; kenarlarda pencere kaydırılır. */
export function pageWindow(page: number, pageCount: number): number[] {
  const boyut = Math.min(PAGE_WINDOW, pageCount)
  if (boyut < 1) return []
  const yarim = Math.floor(boyut / 2)
  const baslangic = Math.min(Math.max(page - yarim, 1), pageCount - boyut + 1)
  return Array.from({ length: boyut }, (_, i) => baslangic + i)
}
```

`src/components/Pagination.module.css`:

```css
.nav {
  margin-top: 48px;
}

.list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.page,
.current,
.step,
.stepDisabled {
  display: inline-block;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-size: 15px;
}

.page { color: var(--text-muted); }
.step { color: var(--text); }

/* Etkin sayfa yalnız renkle değil kenarlık ve yazı kalınlığıyla da ayrışır (WCAG 1.4.1). */
.current {
  color: var(--text);
  border-color: var(--accent);
  font-weight: 600;
}

.stepDisabled {
  color: var(--text-muted);
  border-color: transparent;
}

/* Ekran okuyucuya "Sayfa 3" duyurulur, gözle yalnız "3" görünür; display:none kullanılmaz,
   o metni erişilebilirlik ağacından da düşürürdü. */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

`src/components/Pagination.tsx`:

```tsx
import Link from 'next/link'
import { archiveHref, pageWindow } from '@/lib/article-archive'
import styles from './Pagination.module.css'

type PaginationProps = {
  basePath: string
  page: number
  pageCount: number
  searchTerm?: string
}

export function Pagination({ basePath, page, pageCount, searchTerm }: PaginationProps) {
  // Tek sayfalık arşivde sayfalama HİÇ çizilmez: gidilecek yeri olmayan bir gezinme bölgesi
  // ekran okuyucuda yalnızca gürültüdür.
  if (pageCount <= 1) return null

  const numaralar = pageWindow(page, pageCount)

  return (
    <nav aria-label="Sayfalama" className={styles.nav}>
      <ul className={styles.list}>
        <li>
          {page > 1 ? (
            <Link href={archiveHref(basePath, { q: searchTerm, page: page - 1 })} rel="prev" className={styles.step}>
              <span aria-hidden="true">←</span> Önceki
            </Link>
          ) : (
            // href'siz <a> yerine <span>: href'siz bağlantı odaklanılabilir değildir ve
            // "bağlantı" diye duyurulup hiçbir yere gitmemesi kullanıcıyı yanıltır.
            <span className={styles.stepDisabled}>Önceki</span>
          )}
        </li>

        {numaralar.map((numara) => (
          <li key={numara}>
            <Link
              href={archiveHref(basePath, { q: searchTerm, page: numara })}
              aria-current={numara === page ? 'page' : undefined}
              className={numara === page ? styles.current : styles.page}
            >
              <span className={styles.srOnly}>Sayfa </span>
              {numara}
            </Link>
          </li>
        ))}

        <li>
          {page < pageCount ? (
            <Link href={archiveHref(basePath, { q: searchTerm, page: page + 1 })} rel="next" className={styles.step}>
              Sonraki <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className={styles.stepDisabled}>Sonraki</span>
          )}
        </li>
      </ul>
    </nav>
  )
}
```

`src/components/ArticleArchive.module.css`:

```css
.search {
  margin-bottom: 32px;
}

.searchLabel {
  display: block;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.searchRow {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.searchInput {
  /* flex-basis mobilde tek satıra, masaüstünde düğmenin yanına oturur. min-width:0 olmadan
     flex öğesi kendi içeriğinden küçülemez ve dar ekranda satırı taşırır. */
  flex: 1 1 240px;
  min-width: 0;
  background: var(--surface-raised);
  color: var(--text);
  border: 1px solid var(--field-border);
  border-radius: var(--radius-pill);
  padding: 12px 20px;
  font: inherit;
}

.searchButton {
  background: var(--accent);
  /* Altın dolgunun üstündeki metin: --gold / --ink çifti spec §8'de 7.5:1 ölçüldü. */
  color: var(--ink);
  border: 0;
  border-radius: var(--radius-pill);
  padding: 12px 28px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.filters {
  margin-bottom: 40px;
}

.filterList {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filterLink {
  display: inline-block;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 8px 18px;
  font-size: 14px;
  color: var(--text-muted);
}

/* Etkin filtre renkten başka bir işaret de taşır (WCAG 1.4.1). */
.filterLink[aria-current='page'] {
  color: var(--text);
  border-color: var(--accent);
  font-weight: 600;
}

.summary {
  color: var(--text-muted);
  margin-bottom: 24px;
}

.empty {
  color: var(--text-muted);
}

.grid {
  list-style: none;
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
}

@media (min-width: 700px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1000px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

.card {
  /* Kart yüzeyi global .card sınıfından geliyor; burada yalnız dikey hizalama var:
     farklı uzunluktaki özetlerde tarih satırı aynı hizada kalsın. */
  display: flex;
}

.cardLink {
  display: grid;
  gap: 10px;
  align-content: start;
  width: 100%;
}

.thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--surface-raised);
}

.thumbImage {
  object-fit: cover;
}

.category {
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.cardTitle {
  font-size: 22px;
}

.excerpt {
  color: var(--text-muted);
  font-size: 15px;
}

.date {
  color: var(--text-muted);
  font-size: 14px;
}
```

`src/components/ArticleArchive.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { ArticlePage } from '@/db/queries/public/articles'
import type { PublicCategory } from '@/db/queries/public/categories'
import { MAX_SEARCH_LENGTH, SEARCH_PARAM, archiveHref } from '@/lib/article-archive'
import { formatDate } from '@/lib/date'
import { mediaUrl } from '@/lib/media-url'
import { Pagination } from './Pagination'
import styles from './ArticleArchive.module.css'

const ARCHIVE_PATH = '/makaleler'

type ArticleArchiveProps = {
  /** Arama formunun ve sayfalamanın hedefi: '/makaleler' veya '/makaleler/kategori/<slug>'. */
  basePath: string
  result: ArticlePage
  categories: PublicCategory[]
  searchTerm?: string
  activeCategorySlug?: string
}

// Tümüyle sunucu bileşeni: arama bir GET formu, filtre ve sayfalama bağlantı olduğu için
// JavaScript olmadan da çalışır (Görev 7 kararı 1).
export function ArticleArchive({
  basePath,
  result,
  categories,
  searchTerm,
  activeCategorySlug,
}: ArticleArchiveProps) {
  return (
    <>
      {/* action bulunulan arşivin adresi: kategori arşivinde arama o kategoride kalır.
          Gizli `sayfa` alanı YOK — yeni arama daima ilk sayfadan başlamalı. */}
      <form method="get" action={basePath} role="search" className={styles.search}>
        <label htmlFor="article-search" className={styles.searchLabel}>
          Makalelerde ara
        </label>
        <div className={styles.searchRow}>
          <input
            id="article-search"
            type="search"
            name={SEARCH_PARAM}
            defaultValue={searchTerm ?? ''}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Örneğin: kira"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Ara
          </button>
        </div>
      </form>

      <nav aria-label="Kategoriler" className={styles.filters}>
        <ul className={styles.filterList}>
          <li>
            {/* Arama terimi filtre değişiminde korunuyor; sayfa numarası korunmuyor —
                başka bir kategorinin 4. sayfası çoğu zaman yoktur. */}
            <Link
              href={archiveHref(ARCHIVE_PATH, { q: searchTerm })}
              aria-current={activeCategorySlug ? undefined : 'page'}
              className={styles.filterLink}
            >
              Tümü
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={archiveHref(`${ARCHIVE_PATH}/kategori/${category.slug}`, { q: searchTerm })}
                aria-current={category.slug === activeCategorySlug ? 'page' : undefined}
                className={styles.filterLink}
              >
                {category.name} ({category.articleCount})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {result.items.length === 0 ? (
        <p className={styles.empty}>
          Aramanıza uygun yazı bulunamadı.{' '}
          <Link href={ARCHIVE_PATH} className="textLink">
            Filtreleri temizleyin
          </Link>
        </p>
      ) : (
        <>
          <p className={styles.summary}>
            {/* searchTerm React tarafından kaçırılıyor. Terimi <mark> ile vurgulamak için
                dangerouslySetInnerHTML kullanmak, kullanıcının yazdığı diziyi HTML olarak
                basmak demektir — doğrudan XSS kapısı, bilerek yapılmadı. */}
            {searchTerm
              ? `“${searchTerm}” için ${result.total} sonuç`
              : `${result.total} yazı`}
          </p>
          <ul className={styles.grid}>
            {result.items.map((article) => {
              // formatDate ISO dize alıyor ve UTC'ye sabitli; <time dateTime> ile aynı
              // kaynaktan üretiliyor ki görünen tarihle öznitelik çelişmesin.
              const isoDate = article.publishedAt.toISOString().slice(0, 10)
              return (
                <li key={article.slug} className={`card ${styles.card}`} data-testid="article-card">
                  <Link href={`${ARCHIVE_PATH}/${article.slug}`} className={styles.cardLink}>
                    {article.coverPath ? (
                      <span className={styles.thumb}>
                        {/* alt="" bilinçli: görsel bağlantının içinde ve bağlantının
                            erişilebilir adını zaten başlık veriyor. coverAlt burada
                            okunsaydı ekran okuyucu aynı bilgiyi iki kez duyururdu.
                            Tekil makale sayfasında gerçek alt metni kullanılıyor. */}
                        {/* fill ile sizes ZORUNLU: verilmezse Next 100vw varsayar ve üç
                            sütunlu ızgarada ~360px'lik bir kutuya tam genişlik görsel
                            indirir. Değerler ızgaranın kırılma noktalarını izliyor. */}
                        <Image
                          src={mediaUrl(article.coverPath)}
                          alt=""
                          fill
                          sizes="(min-width: 1000px) 360px, (min-width: 700px) 50vw, 100vw"
                          className={styles.thumbImage}
                        />
                      </span>
                    ) : null}
                    <span className={styles.category}>{article.categoryName ?? 'Makale'}</span>
                    <h2 className={styles.cardTitle}>{article.title}</h2>
                    <span className={styles.excerpt}>{article.excerpt}</span>
                    <time dateTime={isoDate} className={styles.date}>
                      {formatDate(isoDate)}
                    </time>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Pagination
        basePath={basePath}
        page={result.page}
        pageCount={result.pageCount}
        searchTerm={searchTerm}
      />
    </>
  )
}
```

`src/app/(site)/makaleler/archive.ts`:

```ts
import { notFound } from 'next/navigation'
import { listPublishedArticles, type ArticlePage } from '@/db/queries/public/articles'
import { listPublicCategories, type PublicCategory } from '@/db/queries/public/categories'
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  parsePageNumber,
  parseSearchTerm,
  type RawSearchParams,
} from '@/lib/article-archive'

export type ArchiveData = {
  result: ArticlePage
  categories: PublicCategory[]
  searchTerm?: string
}

/**
 * `/makaleler` ve `/makaleler/kategori/[slug]` sayfalarının ORTAK veri yolu; iki rotanın
 * arama/sayfalama davranışı tek kopyada tutuluyor. Rota dizininde duruyor çünkü yalnız bu
 * iki sayfaya ait; genel bir yardımcı değil.
 */
export async function loadArchive(
  params: RawSearchParams,
  categorySlug?: string,
): Promise<ArchiveData> {
  const searchTerm = parseSearchTerm(params[SEARCH_PARAM])
  const istenenSayfa = parsePageNumber(params[PAGE_PARAM])

  const [result, categories] = await Promise.all([
    listPublishedArticles({ q: searchTerm, categorySlug, page: istenenSayfa }),
    listPublicCategories(),
  ])

  // Aralık dışı sayfa son sayfaya KIRPILMIYOR: kırpma, farklı onlarca adresin aynı içeriği
  // 200 ile döndürmesi (yumuşak 404) demektir. parsePageNumber sayısal olmayan değerleri
  // zaten 1 yaptığı ve pageCount en az 1 olduğu için, boş arşivin ilk sayfası buraya düşmez.
  if (istenenSayfa > result.pageCount) notFound()

  return { result, categories, searchTerm }
}
```

`src/app/(site)/makaleler/page.tsx` (tam içerik — yer tutucu silinir):

```tsx
import type { Metadata } from 'next'
import { ArticleArchive } from '@/components/ArticleArchive'
import { PageHeading } from '@/components/PageHeading'
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  archiveHref,
  parsePageNumber,
  parseSearchTerm,
  type RawSearchParams,
} from '@/lib/article-archive'
import { loadArchive } from './archive'

const BASE_PATH = '/makaleler'

type ArticlesPageProps = { searchParams: Promise<RawSearchParams> }

export async function generateMetadata({ searchParams }: ArticlesPageProps): Promise<Metadata> {
  // Next 16'da searchParams bir Promise; await edilmeden okunamaz (sözleşme §4.1).
  const params = await searchParams
  const q = parseSearchTerm(params[SEARCH_PARAM])
  const page = parsePageNumber(params[PAGE_PARAM])

  if (q) {
    // Arama sonucu sayfası indekslenmez: aynı içeriğin sonsuz kombinasyonunu üretir.
    // canonical VERİLMİYOR — noindex ile canonical birlikte çelişkili sinyaldir.
    return { title: `“${q}” araması`, robots: { index: false, follow: true } }
  }

  return {
    title: page > 1 ? `Makaleler — sayfa ${page}` : 'Makaleler',
    description: 'Büronun yayımladığı hukuk yazıları.',
    // archiveHref sayfa 1'i çıplak adrese çözer; ?sayfa=1 ayrı adres olarak indekslenmez.
    alternates: { canonical: archiveHref(BASE_PATH, { page }) },
  }
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams
  const { result, categories, searchTerm } = await loadArchive(params)

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Yayınlar" title="Makaleler" />
      <ArticleArchive
        basePath={BASE_PATH}
        result={result}
        categories={categories}
        searchTerm={searchTerm}
      />
    </div>
  )
}
```

`src/app/(site)/makaleler/kategori/[slug]/page.module.css`:

```css
.lead {
  color: var(--text-muted);
  max-width: 68ch;
  /* PageHeading'in alt boşluğu bir bölüm kadar; açıklama başlığa yapışmasın diye
     başlıktan sonra değil, filtrelerden önce kendi ritmini taşır. */
  margin-bottom: 40px;
  margin-top: calc(var(--section) * -1 + 24px);
}
```

`src/app/(site)/makaleler/kategori/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicCategoryBySlug } from '@/db/queries/public/categories'
import { ArticleArchive } from '@/components/ArticleArchive'
import { PageHeading } from '@/components/PageHeading'
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  archiveHref,
  parsePageNumber,
  parseSearchTerm,
  type RawSearchParams,
} from '@/lib/article-archive'
import { loadArchive } from '../../archive'
import styles from './page.module.css'

type CategoryPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<RawSearchParams>
}

function basePath(slug: string): string {
  return `/makaleler/kategori/${slug}`
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  // params ve searchParams'ın İKİSİ de Promise (sözleşme §4.1); ikisi de await edilir.
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const category = await getPublicCategoryBySlug(slug)

  if (!category) {
    return { title: 'Sayfa bulunamadı', robots: { index: false, follow: false } }
  }

  const q = parseSearchTerm(query[SEARCH_PARAM])
  const page = parsePageNumber(query[PAGE_PARAM])

  if (q) {
    return { title: `${category.name} — “${q}” araması`, robots: { index: false, follow: true } }
  }

  return {
    title: page > 1 ? `${category.name} — sayfa ${page}` : category.name,
    description: category.description ?? undefined,
    alternates: { canonical: archiveHref(basePath(slug), { page }) },
  }
}

export default async function CategoryArchivePage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  // generateMetadata da bu satırı çağırıyor. İkinci okuma bilinçli: sorgu benzersiz indeksli
  // tek satırlık bir arama ve Görev 3 onu 'use cache' altında tutuyor; paylaşılan modül
  // seviyesinde bellek tutmak sunucu bileşenleri arasında sızıntı riski taşırdı.
  const category = await getPublicCategoryBySlug(slug)
  if (!category) notFound()

  const { result, categories, searchTerm } = await loadArchive(query, slug)

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Makale kategorisi" title={category.name} />
      {category.description ? <p className={styles.lead}>{category.description}</p> : null}
      <ArticleArchive
        basePath={basePath(slug)}
        result={result}
        categories={categories}
        searchTerm={searchTerm}
        activeCategorySlug={slug}
      />
    </div>
  )
}
```

`src/app/layout.tsx` — yalnız iki satır değişir:

```ts
import { SITE_URL } from '@/lib/site-url'
```

```ts
export const metadata: Metadata = {
  // Canonical ve Open Graph adreslerinin çözüleceği kök. Verilmezse Next üretimde de
  // localhost'a çözer ve site yanlış adresle indekslenir.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: 'Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık.',
}
```

`.env.local` (depoya girmez), `.env.example` ve `.env.test` (dosya sonuna eklenir):

```dotenv
# Mutlak adres üretimi (canonical, Open Graph, sitemap, RSS). Tanımsızsa DERLEME DÜŞER —
# localhost yazılmış bir canonical ya da sitemap yayına çıkarsa geri alması pahalı olur.
SITE_URL=http://localhost:3000
```

- [ ] **Adım 4: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test && npx tsc --noEmit && npm run lint && npm run build
```
Beklenen: PASS; `npm run build` çıktısında `/makaleler` ve `/makaleler/kategori/[slug]`
rotaları görünür. (Adım 0'daki `cacheComponents` şartı burada değerlendirilir.)

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx playwright test tests/e2e/makale-arsivi.spec.ts
```
Beklenen: PASS (masaustu ve mobil projelerin ikisinde).

- [ ] **Adım 5: Mutasyon kanıtı**

Üç bozma, tek tek yapılır ve her biri geri alınır:

1. `src/lib/article-archive.ts` içinde `if (page > 1) params.set(PAGE_PARAM, String(page))`
   satırı `if (page >= 1) params.set(PAGE_PARAM, String(page))` yapılır.
   Beklenen kırmızı: `archiveHref > ilk sayfa ve aramasız durumda çıplak adres üretir`
   (`'/makaleler?sayfa=1'` alır, `'/makaleler'` bekler). Geri al.
2. `src/app/(site)/makaleler/archive.ts` içinde `if (istenenSayfa > result.pageCount) notFound()`
   satırı silinir. Beklenen kırmızı: e2e `aralık dışı sayfa 404 döner, son sayfaya kırpılmaz`
   (200 alır). Geri al.
3. `src/components/Pagination.tsx` içinde `if (pageCount <= 1) return null` satırı silinir.
   Beklenen kırmızı: e2e `sonuçsuz arama boş durum metni ve temizleme bağlantısı gösterir`
   (Sayfalama bölgesi 0 yerine 1 bulunur). Geri al.
4. `src/lib/site-url.ts` içinde boş değer kontrolü `if (deger === '')` yerine `if (false)`
   yapılır. Beklenen kırmızı: `resolveSiteUrl > tanımsız değerde fırlatır`. Geri al.

- [ ] **Adım 6: Commit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git add src/lib/site-url.ts src/lib/site-url.test.ts src/lib/article-archive.ts \
  src/lib/article-archive.test.ts src/components/ArticleArchive.tsx \
  src/components/ArticleArchive.module.css src/components/Pagination.tsx \
  src/components/Pagination.module.css "src/app/(site)/makaleler" src/app/layout.tsx \
  vitest.config.mts .env.example tests/e2e/makale-arsivi.spec.ts
git commit -m "feat: makale arşivi, arama, kategori filtresi ve sayfalama

JavaScript olmadan çalışır: arama GET formu, filtre ve sayfalama bağlantı.
Aralık dışı sayfa notFound(); geçersiz değer ilk sayfaya çekilir.
Doğrulama: npm test, npx tsc --noEmit, npm run lint, npm run build,
npx playwright test tests/e2e/makale-arsivi.spec.ts (masaustu + mobil).
Mutasyon kanıtı: archiveHref sayfa koşulu, arşiv 404 koşulu, sayfalama
tek-sayfa koşulu tek tek bozuldu, üç test kırmızıya döndü, geri alındı."
```

---

### Görev 8: Tekil makale — `/makaleler/[slug]` (krem okuma zemini)

**Dosyalar:**
- Oluştur: `src/lib/json-ld.ts`
- Oluştur: `src/components/JsonLd.tsx`
- Oluştur: `src/app/(site)/makaleler/[slug]/page.tsx`
- Oluştur: `src/app/(site)/makaleler/[slug]/page.module.css`
- Test: `src/lib/json-ld.test.ts`, `tests/e2e/makale-detay.spec.ts`

**Arayüzler:**
- Tüketir: `getPublishedArticleBySlug(slug: string): Promise<PublicArticleDetail | null>`,
  `listArticleFeedEntries(): Promise<PublicArticleCard[]>` (sözleşme §3.1),
  `getSettings(): Promise<Settings>` (sözleşme §3.5, mevcut `src/db/queries/settings.ts`),
  `mediaUrl`, `formatDate`, `SITE_URL` ve `absoluteUrl(path)` (Görev 7).
- Üretir:
  ```ts
  // src/lib/json-ld.ts
  export function jsonLdScriptContent(data: unknown): string
  export type ArticleSchemaInput = {
    article: PublicArticleDetail
    articleUrl: string
    publisherName: string
    imageUrl?: string
    authorUrl?: string
  }
  export function articleJsonLd(input: ArticleSchemaInput): Record<string, unknown>

  // src/components/JsonLd.tsx
  export function JsonLd({ data }: { data: unknown }): ReactElement
  ```
  `src/lib/json-ld.ts` dosyasının **sahibi bu görevdir.** Görev 10 aynı dosyaya
  `legalServiceJsonLd`'yi **ekler**, dosyayı yeniden oluşturmaz ve `jsonLdScriptContent`'i
  ikinci kez tanımlamaz; `LegalService` şemasını da **aynı** `JsonLd` bileşeniyle basar,
  ikinci bir `<script>` kaçış yolu yazılmaz.

**Bu görevin kararları (gerekçeleriyle):**

1. **Krem zemin yalnız okuma alanında.** `<article data-surface="paper">` — zemin, metin,
   ayraç ve odak halkası `globals.css` içindeki yüzey sözleşmesinden gelir; modülde hiçbir
   renk değeri yazılmaz. Başlık, alt bilgi ve kabuk koyu kalır (spec §7 "okuma zemini").
2. **Kapak görselinde `fill` kullanılır.** Sözleşme §3.1'deki `PublicArticleDetail` kapak
   görselinin **piksel boyutlarını taşımıyor** (`media` tablosunda var ama tipe girmemiş).
   `width`/`height`'ı uydurmak yerine `fill` + CSS `aspect-ratio` seçildi; düzen kayması
   kapsayıcının oranıyla önlenir, sözleşmeye dokunulmaz.
3. **JSON-LD kaçışı zorunlu.** `src/lib/sanitize.ts` sonundaki uyarı birebir uygulanıyor:
   `<script type="application/ld+json">` gövdesi ham metindir, React'in kaçışı orada devrede
   değildir; başlıktaki bir `</script>` dizisi belgeyi erken kapatır. `<`, `>` ve `&`
   karakterleri JSON birim kaçışıyla yazılır. `&` de kaçırılıyor: aksi hâlde metindeki
   `&lt;/script&gt;` HTML varlık çözümüyle geri `</script>` hâline gelebilir.
4. **`aggregateRating` ve `review` şemaya KONMAZ** (spec §2.1 ve §10 — yıldız işaretlemesi
   reklam sayılır). Bu, testle sabitlenir; yorumla geçiştirilmez.
5. **"İlgili yazılar" bölümü EKLENMİYOR.** Sözleşme §3.1'de böyle bir sorgu imzası yok; yeni
   imza uydurmak sözleşmeyi tek taraflı değiştirmek olurdu. Kullanıcının okumaya devam etme
   yolu kategori bağlantısı ve "Tüm makaleler" bağlantısıdır — bunlar zaten var (YAGNI).
6. **`generateStaticParams`** yayımlanmış makaleleri önceden üretir. Listede olmayan slug
   istekte çizilir ve `getPublishedArticleBySlug` `null` döndüğü için `notFound()` olur;
   taslak adresi bu yüzden hiçbir zaman içerik sızdırmaz.

- [ ] **Adım 1: Kırmızı testleri yaz**

`src/lib/json-ld.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { PublicArticleDetail } from '@/db/queries/public/articles'
import { articleJsonLd, jsonLdScriptContent } from './json-ld'

function makale(overrides: Partial<PublicArticleDetail> = {}): PublicArticleDetail {
  return {
    slug: 'kira-tespit-davasi',
    title: 'Kira Tespit Davası',
    excerpt: 'Kira bedelinin tespiti davasında süreler.',
    content: '<p>Gövde</p>',
    publishedAt: new Date('2026-03-01T09:00:00Z'),
    updatedAt: new Date('2026-03-05T12:30:00Z'),
    metaTitle: null,
    metaDescription: null,
    categoryName: 'Kira Hukuku',
    categorySlug: 'kira-hukuku',
    authorName: 'Tolga Akıl',
    authorSlug: 'tolga-akil',
    coverPath: null,
    coverAlt: null,
    ...overrides,
  }
}

describe('jsonLdScriptContent', () => {
  it('düz veriyi çözülebilir JSON olarak üretir', () => {
    expect(JSON.parse(jsonLdScriptContent({ '@type': 'Article', headline: 'Başlık' }))).toEqual({
      '@type': 'Article',
      headline: 'Başlık',
    })
  })

  it('</script> dizisini script gövdesinde bırakmaz', () => {
    const cikti = jsonLdScriptContent({ headline: '</script><img src=x onerror=alert(1)>' })
    // Ham dizi çıktıda HİÇ bulunmamalı; bulunursa belge orada erken kapanır.
    expect(cikti).not.toContain('</script>')
    expect(cikti).not.toContain('<')
    // Kaçış anlamı DEĞİŞTİRMEZ: JSON çözücü aynı diziyi geri verir.
    expect(JSON.parse(cikti)).toEqual({ headline: '</script><img src=x onerror=alert(1)>' })
  })

  it('& karakterini de kaçırır', () => {
    const cikti = jsonLdScriptContent({ headline: 'Kira &lt;/script&gt; tespiti' })
    expect(cikti).not.toContain('&')
    expect(JSON.parse(cikti).headline).toBe('Kira &lt;/script&gt; tespiti')
  })

  it('Türkçe harfleri bozmaz', () => {
    expect(JSON.parse(jsonLdScriptContent({ t: 'İşçi ğüşöç' })).t).toBe('İşçi ğüşöç')
  })
})

describe('articleJsonLd', () => {
  const temel = {
    articleUrl: 'https://akilhukuk.example/makaleler/kira-tespit-davasi',
    publisherName: 'Akıl Hukuk Bürosu',
  }

  it('Article şeması üretir ve tarihleri ISO olarak yazar', () => {
    const sema = articleJsonLd({ article: makale(), ...temel })
    expect(sema['@type']).toBe('Article')
    expect(sema.headline).toBe('Kira Tespit Davası')
    expect(sema.datePublished).toBe('2026-03-01T09:00:00.000Z')
    expect(sema.dateModified).toBe('2026-03-05T12:30:00.000Z')
  })

  it('aggregateRating ve review ASLA üretmez (spec §2.1, §10)', () => {
    const sema = articleJsonLd({ article: makale(), ...temel })
    expect(sema).not.toHaveProperty('aggregateRating')
    expect(sema).not.toHaveProperty('review')
    expect(jsonLdScriptContent(sema)).not.toMatch(/aggregateRating|review/)
  })

  it('meta açıklama boşsa özete düşer', () => {
    expect(articleJsonLd({ article: makale(), ...temel }).description).toBe(
      'Kira bedelinin tespiti davasında süreler.',
    )
    expect(
      articleJsonLd({ article: makale({ metaDescription: 'Elle yazılmış açıklama.' }), ...temel })
        .description,
    ).toBe('Elle yazılmış açıklama.')
  })

  it('yazar yoksa author alanını hiç yazmaz', () => {
    const sema = articleJsonLd({
      article: makale({ authorName: null, authorSlug: null }),
      ...temel,
    })
    // Boş bir Person nesnesi, yazarı olmayan makaleyi yazarı varmış gibi gösterirdi.
    expect(sema).not.toHaveProperty('author')
  })

  it('yazar adresi verildiğinde Person nesnesine koyar', () => {
    const sema = articleJsonLd({
      article: makale(),
      ...temel,
      authorUrl: 'https://akilhukuk.example/kadro/tolga-akil',
    })
    expect(sema.author).toEqual({
      '@type': 'Person',
      name: 'Tolga Akıl',
      url: 'https://akilhukuk.example/kadro/tolga-akil',
    })
  })
})
```

`tests/e2e/makale-detay.spec.ts`:

```ts
import { randomBytes } from 'node:crypto'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { temizlikciAc } from './helpers/db-cleanup'

const KREM_ZEMIN = 'rgb(239, 236, 227)'

type DetayIcerigi = {
  damga: string
  yayimliSlug: string
  yayimliBaslik: string
  taslakSlug: string
  taslakBaslik: string
  taslakGizliMetin: string
  kategoriAdi: string
  kategoriSlug: string
  temizle: () => Promise<void>
}

async function detayIcerigiHazirla(): Promise<DetayIcerigi> {
  const damga = `e2e${randomBytes(5).toString('hex')}`
  const kategoriSlug = `e2e-detay-${damga}`
  const kategoriAdi = `E2E Detay ${damga}`
  const yayimliSlug = `e2e-yayimli-${damga}`
  const taslakSlug = `e2e-taslak-${damga}`
  const taslakGizliMetin = `GIZLI-TASLAK-${damga}`
  const temizlikci = await temizlikciAc()

  await temizlikci.calistir('INSERT INTO categories (slug, name) VALUES (?, ?)', [
    kategoriSlug,
    kategoriAdi,
  ])
  const [kategori] = await temizlikci.sorgu<{ id: number }>(
    'SELECT id FROM categories WHERE slug = ?',
    [kategoriSlug],
  )

  await temizlikci.calistir(
    `INSERT INTO articles (slug, title, excerpt, content, category_id, status, published_at, meta_title)
     VALUES (?, ?, ?, ?, ?, 'published', NOW(), ?)`,
    [
      yayimliSlug,
      // Başlıkta bilinçli olarak </script> var: JSON-LD kaçışı gerçek sayfada da sınanıyor.
      `E2E Yayımlı </script> ${damga}`,
      'E2E yayımlı özeti.',
      '<h2>E2E alt başlık</h2><p>E2E yayımlı gövde.</p>',
      kategori.id,
      `E2E Meta Başlık ${damga}`,
    ],
  )

  await temizlikci.calistir(
    `INSERT INTO articles (slug, title, excerpt, content, category_id, status)
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [
      taslakSlug,
      `E2E Taslak ${damga}`,
      'E2E taslak özeti.',
      `<p>${taslakGizliMetin}</p>`,
      kategori.id,
    ],
  )

  return {
    damga,
    yayimliSlug,
    yayimliBaslik: `E2E Yayımlı </script> ${damga}`,
    taslakSlug,
    taslakBaslik: `E2E Taslak ${damga}`,
    taslakGizliMetin,
    kategoriAdi,
    kategoriSlug,
    async temizle() {
      try {
        await temizlikci.sil('DELETE FROM articles WHERE title LIKE ?', [`%${damga}%`])
        await temizlikci.sil('DELETE FROM categories WHERE slug = ?', [kategoriSlug])
      } finally {
        await temizlikci.kapat()
      }
    },
  }
}

test.describe('tekil makale', () => {
  let icerik: DetayIcerigi

  test.beforeEach(async () => {
    icerik = await detayIcerigiHazirla()
  })

  test.afterEach(async () => {
    await icerik.temizle()
  })

  test('yayımlanmış makale başlık, tarih, kategori ve yazar bağlantısıyla açılır', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    await expect(page.getByRole('heading', { level: 1, name: icerik.yayimliBaslik })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('link', { name: icerik.kategoriAdi })).toHaveAttribute(
      'href',
      `/makaleler/kategori/${icerik.kategoriSlug}`,
    )
    await expect(page.locator('article time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
    await expect(page.locator('.prose h2')).toHaveText('E2E alt başlık')
  })

  test('gövde krem zeminde çizilir, kabuk koyu kalır (spec §7)', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    const zemin = await page
      .locator('article[data-surface="paper"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(zemin).toBe(KREM_ZEMIN)
    const govdeZemini = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(govdeZemini).not.toBe(KREM_ZEMIN)
  })

  test('krem zeminde odak halkası koyu altına döner', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    const baglanti = page.getByRole('link', { name: icerik.kategoriAdi })
    await baglanti.focus()
    await expect(baglanti).toHaveCSS('outline-color', 'rgb(125, 95, 38)')
    await expect(baglanti).toHaveCSS('outline-width', '2px')
  })

  test('meta_title doluysa sayfa başlığı ondan gelir', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    await expect(page).toHaveTitle(`E2E Meta Başlık ${icerik.damga} | Akıl Hukuk Bürosu`)
  })

  test('JSON-LD Article şeması geçerlidir ve yıldız işaretlemesi taşımaz', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    const ham = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(ham).not.toBeNull()
    const sema = JSON.parse(ham as string)
    expect(sema['@type']).toBe('Article')
    expect(sema.headline).toBe(icerik.yayimliBaslik)
    expect(sema).not.toHaveProperty('aggregateRating')
    expect(sema).not.toHaveProperty('review')
  })

  test('başlıktaki </script> dizisi belgeyi erken kapatmaz', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    // Kaçış çalışmasaydı script erken kapanır, kalan JSON gövdeye düz metin olarak sızardı.
    await expect(page.locator('body')).not.toContainText('"datePublished"')
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  })

  test('TASLAK ADRESİ İÇERİK SIZDIRMAZ: 404 döner ve gövde metni hiç görünmez', async ({ page }) => {
    const yanit = await page.goto(`/makaleler/${icerik.taslakSlug}`)
    expect(yanit?.status()).toBe(404)
    const html = await page.content()
    expect(html).not.toContain(icerik.taslakGizliMetin)
    expect(html).not.toContain(icerik.taslakBaslik)
  })

  test('var olmayan slug 404 döner', async ({ page }) => {
    const yanit = await page.goto(`/makaleler/bulunmayan-${icerik.damga}`)
    expect(yanit?.status()).toBe(404)
  })

  test('makale sayfası erişilebilirlik denetimini geçer (spec §12)', async ({ page }) => {
    await page.goto(`/makaleler/${icerik.yayimliSlug}`)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations).toEqual([])
  })
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test -- src/lib/json-ld.test.ts
```
Beklenen: FAIL — `Failed to resolve import "./json-ld"`.

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx playwright test tests/e2e/makale-detay.spec.ts --project=masaustu
```
Beklenen: FAIL — `/makaleler/[slug]` rotası yok; yayımlı makale de 404 döner.

- [ ] **Adım 3: En küçük uygulamayı yaz**

`src/lib/json-ld.ts`:

```ts
import type { PublicArticleDetail } from '@/db/queries/public/articles'

// `<script type="application/ld+json">` gövdesi HAM metindir; React'in kaçışı orada devrede
// DEĞİLDİR (bkz. src/lib/sanitize.ts sonundaki uyarı). Yazarın başlığındaki bir `</script>`
// dizisi belgeyi orada kapatır ve devamı HTML olarak ayrıştırılır — bozuk şema değil,
// doğrudan XSS yolu.
//
// "<" ve ">" JSON birim kaçışıyla yazılıyor: JSON çözücü aynı diziyi geri verir, HTML
// ayrıştırıcısı ise artık etiket başlangıcı görmez. "&" de kaçırılıyor, aksi hâlde metindeki
// "&lt;/script&gt;" HTML varlık çözümüyle geri "</script>" hâline gelebilir.
const HTML_DUYARLI = /[<>&]/g

const KACISLAR: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
}

export function jsonLdScriptContent(data: unknown): string {
  return JSON.stringify(data).replace(HTML_DUYARLI, (karakter) => KACISLAR[karakter])
}

export type ArticleSchemaInput = {
  article: PublicArticleDetail
  /** Makalenin mutlak adresi. */
  articleUrl: string
  publisherName: string
  /** Kapak görselinin mutlak adresi; kapak yoksa verilmez. */
  imageUrl?: string
  /** Yazarın kadro sayfasının mutlak adresi; yazarın sayfası yoksa verilmez. */
  authorUrl?: string
}

/**
 * schema.org `Article` nesnesi.
 *
 * `aggregateRating` ve `review` BİLİNÇLİ olarak yok: yıldız işaretlemesi TBB Reklam Yasağı
 * Yönetmeliği kapsamında reklam sayılır (spec §2.1, §10). Buraya eklenmesi hukuki risktir;
 * yokluğu json-ld.test.ts ile sabitlenmiştir.
 */
export function articleJsonLd({
  article,
  articleUrl,
  publisherName,
  imageUrl,
  authorUrl,
}: ArticleSchemaInput): Record<string, unknown> {
  const sema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    // headline makalenin BAŞLIĞI; metaTitle arama sonucu başlığıdır, ikisi karıştırılmaz.
    headline: article.title,
    description: article.metaDescription ?? article.excerpt,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    inLanguage: 'tr-TR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    publisher: { '@type': 'Organization', name: publisherName },
  }

  if (imageUrl) sema.image = [imageUrl]
  if (article.categoryName) sema.articleSection = article.categoryName

  // Yazarı olmayan makaleye boş bir Person koymak, olmayan bir kişiyi varmış gibi gösterirdi.
  if (article.authorName) {
    sema.author = authorUrl
      ? { '@type': 'Person', name: article.authorName, url: authorUrl }
      : { '@type': 'Person', name: article.authorName }
  }

  return sema
}
```

`src/components/JsonLd.tsx`:

```tsx
import { jsonLdScriptContent } from '@/lib/json-ld'

type JsonLdProps = { data: unknown }

// dangerouslySetInnerHTML zorunlu: React <script> çocuğunu metin olarak kaçırır ve şema
// geçersiz çıkar. Güvenlik jsonLdScriptContent'in birim kaçışıyla sağlanıyor — bu bileşene
// kaçırılmamış içerik geçirilemez, tek yol JSON serileştirmesidir.
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(data) }}
    />
  )
}
```

`src/app/(site)/makaleler/[slug]/page.module.css`:

```css
/* Sitenin kimliği koyu kalır; yalnız uzun metnin okunduğu blok krem olur (spec §7). */
.page {
  padding: var(--section) var(--pad);
}

.paper {
  max-width: var(--max);
  margin: 0 auto;
  padding: clamp(2rem, 6vw, 4.5rem) var(--pad);
  border-radius: var(--radius-block);
  /* Zemin, metin, ayraç ve odak halkası [data-surface="paper"] sözleşmesinden gelir;
     burada hiçbir renk değeri yazılmaz. */
}

/* Başlık, kapak ve gövde aynı ölçüde hizalanır: .prose zaten 68ch ile sınırlı, başlık
   serbest bırakılsaydı geniş ekranda gövdeden taşar ve iki ayrı sütun gibi görünürdü. */
.inner {
  max-width: 72ch;
  margin: 0 auto;
}

.header {
  margin-bottom: 40px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  color: var(--text-muted);
  font-size: 15px;
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--surface-raised);
  margin-bottom: 40px;
}

.coverImage {
  object-fit: cover;
}

.caption {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-muted);
}

.footerNav {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
```

`src/app/(site)/makaleler/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getPublishedArticleBySlug,
  listArticleFeedEntries,
} from '@/db/queries/public/articles'
import { getSettings } from '@/db/queries/settings'
import { JsonLd } from '@/components/JsonLd'
import { articleJsonLd } from '@/lib/json-ld'
import { formatDate } from '@/lib/date'
import { mediaUrl } from '@/lib/media-url'
import { absoluteUrl } from '@/lib/site-url'
import styles from './page.module.css'

type ArticlePageProps = { params: Promise<{ slug: string }> }

function articlePath(slug: string): string {
  return `/makaleler/${slug}`
}

// Yayımlanmış makaleler önceden üretilir. Listede olmayan bir slug istekte çizilir ve
// getPublishedArticleBySlug null döndüğü için notFound()'a düşer — taslak adresi hiçbir
// yolda içerik sızdıramaz.
export async function generateStaticParams() {
  const entries = await listArticleFeedEntries()
  return entries.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  // params Next 16'da Promise; await edilmeden okunamaz (sözleşme §4.1).
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)

  if (!article) {
    // Yayımlanmamış adres için başlıkta bile içerik gösterilmez.
    return { title: 'Sayfa bulunamadı', robots: { index: false, follow: false } }
  }

  const canonical = articlePath(slug)
  const kapak = article.coverPath ? mediaUrl(article.coverPath) : undefined

  return {
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      // Open Graph başlığı sekme başlığıyla aynı kaynaktan; şablon eki burada uygulanmaz.
      title: article.metaTitle ?? article.title,
      description: article.metaDescription ?? article.excerpt,
      url: canonical,
      locale: 'tr_TR',
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      // Göreli adresler kök layout'taki metadataBase ile mutlaklaşır (Görev 7).
      images: kapak ? [kapak] : undefined,
    },
  }
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params
  const [article, settings] = await Promise.all([
    getPublishedArticleBySlug(slug),
    getSettings(),
  ])

  // Taslak ve ileri tarihli makale burada durur; sorgu katmanı yayımlanmışlık ölçütünü
  // tek yerde tutuyor (sözleşme §3.1), sayfa ikinci bir ölçüt yazmaz.
  if (!article) notFound()

  const isoDate = article.publishedAt.toISOString().slice(0, 10)
  const kapakYolu = article.coverPath ? mediaUrl(article.coverPath) : undefined

  // JSON-LD adresleri MUTLAK olmak zorunda; metadataBase yalnız Metadata API'sini etkiler,
  // şema nesnesine dokunmaz. absoluteUrl tek kaynaktan (Görev 7 SITE_URL) üretiyor.
  const sema = articleJsonLd({
    article,
    articleUrl: absoluteUrl(articlePath(slug)),
    publisherName: settings.officeName,
    imageUrl: kapakYolu ? absoluteUrl(kapakYolu) : undefined,
    authorUrl: article.authorSlug ? absoluteUrl(`/kadro/${article.authorSlug}`) : undefined,
  })

  return (
    <div className={styles.page}>
      {/* Krem okuma zemini: zemin, metin ve odak halkası yüzey sözleşmesiyle birlikte gelir. */}
      <article data-surface="paper" className={styles.paper}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>
              {article.categoryName && article.categorySlug ? (
                <Link href={`/makaleler/kategori/${article.categorySlug}`} className="textLink">
                  {article.categoryName}
                </Link>
              ) : (
                'Makale'
              )}
            </p>
            <h1>{article.title}</h1>
            <p className={styles.meta}>
              <time dateTime={isoDate}>{formatDate(isoDate)}</time>
              {article.authorName ? (
                <>
                  {/* Ayraç yalnız görseldir; ekran okuyucu "orta nokta" diye okumasın. */}
                  <span aria-hidden="true">·</span>
                  {article.authorSlug ? (
                    <Link href={`/kadro/${article.authorSlug}`} className="textLink">
                      {article.authorName}
                    </Link>
                  ) : (
                    <span>{article.authorName}</span>
                  )}
                </>
              ) : null}
            </p>
          </header>

          {kapakYolu ? (
            <figure>
              <div className={styles.cover}>
                {/* Boyutlar sözleşmedeki PublicArticleDetail'de yok; uydurmak yerine fill +
                    CSS aspect-ratio kullanılıyor, düzen kayması kapsayıcıyla önleniyor.
                    priority: kapak sayfanın LCP öğesi.
                    fill ile sizes ZORUNLU: okuma sütunu 1100px üstünde 900px'te sabitleniyor,
                    altında tam genişlik; sizes verilmezse Next her ekranda 100vw varsayıp
                    gereğinden büyük dosya indirir ve LCP'yi kendi eliyle geciktirir. */}
                <Image
                  src={kapakYolu}
                  alt={article.coverAlt ?? ''}
                  fill
                  sizes="(min-width: 1100px) 900px, 100vw"
                  priority
                  className={styles.coverImage}
                />
              </div>
            </figure>
          ) : null}

          {/* Gövde Görev 3'ün sorgusundan sanitize edilmiş HTML olarak geliyor (sözleşme
              §3.1); .prose global sınıf olmak zorunda, CSS modülü sınıf adını karıştırırdı. */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: article.content }} />

          <nav aria-label="Makale gezinmesi" className={styles.footerNav}>
            <Link href="/makaleler" className="textLink">
              Tüm makaleler
            </Link>
          </nav>
        </div>
      </article>

      <JsonLd data={sema} />
    </div>
  )
}
```

- [ ] **Adım 4: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test && npx tsc --noEmit && npm run lint && npm run build
```
Beklenen: PASS; `npm run build` çıktısında `/makaleler/[slug]` rotası ve
`generateStaticParams` ile önceden üretilmiş yol sayısı görünür.

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx playwright test tests/e2e/makale-detay.spec.ts
```
Beklenen: PASS (masaustu ve mobil).

**Üretim derlemesiyle ek doğrulama (taslak sızıntısı, ZORUNLU):** e2e yerelde `next dev` ile
koşuyor; `generateStaticParams` yalnız üretim derlemesinde devreye giriyor. Taslak sızıntısı
testi **üretim modunda da** koşturulur:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
CI=1 npx playwright test tests/e2e/makale-detay.spec.ts --project=masaustu
```
Beklenen: PASS. (`CI=1`, playwright.config.ts'i `npm run build && npm run start` yoluna
sokar; `.env.local` içindeki `SITE_URL` bu derlemede zorunludur — Görev 7 Adım 3.)

- [ ] **Adım 5: Mutasyon kanıtı**

Üç bozma, tek tek yapılır ve her biri geri alınır:

1. `src/lib/json-ld.ts` içinde `return JSON.stringify(data).replace(HTML_DUYARLI, ...)` satırı
   `return JSON.stringify(data)` yapılır. Beklenen kırmızı: `jsonLdScriptContent > </script>
   dizisini script gövdesinde bırakmaz` ve e2e `başlıktaki </script> dizisi belgeyi erken
   kapatmaz`. Geri al.
2. `src/lib/json-ld.ts` içinde şema nesnesine `aggregateRating: { '@type': 'AggregateRating',
   ratingValue: 5 }` eklenir. Beklenen kırmızı: `articleJsonLd > aggregateRating ve review
   ASLA üretmez` ve e2e `JSON-LD Article şeması geçerlidir ve yıldız işaretlemesi taşımaz`.
   Geri al.
3. `src/app/(site)/makaleler/[slug]/page.tsx` içinde `if (!article) notFound()` satırı
   `if (!article) return <p>Bu yazı yayımda değil.</p>` yapılır. Beklenen kırmızı:
   e2e `TASLAK ADRESİ İÇERİK SIZDIRMAZ` (404 yerine 200 alır). Geri al.

Dördüncü, krem zemin için: `page.tsx` içindeki `data-surface="paper"` özniteliği silinir.
Beklenen kırmızı: e2e `gövde krem zeminde çizilir, kabuk koyu kalır`. Geri al.

- [ ] **Adım 6: Commit**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
git add src/lib/json-ld.ts src/lib/json-ld.test.ts src/components/JsonLd.tsx \
  "src/app/(site)/makaleler/[slug]" tests/e2e/makale-detay.spec.ts
git commit -m "feat: tekil makale sayfası, krem okuma zemini ve Article şeması

Yayımlanmamış slug notFound(); taslak gövdesi hiçbir yolda sızmıyor.
JSON-LD birim kaçışıyla gömülüyor; aggregateRating/review yok (spec §2.1, §10).
Doğrulama: npm test, npx tsc --noEmit, npm run lint, npm run build,
npx playwright test tests/e2e/makale-detay.spec.ts (masaustu + mobil) ve
CI=1 ile üretim derlemesinde taslak sızıntısı testi.
Mutasyon kanıtı: JSON-LD kaçışı, şemaya aggregateRating eklenmesi, notFound()
koşulu ve data-surface özniteliği tek tek bozuldu, ilgili testler kırmızıya
döndü, hepsi geri alındı."
```

---

### Görev 9: İletişim sayfası — form, KVKK onayı, harita rızası, tıkla-ara/WhatsApp

**Dosyalar:**
- Oluştur: `src/lib/request-meta.ts`, `src/lib/request-meta.test.ts`
- Oluştur: `src/lib/contact-rate-limit.ts`, `src/lib/contact-rate-limit.test.ts`
- Oluştur: `src/lib/map-url.ts`, `src/lib/map-url.test.ts`
- Oluştur: `src/lib/mailer.ts`, `src/lib/mailer.test.ts`
- Oluştur: `src/app/(site)/iletisim/actions.ts`
- Oluştur: `src/app/(site)/iletisim/ContactForm.tsx`, `ContactForm.module.css`
- Oluştur: `src/app/(site)/iletisim/MapConsent.tsx`, `MapConsent.module.css`
- Oluştur: `.env.example`
- Değiştir: `src/lib/validation.ts`, `src/lib/validation.test.ts`
- Değiştir: `src/db/queries/messages.ts`, `src/db/queries/messages.test.ts`
- Değiştir: `src/app/(site)/iletisim/page.tsx`, `src/app/(site)/iletisim/page.module.css`
- Değiştir: `package.json`, `.env.local`, `.env.test`

**Arayüzler:**
- Tüketir: `getSettings(): Promise<Settings>` (`src/db/queries/settings.ts`);
  `toFormState(error: z.ZodError): FormState`, `type FormState = { ok: boolean; errors: FieldErrors; message?: string; warnings?: string[] }` (`src/lib/validation.ts`);
  `createRateLimiter({ limit, windowMs }): RateLimiter` ve `peek`/`record`/`refund`/`reset` (`src/lib/rate-limit.ts`).
- Üretir: `contactSchema` (zod), `submitContactMessage(prev: FormState, formData: FormData): Promise<FormState>`,
  `createMessage(values: NewMessage): Promise<void>`, `mapEmbedUrl(lat: string, lng: string): string`,
  `mapLinkUrl(lat: string, lng: string): string`, `isValidCoordinatePair(lat, lng): boolean`.

**Bağımlılık kararı (planın TEK yeni bağımlılığı):**
`nodemailer@9.0.5` + `@types/nodemailer@8.0.1`. Kesin sürümle kurulur (Plan 2 kuralı).
`nodemailer` kendi tip tanımını taşımıyor (`npm view nodemailer@9.0.5 types` boş döndü,
2026-08-20'de ölçüldü), bu yüzden `@types` ayrı gerekiyor. Mevcut bağımlılıklarla
çözülemez: SMTP istemcisi yazmak protokol, TLS ve başlık kodlaması işidir.

- [ ] **Adım 1: Kırmızı testleri yaz**

`src/lib/request-meta.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { IP_COLUMN_MAX, USER_AGENT_COLUMN_MAX, requestMeta } from '@/lib/request-meta'

describe('requestMeta', () => {
  it('başlık yoksa null döndürür', () => {
    expect(requestMeta(new Headers())).toEqual({ ip: null, userAgent: null })
  })

  it('x-forwarded-for zincirinin ilk girdisini alır', () => {
    const meta = requestMeta(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))
    expect(meta.ip).toBe('203.0.113.7')
  })

  // Sütun varchar(45); kırpılmazsa MariaDB STRICT_TRANS_TABLES altında "Data too long"
  // fırlatır ve ziyaretçinin mesajı hiç kaydedilmez.
  it('sütuna sığmayan başlığı kırpar, fırlatmaz', () => {
    const uzun = 'a'.repeat(200)
    const meta = requestMeta(new Headers({ 'x-forwarded-for': uzun, 'user-agent': uzun }))
    expect(meta.ip).toHaveLength(IP_COLUMN_MAX)
    expect(meta.userAgent).toHaveLength(USER_AGENT_COLUMN_MAX)
  })

  it('yalnız boşluktan oluşan başlığı null sayar', () => {
    expect(requestMeta(new Headers({ 'x-forwarded-for': '   ' })).ip).toBeNull()
  })
})
```

`src/lib/contact-rate-limit.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'
import {
  CONTACT_WINDOW_MS, CONTACT_PER_EMAIL_LIMIT, CONTACT_GLOBAL_LIMIT,
  createContactGate, contactRateLimitMessage,
} from '@/lib/contact-rate-limit'

function kapi() {
  return createContactGate(
    createRateLimiter({ limit: CONTACT_PER_EMAIL_LIMIT, windowMs: CONTACT_WINDOW_MS }),
    createRateLimiter({ limit: CONTACT_GLOBAL_LIMIT, windowMs: CONTACT_WINDOW_MS }),
  )
}

describe('createContactGate', () => {
  it('e-posta tavanına kadar kabul eder, sonra reddeder', () => {
    const gate = kapi()
    for (let i = 0; i < CONTACT_PER_EMAIL_LIMIT; i++) {
      expect(gate.admit('a@example.com', 1000).allowed).toBe(true)
    }
    const red = gate.admit('a@example.com', 1000)
    expect(red.allowed).toBe(false)
    expect(red.scope).toBe('email')
  })

  it('e-posta büyük/küçük harf ve boşluktan bağımsız aynı kovaya düşer', () => {
    const gate = kapi()
    for (let i = 0; i < CONTACT_PER_EMAIL_LIMIT; i++) gate.admit('a@example.com', 1000)
    expect(gate.admit('  A@Example.COM ', 1000).allowed).toBe(false)
  })

  // Anahtar e-posta olduğu için her istekte yeni e-posta yazan bir bot kendi kovasına hiç
  // dokunmaz. Küresel tavan tam olarak bunun içindir.
  it('her seferinde farklı e-posta gönderen istemci küresel tavana takılır', () => {
    const gate = kapi()
    for (let i = 0; i < CONTACT_GLOBAL_LIMIT; i++) {
      expect(gate.admit(`bot${i}@example.com`, 1000).allowed).toBe(true)
    }
    const red = gate.admit('bot-son@example.com', 1000)
    expect(red.allowed).toBe(false)
    expect(red.scope).toBe('global')
  })

  it('küresel tavana takılan deneme e-posta kovasını harcamaz', () => {
    const gate = kapi()
    for (let i = 0; i < CONTACT_GLOBAL_LIMIT; i++) gate.admit(`bot${i}@example.com`, 1000)
    gate.admit('kurban@example.com', 1000) // reddedilir
    // Pencere dönünce kurban hakkını eksiksiz bulmalı.
    const sonra = CONTACT_WINDOW_MS + 2000
    for (let i = 0; i < CONTACT_PER_EMAIL_LIMIT; i++) {
      expect(gate.admit('kurban@example.com', sonra).allowed).toBe(true)
    }
  })

  it('pencere dolunca hak yenilenir', () => {
    const gate = kapi()
    for (let i = 0; i < CONTACT_PER_EMAIL_LIMIT; i++) gate.admit('a@example.com', 1000)
    expect(gate.admit('a@example.com', 1000 + CONTACT_WINDOW_MS).allowed).toBe(true)
  })
})

describe('contactRateLimitMessage', () => {
  it('izin verilende null döner', () => {
    expect(contactRateLimitMessage({ allowed: true, retryAfterMs: 0, scope: null })).toBeNull()
  })

  it('iki reddi farklı Türkçe metinle ayırır', () => {
    const eposta = contactRateLimitMessage({ allowed: false, retryAfterMs: 600_000, scope: 'email' })
    const kuresel = contactRateLimitMessage({ allowed: false, retryAfterMs: 600_000, scope: 'global' })
    expect(eposta).toContain('10 dakika')
    expect(kuresel).toContain('10 dakika')
    expect(eposta).not.toBe(kuresel)
  })
})
```

`src/lib/map-url.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { isValidCoordinatePair, mapEmbedUrl, mapLinkUrl } from '@/lib/map-url'

describe('isValidCoordinatePair', () => {
  it('geçerli koordinatı kabul eder', () => {
    expect(isValidCoordinatePair('41.0082', '28.9784')).toBe(true)
  })

  it('null, boş ve sayı olmayan değeri reddeder', () => {
    expect(isValidCoordinatePair(null, '28.9784')).toBe(false)
    expect(isValidCoordinatePair('', '28.9784')).toBe(false)
    expect(isValidCoordinatePair('javascript:alert(1)', '28.9784')).toBe(false)
    expect(isValidCoordinatePair('NaN', '0')).toBe(false)
  })

  // Panelden gelen değer güvenilmez: aralık dışı bir sayı haritayı boş açar, kullanıcı
  // adresi hiç göremez. Aralık burada kapanıyor, iframe'e ulaşmadan önce.
  it('aralık dışı enlem/boylamı reddeder', () => {
    expect(isValidCoordinatePair('91', '0')).toBe(false)
    expect(isValidCoordinatePair('0', '181')).toBe(false)
  })
})

describe('mapEmbedUrl / mapLinkUrl', () => {
  it('koordinatı sorgu dizesine kodlar ve https kullanır', () => {
    const gomulu = mapEmbedUrl('41.0082', '28.9784')
    expect(gomulu.startsWith('https://www.google.com/maps?')).toBe(true)
    expect(gomulu).toContain('q=41.0082%2C28.9784')
    expect(gomulu).toContain('output=embed')
  })

  it('bağlantı adresi Google Maps URLs API biçimindedir', () => {
    expect(mapLinkUrl('41.0082', '28.9784')).toBe(
      'https://www.google.com/maps/search/?api=1&query=41.0082%2C28.9784',
    )
  })

  it('geçersiz koordinatta fırlatır — sessiz bozuk adres üretmez', () => {
    expect(() => mapEmbedUrl('abc', '0')).toThrow(/koordinat/i)
  })
})
```

`src/lib/mailer.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { buildContactMail, resolveTransportMode } from '@/lib/mailer'

const ORNEK = {
  name: 'Ayşe Yılmaz',
  email: 'ayse@example.com',
  phone: '+90 555 000 00 00',
  subject: 'Kira sözleşmesi hakkında',
  body: 'Merhaba, kısa bir sorum olacaktı.',
}

describe('resolveTransportMode', () => {
  it('tanımsızda smtp varsayar', () => {
    expect(resolveTransportMode(undefined)).toBe('smtp')
  })

  it('json kipini tanır', () => {
    expect(resolveTransportMode('json')).toBe('json')
  })

  // Yazım hatasını sessizce 'smtp'ye düşürmek, testte gerçek e-posta göndermek demekti.
  it('bilinmeyen değerde fırlatır', () => {
    expect(() => resolveTransportMode('sntp')).toThrow(/MAIL_TRANSPORT/)
  })
})

describe('buildContactMail', () => {
  it('gönderen büro adresidir, ziyaretçininki replyTo olur', () => {
    const mail = buildContactMail(ORNEK, { to: 'buro@example.com', from: 'site@example.com' })
    expect(mail.from).toBe('site@example.com')
    expect(mail.to).toBe('buro@example.com')
    expect(mail.replyTo).toBe('ayse@example.com')
  })

  // Konu satırına CR/LF sızarsa SMTP başlık enjeksiyonu olur: saldırgan kendi Bcc'sini
  // ekleyip büronun sunucusundan posta dağıtabilir.
  it('konudaki satır sonlarını temizler', () => {
    const mail = buildContactMail(
      { ...ORNEK, subject: 'Merhaba\r\nBcc: kurban@example.com' },
      { to: 'buro@example.com', from: 'site@example.com' },
    )
    expect(mail.subject).not.toMatch(/[\r\n]/)
    expect(mail.subject).toContain('Merhaba')
  })

  it('gövde düz metindir ve HTML üretmez', () => {
    const mail = buildContactMail(
      { ...ORNEK, body: '<script>alert(1)</script>' },
      { to: 'buro@example.com', from: 'site@example.com' },
    )
    expect(mail.html).toBeUndefined()
    expect(mail.text).toContain('<script>alert(1)</script>')
  })
})
```

`src/lib/validation.test.ts` (mevcut dosyaya eklenir):
```ts
import { contactSchema } from '@/lib/validation'

describe('contactSchema', () => {
  const gecerli = {
    name: 'Ayşe Yılmaz',
    email: 'ayse@example.com',
    phone: '+90 555 000 00 00',
    subject: 'Kira sözleşmesi hakkında',
    body: 'Merhaba, kira sözleşmemle ilgili kısa bir sorum olacaktı.',
    kvkk: 'evet',
    website: '',
  }

  it('geçerli gönderimi kabul eder', () => {
    const sonuc = contactSchema.safeParse(gecerli)
    expect(sonuc.success).toBe(true)
    if (sonuc.success) expect(sonuc.data.kvkk).toBe(true)
  })

  // spec §9: onay kutusu ÖNCEDEN İŞARETLİ DEĞİL. İşaretlenmemiş kutu FormData'ya hiç
  // girmiyor, yani null geliyor — `optional` yeterli olmaz (validation.ts'teki checkbox notu).
  it('KVKK onayı yoksa alan hatası verir', () => {
    const sonuc = contactSchema.safeParse({ ...gecerli, kvkk: null })
    expect(sonuc.success).toBe(false)
    if (!sonuc.success) {
      const alanlar = sonuc.error.issues.map((i) => i.path[0])
      expect(alanlar).toContain('kvkk')
    }
  })

  it('telefon boş bırakılabilir', () => {
    expect(contactSchema.safeParse({ ...gecerli, phone: '' }).success).toBe(true)
  })

  it('kısa gövdeyi Türkçe mesajla reddeder', () => {
    const sonuc = contactSchema.safeParse({ ...gecerli, body: 'kısa' })
    expect(sonuc.success).toBe(false)
    if (!sonuc.success) expect(sonuc.error.issues[0].message).toMatch(/en az/)
  })

  it('geçersiz e-postayı reddeder', () => {
    expect(contactSchema.safeParse({ ...gecerli, email: 'ayse' }).success).toBe(false)
  })

  // Honeypot alanı bir tuzak; dolu gelmesi doğrulama hatası DEĞİL, action'ın kararı.
  it('honeypot alanını olduğu gibi taşır', () => {
    const sonuc = contactSchema.safeParse({ ...gecerli, website: 'http://spam' })
    expect(sonuc.success).toBe(true)
    if (sonuc.success) expect(sonuc.data.website).toBe('http://spam')
  })
})
```

`src/db/queries/messages.test.ts` (mevcut dosyaya eklenir):
```ts
import { createMessage, listMessages } from '@/db/queries/messages'

describe('createMessage', () => {
  it('mesajı kaydeder ve okunmamış olarak işaretler', async () => {
    await createMessage({
      name: 'Ayşe Yılmaz',
      email: 'ayse@example.com',
      phone: null,
      subject: 'Kira sözleşmesi',
      body: 'Kısa bir sorum olacaktı.',
      kvkkAcceptedAt: new Date('2026-08-20T09:00:00Z'),
      ip: '203.0.113.7',
      userAgent: 'vitest',
    })
    const [ilk] = await listMessages(1)
    expect(ilk.name).toBe('Ayşe Yılmaz')
    expect(ilk.isRead).toBe(false)
    expect(ilk.kvkkAcceptedAt).not.toBeNull()
  })
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

Komut:
```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test
```
Beklenen: FAIL — `Failed to resolve import "@/lib/request-meta"`, `"@/lib/contact-rate-limit"`,
`"@/lib/map-url"`, `"@/lib/mailer"`; `contactSchema is not exported`; `createMessage is not a function`.

- [ ] **Adım 3: Bağımlılığı kur**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm i --save-exact nodemailer@9.0.5
npm i --save-exact --save-dev @types/nodemailer@8.0.1
node -e "const n=require('nodemailer'); console.log(typeof n.createTransport)"
```
Beklenen: son satır `function`. **ÖLÇÜM:** çıktı `function` değilse nodemailer 9'un dışa
aktarımı değişmiş demektir; devam etmeden `node_modules/nodemailer/lib/nodemailer.js`
sonundaki `module.exports` satırları okunur ve `createTransport` çağrısı ona göre yazılır.
`package.json`'da `^`/`~` bulunmadığı `npm ls --depth=0 | grep nodemailer` ile doğrulanır.

- [ ] **Adım 4: En küçük uygulamayı yaz**

`src/lib/request-meta.ts`:
```ts
// Sütun genişlikleri src/db/schema.ts'ten: ip varchar(45), user_agent varchar(255).
export const IP_COLUMN_MAX = 45
export const USER_AGENT_COLUMN_MAX = 255

function kirp(value: string | null, max: number): string | null {
  const temiz = (value ?? '').trim()
  if (temiz === '') return null
  return temiz.slice(0, max)
}

/**
 * İstek başlıklarından adli iz çıkarır.
 *
 * DEĞER GÜVENİLMEZ ve öyle olduğu bilinerek saklanıyor: `x-forwarded-for` istemcinin
 * yazabildiği bir başlıktır, zincirin ilk girdisi tümüyle uydurma olabilir. Bu yüzden
 * hız sınırı buna DEĞİL e-postaya anahtarlanıyor (contact-rate-limit.ts). Burada tutulan
 * değer yalnız "gelen istek ne dedi" kaydıdır; kimlik kanıtı değildir.
 *
 * Kırpma zorunlu: kırpılmadan yazılan uzun bir başlık MariaDB STRICT_TRANS_TABLES altında
 * "Data too long" fırlatır ve ziyaretçinin mesajı hiç kaydedilmez — saldırgan uzun bir
 * User-Agent göndererek formu kullanılamaz hâle getirebilirdi.
 */
export function requestMeta(headerList: Headers): { ip: string | null; userAgent: string | null } {
  const zincir = headerList.get('x-forwarded-for')
  const ilk = zincir === null ? null : (zincir.split(',')[0] ?? null)
  return {
    ip: kirp(ilk, IP_COLUMN_MAX),
    userAgent: kirp(headerList.get('user-agent'), USER_AGENT_COLUMN_MAX),
  }
}
```

`src/lib/contact-rate-limit.ts`:
```ts
import { createRateLimiter, type RateLimiter, type RateLimitResult } from '@/lib/rate-limit'

export const CONTACT_WINDOW_MS = 30 * 60 * 1000

/** Tek bir e-posta adresinin penceredeki gönderim hakkı. */
export const CONTACT_PER_EMAIL_LIMIT = 3

/**
 * Pencere başına TOPLAM gönderim tavanı; anahtardan bağımsız.
 *
 * NEDEN E-POSTA ANAHTARI, IP DEĞİL: `x-forwarded-for` istemcinin yazdığı bir başlıktır.
 * Her istekte farklı bir değer gönderen bot her seferinde yeni kova alır ve sınırı tümüyle
 * atlar; ters vekil zincire eklediğinde de `split(',')[0]` yanlış ucu seçer. Aynı tuzağa
 * Plan 2'de giriş sınırında düşülmüş ve orada da e-posta anahtarına dönülmüştü. Hostinger
 * ters vekilinin başlığı ezip ezmediği DAĞITIM planında ölçülecek; ölçülene kadar IP bir
 * hız sınırı anahtarı olarak kullanılmıyor.
 *
 * E-posta anahtarı da güvenilmez — her gönderimde farklı bir adres yazmak bedava. Bu yüzden
 * gerçek tavan burasıdır. Pahalı olan iş SMTP gönderimidir: kötüye kullanılan bir form
 * büronun posta itibarını yakar ve alan adı kara listeye düşerse büro müvekkiline e-posta
 * gönderemez hâle gelir. Veritabanı satırı ucuz, gönderim değil.
 *
 * DEĞER GEREKÇESİ: birkaç avukatlı bir büronun iletişim formu. 30 dakikada 60 mesaj, meşru
 * trafiğin onlarca katı; tavana ulaşmak için aynı yarım saatte 60 ayrı ziyaretçinin yazması
 * gerekir. Saldırgan tarafında sürdürülebilir hız 30 saniyede bir mesaja iner.
 *
 * KABUL EDİLEN BEDEL: tavanı dolduran bir saldırgan meşru ziyaretçileri de pencerenin
 * sonuna kadar erteler. Ziyaretçi bu durumda hata sayfası değil, ne olduğunu söyleyen
 * Türkçe bir mesaj ve telefon numarası görüyor (spec §11) — yani iletişim kanalı kapanmıyor.
 */
export const CONTACT_GLOBAL_LIMIT = 60

const GLOBAL_KEY = 'toplam'

export type ContactGateScope = 'email' | 'global'
export type ContactGateResult = RateLimitResult & { scope: ContactGateScope | null }
export type ContactGate = ReturnType<typeof createContactGate>

function contactKey(email: string): string {
  return `contact:${email.trim().toLowerCase()}`
}

export function createContactGate(perEmail: RateLimiter, budget: RateLimiter) {
  return {
    /**
     * Denemeyi kabul eder ve İKİ sayacı da kabul anında işler.
     *
     * Sıra önemli: e-posta tavanı ÖNCE `peek` ile okunuyor. Kendi hakkını tüketmiş
     * ziyaretçiye "servis meşgul" demek onu yanlış yönlendirirdi.
     *
     * Küresel bütçe reddettiğinde e-posta kovası HİÇ artmıyor: `budget.record` tavana
     * takıldığında sayacı artırmadan dönüyor (rate-limit.ts) ve `perEmail.record` ondan
     * sonra çağrılıyor. Aksi hâlde bir bot, küresel tavanı doldurarak masum bir adresin
     * kişisel hakkını da yiyebilirdi.
     *
     * İade (`refund`) YOK — giriş kapısından farkı bu: orada başarılı giriş kendi birimini
     * geri veriyordu çünkü tavan "kimliği doğrulanmamış deneme"yi sayıyordu. Burada başarılı
     * gönderim de tam olarak sınırlamak istediğimiz kaynağı (bir SMTP gönderimi) harcıyor.
     */
    admit(email: string, now: number = Date.now()): ContactGateResult {
      const key = contactKey(email)
      const emailPeek = perEmail.peek(key, now)
      if (!emailPeek.allowed) return { ...emailPeek, scope: 'email' }

      const budgetResult = budget.record(GLOBAL_KEY, now)
      if (!budgetResult.allowed) return { ...budgetResult, scope: 'global' }

      perEmail.record(key, now)
      return { allowed: true, retryAfterMs: 0, scope: null }
    },
  }
}

// Tekil örnek globalThis üzerinde: action birden fazla rota paketine derlenebiliyor ve her
// paket modülü yeniden değerlendirirse sınır sessizce ikiye katlanır (login-rate-limit.ts
// aynı gerekçeyle böyle).
const globalCache = globalThis as typeof globalThis & { __contactGate?: ContactGate }

export const contactGate =
  globalCache.__contactGate ??
  createContactGate(
    createRateLimiter({ limit: CONTACT_PER_EMAIL_LIMIT, windowMs: CONTACT_WINDOW_MS }),
    createRateLimiter({ limit: CONTACT_GLOBAL_LIMIT, windowMs: CONTACT_WINDOW_MS }),
  )
globalCache.__contactGate = contactGate

export function contactRateLimitMessage(result: ContactGateResult): string | null {
  if (result.allowed) return null
  const minutes = Math.ceil(result.retryAfterMs / 60_000)
  return result.scope === 'global'
    ? `Form şu anda çok yoğun. ${minutes} dakika sonra tekrar deneyebilir veya bize telefonla ulaşabilirsiniz.`
    : `Bu adresten kısa süre içinde çok fazla mesaj gönderildi. ${minutes} dakika sonra tekrar deneyin.`
}
```

`src/lib/map-url.ts`:
```ts
const LAT_MAX = 90
const LNG_MAX = 180

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const temiz = value.trim()
  if (temiz === '') return null
  const sayi = Number(temiz)
  return Number.isFinite(sayi) ? sayi : null
}

/**
 * Koordinat çiftinin haritaya verilebilir olup olmadığını söyler.
 *
 * settings.map_lat/map_lng varchar sütunları ve panelden düzenleniyor, yani bu değer
 * KULLANICI GİRDİSİDİR. Doğrulanmadan bir iframe adresine konursa en iyi ihtimalle boş
 * bir harita, en kötüsünde beklenmedik bir adres üretir. Aralık denetimi de burada:
 * "1000" sonlu bir sayıdır ama dünya üzerinde bir nokta değildir.
 */
export function isValidCoordinatePair(
  lat: string | null | undefined,
  lng: string | null | undefined,
): boolean {
  const enlem = toNumber(lat)
  const boylam = toNumber(lng)
  if (enlem === null || boylam === null) return false
  return Math.abs(enlem) <= LAT_MAX && Math.abs(boylam) <= LNG_MAX
}

function requirePair(lat: string, lng: string): string {
  if (!isValidCoordinatePair(lat, lng)) {
    throw new Error(`Geçersiz harita koordinatı: ${lat}, ${lng}`)
  }
  // Sayıya çevrilip geri yazılıyor: girdideki boşluk ve baştaki artı işareti temizlensin.
  return `${Number(lat)},${Number(lng)}`
}

/**
 * Rıza sonrası yüklenen gömülü harita adresi.
 *
 * `output=embed` seçildi çünkü Google'ın Maps Embed API'si anahtar istiyor; `settings`
 * tablosunda anahtar alanı yok ve spec §6 böyle bir ortam değişkeni saymıyor. Adresin
 * gerçekten çizdiği Adım 6'da ölçülüyor; çizmezse kullanıcı yine de mapLinkUrl bağlantısıyla
 * haritaya ulaşabiliyor (bileşen her iki durumda da o bağlantıyı basıyor).
 */
export function mapEmbedUrl(lat: string, lng: string): string {
  const q = encodeURIComponent(requirePair(lat, lng))
  return `https://www.google.com/maps?q=${q}&z=16&hl=tr&output=embed`
}

/** Google Maps URLs API — belgelenmiş, anahtarsız ve kalıcı biçim. */
export function mapLinkUrl(lat: string, lng: string): string {
  const query = encodeURIComponent(requirePair(lat, lng))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
```

`src/lib/mailer.ts`:
```ts
import { createTransport } from 'nodemailer'

export type ContactMailPayload = {
  name: string
  email: string
  phone: string | null
  subject: string
  body: string
}

export type ContactMail = {
  to: string
  from: string
  replyTo: string
  subject: string
  text: string
  html?: undefined
}

const TRANSPORT_MODES = ['smtp', 'json'] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

/**
 * `MAIL_TRANSPORT` değerini kipe çevirir; tanımsızsa 'smtp'.
 *
 * Bilinmeyen değer FIRLATIYOR, sessizce 'smtp'ye düşmüyor: `MAIL_TRANSPORT=jsno` yazan bir
 * test ortamı sessizce gerçek SMTP'ye bağlanır ve testler ziyaretçi adreslerine posta
 * göndermeye başlardı.
 */
export function resolveTransportMode(raw: string | undefined): TransportMode {
  if (raw === undefined || raw.trim() === '') return 'smtp'
  const deger = raw.trim()
  if ((TRANSPORT_MODES as readonly string[]).includes(deger)) return deger as TransportMode
  throw new Error(`MAIL_TRANSPORT geçersiz: "${raw}". Beklenen: ${TRANSPORT_MODES.join(' | ')}`)
}

// Konu satırındaki CR/LF SMTP başlık enjeksiyonuna açar: araya yazılan bir "Bcc:" satırı
// büronun sunucusundan üçüncü kişilere posta dağıtmaya yarardı.
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

/**
 * Gönderilecek postayı kurar.
 *
 * `from` büronun KENDİ adresi, ziyaretçininki değil. Ziyaretçinin adresini `from`'a yazmak
 * SPF/DMARC'ı düşürür ve posta doğrudan istenmeyen klasörüne gider; büro mesajı hiç görmez.
 * Ziyaretçiye "Yanıtla" ile dönebilmek için adres `replyTo`'ya konuyor.
 *
 * Gövde yalnız DÜZ METİN. HTML üretilseydi ziyaretçiden gelen metnin kaçırılması gerekirdi
 * ve tek bir unutulan yer büronun posta istemcisinde çalışan bağlantı/işaretleme üretirdi.
 */
export function buildContactMail(
  payload: ContactMailPayload,
  addresses: { to: string; from: string },
): ContactMail {
  const satirlar = [
    `Ad soyad: ${payload.name}`,
    `E-posta: ${payload.email}`,
    `Telefon: ${payload.phone ?? '—'}`,
    '',
    payload.body,
  ]
  return {
    to: addresses.to,
    from: addresses.from,
    replyTo: payload.email,
    subject: headerSafe(`[Site] ${payload.subject}`),
    text: satirlar.join('\n'),
    html: undefined,
  }
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (value === undefined || value.trim() === '') {
    throw new Error(`${key} tanımlı değil; iletişim formu e-postayı iletemez.`)
  }
  return value.trim()
}

/**
 * Postayı gönderir. Hata YUTULMAZ, fırlatılır — çağıran (server action) onu loglar.
 *
 * 'json' kipinde nodemailer hiçbir yere bağlanmaz, postayı JSON olarak döndürür. Testler
 * bu kipte koşuyor: gerçek e-posta gönderilmesin ama gönderim yolunun tamamı (adres
 * çözümü, başlık kurulumu, transport çağrısı) yine de çalışsın. Gönderimi test kipinde
 * `if (test) return` ile atlamak, tam olarak test edilmeyen kodun üretimde patlaması demekti.
 */
export async function sendContactMail(payload: ContactMailPayload): Promise<void> {
  const mode = resolveTransportMode(process.env.MAIL_TRANSPORT)
  const to = requireEnv('CONTACT_TO_EMAIL')
  const from = requireEnv('CONTACT_FROM_EMAIL')
  const mail = buildContactMail(payload, { to, from })

  const transporter =
    mode === 'json'
      ? createTransport({ jsonTransport: true })
      : createTransport({
          host: requireEnv('SMTP_HOST'),
          port: Number(requireEnv('SMTP_PORT')),
          // 465 örtük TLS, diğer portlar STARTTLS ile yükseltilir.
          secure: Number(requireEnv('SMTP_PORT')) === 465,
          auth: { user: requireEnv('SMTP_USER'), pass: requireEnv('SMTP_PASS') },
        })

  await transporter.sendMail(mail)
}
```

`src/lib/validation.ts` (ekleme — `checkbox` ve `optionalText` yardımcılarının hemen altına):
```ts
// KVKK onayı ZORUNLU ve önceden işaretli DEĞİL (spec §9). İşaretlenmemiş kutu FormData'ya
// hiç girmiyor; `nullish` bu yüzden şart (yukarıdaki checkbox notu). Ayrı bir yardımcı,
// çünkü panel formlarındaki `checkbox` işaretsiz kutuyu geçerli sayıyor.
const requiredCheckbox = z
  .string()
  .nullish()
  .transform((v) => v === 'evet' || v === 'on')
  .refine((v) => v === true, 'Devam etmek için KVKK aydınlatma metnini onaylayın.')

export const contactSchema = z.object({
  name: z.string().trim().min(3, 'Ad soyad en az 3 karakter olmalı.').max(160, 'Ad soyad en fazla 160 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.').max(190, 'E-posta adresi en fazla 190 karakter olabilir.'),
  phone: optionalText(40, 'Telefon'),
  subject: z.string().trim().min(3, 'Konu en az 3 karakter olmalı.').max(220, 'Konu en fazla 220 karakter olabilir.'),
  body: z.string().trim().min(20, 'Mesaj en az 20 karakter olmalı.').max(4000, 'Mesaj en fazla 4000 karakter olabilir.'),
  kvkk: requiredCheckbox,
  // Tuzak alan: gerçek kullanıcı görmez, bot doldurur. Doğrulama hatası ÜRETMİYOR —
  // "bu alanı boş bırakın" hatası, botun tuzağı öğrenmesine yarardı. Kararı action veriyor.
  website: z
    .string()
    .nullish()
    .transform((v) => (v ?? '').trim()),
})
```

`src/db/queries/messages.ts` (ekleme):
```ts
import { messages, type Message, type NewMessage } from '@/db/schema'

/**
 * Gelen mesajı kaydeder.
 *
 * `try/catch` YOK: veritabanı yazamıyorsa bu çağıranın bilmesi gereken bir olaydır.
 * Burada yutulsaydı ziyaretçi "mesajınız iletildi" görür, mesaj hiçbir yere ulaşmazdı.
 */
export async function createMessage(values: NewMessage): Promise<void> {
  await db.insert(messages).values(values)
}
```

`src/app/(site)/iletisim/actions.ts`:
```ts
'use server'

import { headers } from 'next/headers'
import { createMessage } from '@/db/queries/messages'
import { contactGate, contactRateLimitMessage } from '@/lib/contact-rate-limit'
import { sendContactMail } from '@/lib/mailer'
import { requestMeta } from '@/lib/request-meta'
import { contactSchema, toFormState, type FormState } from '@/lib/validation'

const BASARI = 'Mesajınız iletildi. En kısa sürede dönüş yapacağız.'
const KAYIT_HATASI = 'Mesajınız şu anda kaydedilemedi. Lütfen biraz sonra tekrar deneyin veya bize telefonla ulaşın.'

export async function submitContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    kvkk: formData.get('kvkk'),
    website: formData.get('website'),
  })
  // toFormState: path taşımayan hatalar `toFieldErrors`'ta kaybolur ve kullanıcı gönder'e
  // basıp hiçbir şey olmadığını görürdü (Plan 2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // Honeypot dolu: bot. Kullanıcıya BAŞARI gösteriliyor ama hiçbir şey kaydedilmiyor.
  // Hata göstermek botun tuzağı öğrenmesine ve bir dahakine boş bırakmasına yarardı.
  // Sessiz de değil: sunucu günlüğüne düşüyor, tuzağın gerçekten iş görüp görmediği
  // ölçülebilsin.
  if (parsed.data.website !== '') {
    console.warn('[iletisim] honeypot doldu, mesaj kaydedilmedi', { email: parsed.data.email })
    return { ok: true, errors: {}, message: BASARI }
  }

  const limitMessage = contactRateLimitMessage(contactGate.admit(parsed.data.email))
  if (limitMessage !== null) return { ok: false, errors: {}, message: limitMessage }

  const meta = requestMeta(await headers())

  // SIRA BAĞLAYICI: ÖNCE veritabanı, SONRA e-posta.
  //
  // Ters sıra veri kaybettirir. E-posta önce gidip veritabanı yazması düşerse mesaj yalnız
  // büronun gelen kutusunda kalır; panelin "Mesajlar" listesi onu hiç göstermez ve liste
  // artık güvenilmez olur ("panelde yoksa gelmemiştir" varsayımı yanlışa döner). Bu sırayla
  // ise en kötü durumda mesaj panelde durur, yalnız bildirim postası düşmüş olur.
  try {
    await createMessage({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      body: parsed.data.body,
      // Onay zamanı SUNUCUDA damgalanıyor; istemci saati kanıt değil (spec §9).
      kvkkAcceptedAt: new Date(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  } catch (error) {
    // Hata yutulmuyor: loglanıyor ve kullanıcıya telefon alternatifi sunuluyor (spec §11).
    // Yeniden fırlatmak yerine durum döndürülüyor — fırlatan bir server action kullanıcıya
    // Türkçe olmayan genel hata ekranı gösterir ve yazdığı metin gider.
    console.error('[iletisim] mesaj kaydedilemedi', error)
    return { ok: false, errors: {}, message: KAYIT_HATASI }
  }

  try {
    await sendContactMail({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      body: parsed.data.body,
    })
  } catch (error) {
    // Mesaj ZATEN kaydedildi ve panelde görünüyor; ziyaretçi açısından iletildi. Ona SMTP
    // arızasını anlatmak, yeniden göndermeye ve mükerrer kayda iterdi. Hata yutulmuyor:
    // sunucu günlüğüne tam nesnesiyle düşüyor ki büro bildirim postası almadığını fark
    // ettiğinde nedeni günlükte bulunsun.
    console.error('[iletisim] mesaj kaydedildi ama e-posta gönderilemedi', error)
  }

  return { ok: true, errors: {}, message: BASARI }
}
```

`src/app/(site)/iletisim/ContactForm.tsx`:
```tsx
'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { submitContactMessage } from './actions'
import type { FormState } from '@/lib/validation'
import styles from './ContactForm.module.css'

// validation.ts'ten yalnız TİP alınıyor; değer olarak import etmek zod'u ve bütün panel
// şemalarını istemci paketine çeker (Plan 2'de ölçüldü, LoginForm.tsx'teki aynı not).
const INITIAL_STATE: FormState = { ok: false, errors: {} }

// Alan tanımları veri olarak duruyor, JSX'te beş kez tekrarlanmıyor: etiket-girdi bağı,
// aria-invalid ve aria-describedby üçlüsünün beş kopyası olsaydı birinde yapılan bir
// düzeltme diğer dördünde unutulurdu ve hata yalnız o alanda sessizce erişilemez kalırdı.
const FIELDS = [
  { name: 'name', label: 'Ad soyad', type: 'text', autoComplete: 'name', required: true, multiline: false },
  { name: 'email', label: 'E-posta', type: 'email', autoComplete: 'email', required: true, multiline: false },
  { name: 'phone', label: 'Telefon (isteğe bağlı)', type: 'tel', autoComplete: 'tel', required: false, multiline: false },
  { name: 'subject', label: 'Konu', type: 'text', autoComplete: 'off', required: true, multiline: false },
  { name: 'body', label: 'Mesajınız', type: 'text', autoComplete: 'off', required: true, multiline: true },
] as const

type FieldName = (typeof FIELDS)[number]['name']

type ContactFormProps = { phone: string; phoneHref: string }

export function ContactForm({ phone, phoneHref }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(submitContactMessage, INITIAL_STATE)
  const formId = useId()

  // Alanlar DENETİMLİ: React 19 form action tamamlanınca denetimsiz alanları sıfırlıyor,
  // yani doğrulama hatası alan ziyaretçi yazdığı mesajı kaybederdi (LoginForm ölçümü).
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: '', email: '', phone: '', subject: '', body: '',
  })
  const set = (key: FieldName) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: event.target.value }))

  const alanHatasiVar = Object.keys(state.errors).length > 0
  const hata = (alan: string) => state.errors[alan]?.join(' ')

  // Başarıda form gizlenmiyor, temizlenip bildirim basılıyor: aynı ziyaretçi ikinci bir
  // soru sormak isteyebilir ve sayfayı yenilemek zorunda kalmamalı.
  if (state.ok) {
    return (
      <p role="status" className={styles.success}>
        {state.message}
      </p>
    )
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.message ? (
        <p role="alert" className={styles.alert}>
          {state.message}
          {/* Sunucu kaynaklı hatada (alan hatası yokken) telefon alternatifi sunuluyor —
              spec §11. Numara prop olarak geliyor: veritabanı erişilemiyorsa bu bileşen
              yeni bir sorgu çalıştıramaz, sayfa çizilirken alınan değeri kullanır. */}
          {!alanHatasiVar ? (
            <>
              {' '}
              <a href={phoneHref} className="textLink">{phone}</a>
            </>
          ) : null}
        </p>
      ) : null}

      {FIELDS.map((alan) => {
        const id = `${formId}-${alan.name}`
        const hataMetni = hata(alan.name)
        const ortak = {
          id,
          name: alan.name,
          required: alan.required,
          value: values[alan.name],
          onChange: set(alan.name),
          'aria-invalid': hataMetni ? (true as const) : undefined,
          'aria-describedby': hataMetni ? `${id}-error` : undefined,
        }
        return (
          <div key={alan.name} className={styles.field}>
            <label htmlFor={id} className={styles.label}>{alan.label}</label>
            {alan.multiline ? (
              <textarea {...ortak} rows={7} className={styles.textarea} />
            ) : (
              <input {...ortak} type={alan.type} autoComplete={alan.autoComplete} className={styles.input} />
            )}
            {/* role="alert": aria-describedby hatayı yalnız girdiye odaklanınca okutur.
                Formu gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı, canlı bölge
                olmadan sonucu hiç duymaz (LoginForm'daki aynı ölçüm). */}
            {hataMetni ? <p id={`${id}-error`} role="alert" className={styles.fieldError}>{hataMetni}</p> : null}
          </div>
        )
      })}

      {/* Honeypot. aria-hidden + tabIndex=-1: ekran okuyucu okumaz, klavye odaklanmaz,
          yani hiçbir gerçek kullanıcı yanlışlıkla dolduramaz. display:none KULLANILMIYOR —
          bazı botlar gizli alanları atlamayı biliyor; alan konumla ekran dışına taşınıyor. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Bu alanı boş bırakın</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.consent}>
        {/* defaultChecked YOK — spec §9: onay kutusu önceden işaretli değildir. */}
        <input
          id={`${formId}-kvkk`} name="kvkk" type="checkbox" value="evet" className={styles.checkbox}
          aria-invalid={hata('kvkk') ? true : undefined}
          aria-describedby={hata('kvkk') ? `${formId}-kvkk-error` : undefined}
        />
        <label htmlFor={`${formId}-kvkk`} className={styles.consentLabel}>
          <Link href="/kvkk" className="textLink">KVKK aydınlatma metnini</Link> okudum, kişisel
          verilerimin bu kapsamda işlenmesini kabul ediyorum.
        </label>
      </div>
      {hata('kvkk') ? <p id={`${formId}-kvkk-error`} role="alert" className={styles.fieldError}>{hata('kvkk')}</p> : null}

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? 'Gönderiliyor…' : 'Mesajı gönder'}
      </button>
    </form>
  )
}
```

`src/app/(site)/iletisim/ContactForm.module.css`:
```css
.form { display: grid; gap: 20px; max-width: 640px; margin-top: 32px; }
.field { display: grid; gap: 6px; }
.label { font-size: 14px; color: var(--text-muted); }
.input,
.textarea {
  font: inherit;
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--field-border);
  border-radius: var(--radius-card);
  padding: 12px 16px;
  min-height: 44px;
}
.textarea { resize: vertical; }
.input:focus-visible,
.textarea:focus-visible,
.checkbox:focus-visible,
.submit:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.fieldError { color: var(--danger); font-size: 14px; }
.alert {
  color: var(--danger);
  border: 1px solid var(--danger);
  border-radius: var(--radius-card);
  padding: 12px 16px;
}
.success {
  margin-top: 32px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: 16px 20px;
  background: var(--surface-raised);
}
.consent { display: flex; gap: 12px; align-items: flex-start; }
/* 24px WCAG 2.5.8'in tavanı; etiketle birlikte tıklanabilir alan zaten 44px'i aşıyor. */
.checkbox { width: 24px; height: 24px; margin-top: 2px; flex: none; accent-color: var(--accent); }
.consentLabel { font-size: 15px; line-height: 1.6; }
.submit {
  justify-self: start;
  min-height: 44px;
  padding: 12px 28px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.submit:disabled { opacity: .6; cursor: progress; }
/* Ekran dışına taşınıyor, display:none ile gizlenmiyor: bazı botlar display:none alanları
   atlamayı biliyor, konumla taşınanı bilmiyor. */
.honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
```

`src/app/(site)/iletisim/MapConsent.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { mapEmbedUrl, mapLinkUrl } from '@/lib/map-url'
import styles from './MapConsent.module.css'

type MapConsentProps = { lat: string; lng: string; address: string }

/**
 * Harita rıza sarıcısı (spec §9): Google'a istek YALNIZCA ziyaretçi düğmeye bastıktan
 * sonra gidiyor. iframe koşullu çiziliyor; `src`'yi baştan yazıp gizlemek hiçbir şeyi
 * engellemezdi, tarayıcı gizli iframe'i de yükler.
 */
export function MapConsent({ lat, lng, address }: MapConsentProps) {
  const [yuklendi, setYuklendi] = useState(false)
  const bagLanti = mapLinkUrl(lat, lng)

  return (
    <section className={styles.wrapper} aria-labelledby="harita-basligi">
      <h2 id="harita-basligi" className={styles.heading}>Konum</h2>

      {yuklendi ? (
        <iframe
          className={styles.frame}
          // Başlık zorunlu: adsız iframe ekran okuyucuda "çerçeve" diye geçer (WCAG 4.1.2).
          title="Büro konumunu gösteren Google Haritalar çerçevesi"
          src={mapEmbedUrl(lat, lng)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className={styles.placeholder}>
          <p className={styles.address}>{address}</p>
          <p className={styles.notice}>
            Harita Google Haritalar üzerinden yüklenir. Yüklediğinizde IP adresiniz ve
            tarayıcı bilgileriniz Google&apos;a iletilir.
          </p>
          {/* Gerçek <button>: klavyeyle odaklanır, Enter ve Boşluk ile çalışır. */}
          <button type="button" className={styles.consentButton} onClick={() => setYuklendi(true)}>
            Haritayı yükle
          </button>
        </div>
      )}

      {/* Her iki durumda da basılıyor: gömülü harita çizilmezse (engelleyici eklenti,
          Google tarafı değişikliği) ziyaretçinin haritaya ulaşan bir yolu kalsın. */}
      <a href={bagLanti} className={`textLink ${styles.externalLink}`} target="_blank" rel="noreferrer">
        Google Haritalar&apos;da aç (yeni sekmede)
      </a>
    </section>
  )
}
```

`src/app/(site)/iletisim/MapConsent.module.css`:
```css
.wrapper { margin-top: var(--section); display: grid; gap: 16px; }
.heading { font-family: var(--font-display), serif; font-size: 28px; font-weight: 400; }
.frame { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: var(--radius-block); display: block; }
.placeholder {
  border: 1px solid var(--line);
  border-radius: var(--radius-block);
  padding: 32px;
  display: grid;
  gap: 12px;
  justify-items: start;
  background: var(--surface-raised);
}
.address { font-size: 17px; }
.notice { color: var(--text-muted); font-size: 15px; max-width: 52ch; }
.consentButton {
  min-height: 44px;
  padding: 10px 24px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.consentButton:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.externalLink { justify-self: start; }
```

`src/app/(site)/iletisim/page.tsx` (tam yeniden yazım):
```tsx
import type { Metadata } from 'next'
import { PageHeading } from '@/components/PageHeading'
import { getSettings } from '@/db/queries/settings'
import { isValidCoordinatePair } from '@/lib/map-url'
import { ContactForm } from './ContactForm'
import { MapConsent } from './MapConsent'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'İletişim',
  alternates: { canonical: '/iletisim' },
}

// tel: ve wa.me adresleri yalnız rakam kabul ediyor; panelden gelen "+90 216 000 00 00"
// gibi biçimlendirilmiş değerden ayraçlar atılıyor. Başındaki + korunuyor: uluslararası
// biçimi kaybetmek, yurt dışından arayan müvekkilin numarayı çeviremeyeceği anlamına gelir.
function telHref(phone: string): string {
  const rakamlar = phone.replace(/[^\d+]/g, '')
  return `tel:${rakamlar}`
}

// wa.me artı işareti KABUL ETMİYOR, yalnız ülke kodu + numara istiyor.
function whatsappHref(whatsapp: string): string {
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}`
}

export default async function ContactPage() {
  const settings = await getSettings()
  const haritaVar = isValidCoordinatePair(settings.mapLat, settings.mapLng)

  return (
    <div className="pageShell">
      <PageHeading eyebrow="Bize Ulaşın" title="İletişim" />

      <address className={styles.address}>
        {settings.address}
        <br />
        <a href={telHref(settings.phone)} className="textLink">{settings.phone}</a>
        <br />
        <a href={`mailto:${settings.email}`} className="textLink">{settings.email}</a>
        {settings.kep ? (
          <>
            <br />
            KEP: {settings.kep}
          </>
        ) : null}
      </address>

      <div className={styles.quickActions}>
        <a href={telHref(settings.phone)} className={styles.action}>Telefonla ara</a>
        {/* WhatsApp numarası boşsa düğme HİÇ çizilmiyor: çalışmayan bir wa.me adresi,
            düğmenin olmamasından kötüdür. */}
        {settings.whatsapp ? (
          <a
            href={whatsappHref(settings.whatsapp)}
            className={styles.action}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp&apos;tan yazın (yeni sekmede)
          </a>
        ) : null}
      </div>

      <ContactForm phone={settings.phone} phoneHref={telHref(settings.phone)} />

      {haritaVar ? (
        <MapConsent
          lat={settings.mapLat as string}
          lng={settings.mapLng as string}
          address={settings.address}
        />
      ) : null}
    </div>
  )
}
```

`src/app/(site)/iletisim/page.module.css` (ekleme):
```css
.quickActions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.action {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  color: var(--text);
  text-decoration: none;
}
.action:hover { border-color: var(--accent); }
.action:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

`.env.example` (yeni dosya — `.gitignore` bunu `!.env.example` ile zaten hariç tutuyor):
```dotenv
# Veritabanı — ?charset= KULLANMAYIN, mysql2 tanımıyor (Plan 2 ölçümü).
DATABASE_URL=mysql://kullanici:parola@127.0.0.1:3306/tolga_akil_hukuk
AUTH_SECRET=
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
UPLOAD_DIR=.uploads

# İletişim formu e-postası (spec §6)
# smtp = gerçek gönderim, json = hiçbir yere bağlanmaz (yerel geliştirme ve testler).
MAIL_TRANSPORT=json
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
# Formun ulaşacağı büro adresi.
CONTACT_TO_EMAIL=buro@example.com
# Gönderen adresi büronun KENDİ alan adında olmalı; ziyaretçinin adresi yazılırsa
# SPF/DMARC düşer ve posta istenmeyen klasörüne gider.
CONTACT_FROM_EMAIL=site@example.com

# Tohum kullanıcıları (yalnız geliştirme)
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_EDITOR_EMAIL=
SEED_EDITOR_PASSWORD=
```

`.env.local` ve `.env.test` dosyalarına aynı beş satır eklenir (`MAIL_TRANSPORT=json`,
`SMTP_*` boş, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` `example.com` adresleriyle).
Bu dosyalar depoya girmiyor; yalnız yerel makinede düzenlenir.

- [ ] **Adım 5: Testlerin GEÇTİĞİNİ gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test && npx tsc --noEmit && npm run lint
```
Beklenen: PASS (üçü de).

- [ ] **Adım 6: ÖLÇÜM — Permissions-Policy iframe'i etkiliyor mu, gömülü harita çiziliyor mu**

`next.config.ts` içindeki `Permissions-Policy: camera=(), microphone=(), geolocation=()`
başlığı `/:path*` kaynağıyla bütün yollara iniyor. **Varsayma, ölç:**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm run dev
```
Ayrı bir kabukta:
```bash
curl -sI http://localhost:3000/iletisim | grep -i permissions-policy
```
Sonra tarayıcıda `http://localhost:3000/iletisim` açılır, DevTools **Console** ve **Network**
sekmeleri açık hâlde "Haritayı yükle" düğmesine **klavyeden** (Tab → Enter) basılır ve şunlar
kaydedilir:

1. `www.google.com/maps?...output=embed` isteği hangi durum kodunu döndürdü?
2. Harita karesi görsel olarak çizildi mi?
3. Konsola `Permissions-Policy` / `Potential permissions policy violation` uyarısı düştü mü?

**Karar kuralı:**
- Harita çiziliyor ve konsolda ihlal yoksa → başlık DEĞİŞTİRİLMEZ. `next.config.ts`'teki
  mevcut yorum, ölçüm sonucunu yazan bir cümleyle güncellenir
  (`# ölçüldü <tarih>: gömülü harita çiziliyor, yalnız Google'ın "konumumu göster" düğmesi çalışmıyor`).
- Yalnız konum uyarısı düşüyorsa → yine değiştirilmez; gömülü haritanın konum düğmesi
  büronun adresini göstermek için gerekli değil. Aynı yorum notu yazılır.
- Harita HİÇ çizilmiyorsa → önce `output=embed` adresinin döndürdüğü durum koduna bakılır.
  Google tarafı engelliyorsa (`X-Frame-Options`/`CSP` yanıtı) `MapConsent` gömülü çerçeveyi
  bırakır, yalnız statik önizleme + `mapLinkUrl` bağlantısı kalır ve testler ona göre
  güncellenir. Başlık nedeniyle engelleniyorsa `geolocation=()` yerine
  `geolocation=("https://www.google.com")` yazılır — izin tümüyle açılmaz.

Ölçüm sonucu görev raporuna üç satır olarak yazılır. **Ölçüm yapılmadan Adım 7'ye geçilmez.**

- [ ] **Adım 7: Mutasyon kanıtı**

1. `src/lib/contact-rate-limit.ts` içinde `admit`'in gövdesindeki
   `const budgetResult = budget.record(GLOBAL_KEY, now)` satırı
   `const budgetResult = budget.peek(GLOBAL_KEY, now)` yapılır → küresel sayaç hiç artmaz.
   `npm test` → `createContactGate > her seferinde farklı e-posta gönderen istemci küresel
   tavana takılır` KIRMIZI (`expected false to be true`). Satır geri alınır.

2. `src/lib/mailer.ts` içinde `headerSafe` gövdesi `return value.trim()` yapılır →
   `buildContactMail > konudaki satır sonlarını temizler` KIRMIZI. Geri alınır.

3. `src/lib/validation.ts` içinde `requiredCheckbox`'ın `.refine(...)` zinciri silinir →
   `contactSchema > KVKK onayı yoksa alan hatası verir` KIRMIZI. Geri alınır.

4. `src/lib/request-meta.ts` içinde `kirp` fonksiyonundan `.slice(0, max)` silinir →
   `requestMeta > sütuna sığmayan başlığı kırpar` KIRMIZI. Geri alınır.

5. `src/lib/map-url.ts` içinde `isValidCoordinatePair` sonundaki aralık kontrolü
   `return true` yapılır → `aralık dışı enlem/boylamı reddeder` KIRMIZI. Geri alınır.

- [ ] **Adım 8: Commit**

```bash
git add package.json package-lock.json .env.example \
  src/lib/request-meta.ts src/lib/request-meta.test.ts \
  src/lib/contact-rate-limit.ts src/lib/contact-rate-limit.test.ts \
  src/lib/map-url.ts src/lib/map-url.test.ts \
  src/lib/mailer.ts src/lib/mailer.test.ts \
  src/lib/validation.ts src/lib/validation.test.ts \
  src/db/queries/messages.ts src/db/queries/messages.test.ts \
  "src/app/(site)/iletisim" next.config.ts
git commit -m "feat: iletişim formu, KVKK onayı ve harita rıza sarıcısı

- server action: zod → messages tablosu → nodemailer (bu sırayla; ters sıra veri kaybettirir)
- e-posta gönderimi düşerse mesaj yine kayıtlı, hata sunucuya loglanıyor
- hız sınırı e-posta + küresel bütçe; IP başlığı sahte olabildiği için anahtar değil
- harita iframe'i yalnız tıklanınca yükleniyor; Permissions-Policy ölçüldü
- doğrulama: npm test, tsc --noEmit, lint"
```

---

### Görev 10: SEO, beslemeler ve yapılandırılmış veri

**Dosyalar:**
- Oluştur: `src/lib/xml.ts`, `src/lib/xml.test.ts`
- Oluştur: `src/lib/sitemap-entries.ts`, `src/lib/sitemap-entries.test.ts`
- Oluştur: `src/components/LegalServiceJsonLd.tsx`
- Oluştur: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/rss.xml/route.ts`
- Oluştur: `tests/e2e/seo.spec.ts`
- **Genişlet** (Görev 8'in oluşturduğu dosyalar; yeniden oluşturulmaz):
  `src/lib/json-ld.ts`, `src/lib/json-ld.test.ts`
- Değiştir: `src/app/layout.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/not-found.tsx`

`src/lib/site-url.ts`, `src/lib/site-url.test.ts` ve `vitest.config.mts` **bu görevde
oluşturulmaz veya değiştirilmez** — sahipleri Görev 7'dir. `.env.*` dosyalarındaki
`SITE_URL` satırı da Görev 7'de eklendi; burada yalnız varlığı doğrulanır.

**Arayüzler:**
- Tüketir: `listArticleFeedEntries(): Promise<PublicArticleCard[]>`, `listPublicCategories()`,
  `listPublicLawyers()`, `listPublicPracticeAreas()` (sözleşme §3);
  `getPage(slug: PageSlug)` ve `PAGE_SLUGS` (sözleşme §3.6); `getSettings()`;
  `TAGS`, `articleTag(slug)` (`src/lib/cache-tags.ts`).
- **Tüketir (Görev 7'den):** `SITE_URL: string`, `absoluteUrl(path: string): string`.
- **Tüketir (Görev 8'den):** `jsonLdScriptContent(data: unknown): string`,
  `JsonLd({ data })` bileşeni (`src/components/JsonLd.tsx`).
- Üretir: `escapeXml(value)`, `rssDocument(channel)`, `legalServiceJsonLd(input, siteUrl)`,
  `buildSitemap(input): MetadataRoute.Sitemap`.

**Next 16.3 doğrulanmış gerçek (yerel dokümandan, `15-route-handlers.md:144`):**
> `use cache` cannot be used directly inside a Route Handler body; extract it to a helper function.

Bu yüzden `sitemap.ts`, `robots.ts` ve `rss.xml/route.ts` içindeki veritabanı okumaları
**ayrı yardımcı fonksiyonlara** çıkarılıyor ve `'use cache'` oraya yazılıyor. Aynı doküman
(`sitemap.md`) sitemap'in varsayılan olarak statik olduğunu söylüyor; etiket verilmezse
panelden yayımlanan makale sitemap'e hiç düşmez.

- [ ] **Adım 1: Kırmızı testleri yaz**

(`src/lib/site-url.test.ts` bu görevde YAZILMAZ — Görev 7 Adım 1'de yazıldı ve orada
yeşile alındı. Buradaki testler `SITE_URL`/`absoluteUrl`'ü yalnız tüketir.)

`src/lib/xml.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { escapeXml, rssDocument } from '@/lib/xml'

describe('escapeXml', () => {
  // & ÖNCE kaçırılmalı: sonra kaçırılırsa &lt; içindeki & bir kez daha kaçırılıp
  // &amp;lt; olurdu ve okuyucu ekranda "&lt;" görürdü.
  it('& < > " \' karakterlerini kaçırır ve & ile başlar', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b')
    expect(escapeXml('<b>')).toBe('&lt;b&gt;')
    expect(escapeXml('"tırnak"')).toBe('&quot;tırnak&quot;')
    expect(escapeXml("it's")).toBe('it&apos;s')
    expect(escapeXml('&<')).toBe('&amp;&lt;')
  })

  it('Türkçe harfleri bozmaz', () => {
    expect(escapeXml('Çağrı İşçi öğüt')).toBe('Çağrı İşçi öğüt')
  })

  // XML 1.0'da geçersiz kontrol karakteri belgeyi tümüyle ayrıştırılamaz yapar; tek bir
  // makale özeti bütün beslemeyi düşürebilirdi.
  it('XML 1.0 için geçersiz kontrol karakterlerini atar', () => {
    expect(escapeXml('a\u0000b\u0008c')).toBe('abc')
    expect(escapeXml('satır\nsonu')).toBe('satır\nsonu')
  })
})

describe('rssDocument', () => {
  const kanal = {
    title: 'Akıl Hukuk Bürosu',
    link: 'https://ornek.av.tr',
    feedUrl: 'https://ornek.av.tr/rss.xml',
    description: 'Mesleki makaleler',
    language: 'tr',
    items: [
      {
        title: 'Kira & tahliye <davası>',
        link: 'https://ornek.av.tr/makaleler/kira-tahliye',
        guid: 'https://ornek.av.tr/makaleler/kira-tahliye',
        description: 'Özet metni "tırnaklı" & işaretli.',
        pubDate: new Date('2026-08-18T09:30:00Z'),
        category: 'Kira Hukuku',
      },
    ],
  }

  it('XML bildirimi ve rss kökü ile başlar', () => {
    const xml = rssDocument(kanal)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
  })

  it('başlıktaki & ve < karakterlerini kaçırır', () => {
    const xml = rssDocument(kanal)
    expect(xml).toContain('<title>Kira &amp; tahliye &lt;davası&gt;</title>')
    expect(xml).not.toContain('<davası>')
  })

  it('pubDate RFC-822 biçimindedir', () => {
    expect(rssDocument(kanal)).toContain('<pubDate>Tue, 18 Aug 2026 09:30:00 GMT</pubDate>')
  })

  it('öğe yoksa geçerli boş kanal üretir', () => {
    const xml = rssDocument({ ...kanal, items: [] })
    expect(xml).toContain('</channel>')
    expect(xml).not.toContain('<item>')
  })
})
```

`src/lib/json-ld.test.ts` (**mevcut dosyaya eklenir** — Görev 8 bu dosyayı oluşturdu ve
`jsonLdScriptContent` ile `articleJsonLd` describe bloklarını yazdı; onlara dokunulmaz,
aşağıdaki blok dosyanın sonuna eklenir ve import satırı `legalServiceJsonLd` ile genişletilir):
```ts
import { legalServiceJsonLd } from '@/lib/json-ld'

const AYAR = {
  officeName: 'Akıl Hukuk Bürosu',
  address: 'Örnek Mah. No: 1, Kadıköy / İstanbul',
  phone: '+90 216 000 00 00',
  email: 'info@example.com',
  mapLat: '41.0082',
  mapLng: '28.9784',
}

describe('legalServiceJsonLd', () => {
  it('LegalService tipini ve zorunlu alanları üretir', () => {
    const veri = legalServiceJsonLd(AYAR, 'https://ornek.av.tr')
    expect(veri['@type']).toBe('LegalService')
    expect(veri.name).toBe('Akıl Hukuk Bürosu')
    expect(veri.url).toBe('https://ornek.av.tr')
  })

  // spec §10 + §2.1: yıldız işaretlemesi TBB'ye göre reklam sayılır.
  it('aggregateRating ve review ÜRETMEZ', () => {
    const veri = legalServiceJsonLd(AYAR, 'https://ornek.av.tr')
    expect(JSON.stringify(veri)).not.toContain('aggregateRating')
    expect(JSON.stringify(veri)).not.toContain('review')
    expect(JSON.stringify(veri)).not.toContain('priceRange')
  })

  it('koordinat yoksa geo alanını hiç eklemez', () => {
    const veri = legalServiceJsonLd({ ...AYAR, mapLat: null, mapLng: null }, 'https://ornek.av.tr')
    expect(veri.geo).toBeUndefined()
  })
})
```

(`jsonLdScriptContent`'in kaçış testleri Görev 8 Adım 1'de aynı dosyaya yazıldı; burada
ikinci kez yazılmaz. Büro adı panelden düzenlendiği için `</script>` kaçışı bu şema için de
kritiktir — ama korumayı ve testini tek yerde tutuyoruz.)

`src/lib/sitemap-entries.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { STATIC_SITEMAP_PATHS, buildSitemap } from '@/lib/sitemap-entries'

const GIRDI = {
  siteUrl: 'https://ornek.av.tr',
  articles: [{ slug: 'kira-tahliye', publishedAt: new Date('2026-08-18T09:30:00Z') }],
  categories: [{ slug: 'kira-hukuku' }],
  lawyers: [{ slug: 'ayse-yilmaz' }],
  practiceAreas: [{ slug: 'aile-hukuku' }],
}

describe('STATIC_SITEMAP_PATHS', () => {
  // /panel kimlik doğrulaması istiyor; sitemap'e yazmak tarayıcıyı giriş sayfasına
  // yollamaktan başka bir işe yaramaz ve panel adreslerini duyurur.
  it('/panel ve /api yollarını içermez', () => {
    for (const yol of STATIC_SITEMAP_PATHS) {
      expect(yol.startsWith('/panel')).toBe(false)
      expect(yol.startsWith('/api')).toBe(false)
    }
  })

  it('kök ve hukuki metin sayfalarını içerir', () => {
    expect(STATIC_SITEMAP_PATHS).toContain('/')
    expect(STATIC_SITEMAP_PATHS).toContain('/kvkk')
    expect(STATIC_SITEMAP_PATHS).toContain('/cerez-politikasi')
  })
})

describe('buildSitemap', () => {
  it('her adresi mutlak yazar', () => {
    for (const girdi of buildSitemap(GIRDI)) {
      expect(girdi.url.startsWith('https://ornek.av.tr')).toBe(true)
    }
  })

  it('makale, kategori, avukat ve çalışma alanı adreslerini içerir', () => {
    const adresler = buildSitemap(GIRDI).map((g) => g.url)
    expect(adresler).toContain('https://ornek.av.tr/makaleler/kira-tahliye')
    expect(adresler).toContain('https://ornek.av.tr/makaleler/kategori/kira-hukuku')
    expect(adresler).toContain('https://ornek.av.tr/kadro/ayse-yilmaz')
    expect(adresler).toContain('https://ornek.av.tr/calisma-alanlari/aile-hukuku')
  })

  it('hiçbir panel adresi üretmez', () => {
    expect(buildSitemap(GIRDI).some((g) => g.url.includes('/panel'))).toBe(false)
  })

  it('aynı adresi iki kez yazmaz', () => {
    const adresler = buildSitemap(GIRDI).map((g) => g.url)
    expect(new Set(adresler).size).toBe(adresler.length)
  })

  it('makalenin lastModified değeri yayım tarihidir', () => {
    const makale = buildSitemap(GIRDI).find((g) => g.url.endsWith('/kira-tahliye'))
    expect(makale?.lastModified).toEqual(new Date('2026-08-18T09:30:00Z'))
  })
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test
```
Beklenen: FAIL — `Failed to resolve import "@/lib/xml"`, `"@/lib/sitemap-entries"` ve
`src/lib/json-ld.ts` içinde `legalServiceJsonLd` dışa aktarılmadığı için tip hatası.
(`@/lib/site-url` bu noktada ÇÖZÜLÜR — Görev 7 onu yazdı.)

- [ ] **Adım 3: En küçük uygulamayı yaz**

`src/lib/xml.ts`:
```ts
// XML 1.0 metin düğümünde geçerli olmayan kontrol karakterleri. Tek bir tanesi belgeyi
// ayrıştırılamaz yapar ve okuyucu bütün beslemeyi reddeder.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

/** & MUTLAKA ilk sırada: sonra kaçırılsaydı &lt; içindeki & ikinci kez kaçırılırdı. */
export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export type RssItem = {
  title: string
  link: string
  guid: string
  description: string
  pubDate: Date
  category?: string
}

export type RssChannel = {
  title: string
  link: string
  feedUrl: string
  description: string
  language: string
  items: RssItem[]
}

function item(entry: RssItem): string {
  const kategori = entry.category === undefined ? '' : `\n      <category>${escapeXml(entry.category)}</category>`
  // isPermaLink="true": guid makalenin kalıcı adresi. Adres değişirse okuyucu yazıyı yeni
  // sayar; slug'ı sabit tutmak bu yüzden önemli.
  return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.link)}</link>
      <guid isPermaLink="true">${escapeXml(entry.guid)}</guid>
      <description>${escapeXml(entry.description)}</description>
      <pubDate>${entry.pubDate.toUTCString()}</pubDate>${kategori}
    </item>`
}

/**
 * RSS 2.0 belgesi üretir.
 *
 * CDATA KULLANILMIYOR, kaçırma kullanılıyor: CDATA içinde `]]>` dizisi bloğu erken kapatır
 * ve o dizi makale özetinde geçebilir (kod örneği veren bir hukuk makalesi bile olabilir).
 * Kaçırmanın böyle bir kaçış deliği yok.
 *
 * `lastBuildDate` en yeni öğenin tarihinden alınıyor, `new Date()`'ten DEĞİL: bu fonksiyon
 * `'use cache'` altındaki bir yardımcıdan çağrılıyor ve orada üretilen "şimdi" zaten
 * donmuş olurdu — yanıltıcı bir tarih basmaktansa gerçek veriye dayanmak doğru.
 */
export function rssDocument(channel: RssChannel): string {
  const enYeni = channel.items[0]?.pubDate
  const lastBuild = enYeni === undefined ? '' : `\n    <lastBuildDate>${enYeni.toUTCString()}</lastBuildDate>`
  const items = channel.items.map(item).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>${lastBuild}
${items}
  </channel>
</rss>
`
}
```

`src/lib/json-ld.ts` (**mevcut dosyaya eklenir** — Görev 8 bu dosyayı oluşturdu;
`jsonLdScriptContent` ve `articleJsonLd` orada duruyor, ikisi de yeniden tanımlanmaz.
Aşağıdaki iki dışa aktarım dosyanın sonuna eklenir):
```ts
export type LegalServiceInput = {
  officeName: string
  address: string
  phone: string
  email: string
  mapLat: string | null
  mapLng: string | null
}

/**
 * Büro için `LegalService` şeması.
 *
 * `aggregateRating`, `review` ve `priceRange` BİLİNÇLİ OLARAK YOK (spec §10 + §2.1):
 * yıldız işaretlemesi ve ücret bilgisi TBB Reklam Yasağı Yönetmeliği kapsamında reklam
 * sayılır. Buraya "SEO'ya iyi gelir" gerekçesiyle eklenmesi bir mevzuat ihlalidir.
 */
export function legalServiceJsonLd(input: LegalServiceInput, siteUrl: string): Record<string, unknown> {
  const geo =
    input.mapLat !== null && input.mapLng !== null
      ? { '@type': 'GeoCoordinates', latitude: input.mapLat, longitude: input.mapLng }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: input.officeName,
    url: siteUrl,
    telephone: input.phone,
    email: input.email,
    address: { '@type': 'PostalAddress', streetAddress: input.address, addressCountry: 'TR' },
    ...(geo === undefined ? {} : { geo }),
  }
}
```

`jsonLdScriptContent` BURAYA YAZILMAZ: dosyanın üstünde, Görev 8'de zaten tanımlı ve
`<`, `>`, `&` karakterlerini JSON birim kaçışıyla yazıyor. İkinci bir kaçış uygulaması,
iki koruma arasında sessizce ayrışan bir güvenlik yüzeyi demek olurdu.

`src/lib/sitemap-entries.ts`:
```ts
import type { MetadataRoute } from 'next'

/**
 * Sitemap'e giren sabit yollar.
 *
 * `/panel/**` ve `/api/**` YOK: ikisi de kimlik doğrulaması istiyor ya da makine arayüzü.
 * Liste elle tutuluyor, gezinme menüsünden türetilmiyor — menüye yarın eklenecek bir
 * panel kısayolu sessizce sitemap'e sızmasın.
 */
export const STATIC_SITEMAP_PATHS = [
  '/', '/hakkimizda', '/kadro', '/calisma-alanlari', '/makaleler',
  '/iletisim', '/kvkk', '/cerez-politikasi',
] as const

export type SitemapInput = {
  siteUrl: string
  articles: Array<{ slug: string; publishedAt: Date }>
  categories: Array<{ slug: string }>
  lawyers: Array<{ slug: string }>
  practiceAreas: Array<{ slug: string }>
}

export function buildSitemap(input: SitemapInput): MetadataRoute.Sitemap {
  const enYeniMakale = input.articles[0]?.publishedAt
  const girdiler: MetadataRoute.Sitemap = []
  const gorulen = new Set<string>()

  function ekle(path: string, lastModified?: Date): void {
    const url = path === '/' ? input.siteUrl : `${input.siteUrl}${path}`
    // Tekrarlı adres arama motoruna aynı sayfayı iki kez bildirir; Set ile eleniyor.
    if (gorulen.has(url)) return
    gorulen.add(url)
    girdiler.push(lastModified === undefined ? { url } : { url, lastModified })
  }

  for (const path of STATIC_SITEMAP_PATHS) {
    // Arşiv sayfasının tazeliği en yeni makaleye bağlı; diğer sabit sayfalarda tarih
    // uydurmuyoruz — yanlış bir lastModified, hiç olmamasından kötüdür.
    ekle(path, path === '/makaleler' || path === '/' ? enYeniMakale : undefined)
  }
  for (const a of input.articles) ekle(`/makaleler/${a.slug}`, a.publishedAt)
  for (const c of input.categories) ekle(`/makaleler/kategori/${c.slug}`, enYeniMakale)
  for (const l of input.lawyers) ekle(`/kadro/${l.slug}`)
  for (const p of input.practiceAreas) ekle(`/calisma-alanlari/${p.slug}`)

  return girdiler
}
```

`src/app/sitemap.ts`:
```ts
import type { MetadataRoute } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { listArticleFeedEntries } from '@/db/queries/public/articles'
import { listPublicCategories } from '@/db/queries/public/categories'
import { listPublicLawyers } from '@/db/queries/public/lawyers'
import { listPublicPracticeAreas } from '@/db/queries/public/practice-areas'
import { TAGS } from '@/lib/cache-tags'
import { SITE_URL } from '@/lib/site-url'
import { buildSitemap } from '@/lib/sitemap-entries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapData()
}

// 'use cache' AYRI FONKSİYONDA: Next 16.3 dokümanı (route-handlers.md) yönergenin bir
// route handler gövdesinin içinde kullanılamayacağını, yardımcıya çıkarılması gerektiğini
// söylüyor. sitemap.ts de özel bir route handler.
//
// Etiketler zorunlu: doküman sitemap'in varsayılan olarak STATİK olduğunu yazıyor, yani
// etiketsiz bir sürümde panelden yayımlanan makale sitemap'e bir daha hiç düşmezdi.
// Panel eylemleri bu etiketleri zaten revalidateTag ile tazeliyor (Plan 2).
async function sitemapData(): Promise<MetadataRoute.Sitemap> {
  'use cache'
  cacheTag(TAGS.articles, TAGS.categories, TAGS.lawyers, TAGS.practiceAreas)
  cacheLife('hours')

  const [articles, categories, lawyers, practiceAreas] = await Promise.all([
    listArticleFeedEntries(),
    listPublicCategories(),
    listPublicLawyers(),
    listPublicPracticeAreas(),
  ])

  return buildSitemap({
    siteUrl: SITE_URL,
    articles: articles.map((a) => ({ slug: a.slug, publishedAt: a.publishedAt })),
    categories: categories.map((c) => ({ slug: c.slug })),
    lawyers: lawyers.map((l) => ({ slug: l.slug })),
    practiceAreas: practiceAreas.map((p) => ({ slug: p.slug })),
  })
}
```

`src/app/robots.ts`:
```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

// Veri okumuyor, bu yüzden 'use cache' gerekmez: derleme sırasında statik üretilir.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /panel kimlik doğrulaması istiyor, /api makine arayüzü. robots.txt bir güvenlik
        // önlemi DEĞİL (dosya herkese açık ve uyulması gönüllü); asıl koruma proxy.ts ve
        // her server action'ın kendi yetki denetimi. Buradaki amaç yalnız tarayıcı
        // bütçesini boşa harcatmamak.
        disallow: ['/panel', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

`src/app/rss.xml/route.ts`:
```ts
import { cacheLife, cacheTag } from 'next/cache'
import { listArticleFeedEntries } from '@/db/queries/public/articles'
import { getSettings } from '@/db/queries/settings'
import { TAGS } from '@/lib/cache-tags'
import { SITE_URL, absoluteUrl } from '@/lib/site-url'
import { rssDocument } from '@/lib/xml'

// RSS için Next'te dosya kuralı YOK; route handler elle yazılıyor (sözleşme §4.1).
export async function GET(): Promise<Response> {
  const xml = await feedXml()
  return new Response(xml, {
    headers: {
      // charset açıkça yazılıyor: Türkçe harfler UTF-8 olarak yorumlanmazsa okuyucuda bozulur.
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

async function feedXml(): Promise<string> {
  'use cache'
  cacheTag(TAGS.articles, TAGS.settings)
  cacheLife('hours')

  const [settings, entries] = await Promise.all([getSettings(), listArticleFeedEntries()])

  return rssDocument({
    title: settings.officeName,
    link: SITE_URL,
    feedUrl: absoluteUrl('/rss.xml'),
    // Övgü sıfatı içermeyen, sayfa konusunu bildiren düz açıklama (spec §2.1).
    description: `${settings.officeName} tarafından yayımlanan mesleki makaleler.`,
    language: 'tr',
    items: entries.map((entry) => ({
      title: entry.title,
      link: absoluteUrl(`/makaleler/${entry.slug}`),
      guid: absoluteUrl(`/makaleler/${entry.slug}`),
      // Gövde olarak ÖZET kullanılıyor, tam HTML değil: beslemeye sanitize edilmiş bile
      // olsa işaretleme koymak okuyucuya göre değişen bir çıktı üretir ve tam metni
      // beslemede yayımlamak ziyaretçiyi siteye hiç getirmez.
      description: entry.excerpt,
      pubDate: entry.publishedAt,
      ...(entry.categoryName === null ? {} : { category: entry.categoryName }),
    })),
  })
}
```

`src/components/LegalServiceJsonLd.tsx`:
```tsx
import { JsonLd } from '@/components/JsonLd'
import { legalServiceJsonLd, type LegalServiceInput } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/site-url'

type LegalServiceJsonLdProps = { settings: LegalServiceInput }

// Görev 8'in JsonLd bileşeni kullanılıyor; ikinci bir dangerouslySetInnerHTML yolu
// AÇILMIYOR. Kaçış tek yerde (jsonLdScriptContent) yaşarsa, oradaki bir düzeltme sitedeki
// bütün şemaları birden korur; iki kopya olsaydı biri güncellenip diğeri unutulurdu.
export function LegalServiceJsonLd({ settings }: LegalServiceJsonLdProps) {
  return <JsonLd data={legalServiceJsonLd(settings, SITE_URL)} />
}
```

`src/app/layout.tsx` (değişiklik — `metadata` bloğuna **tek satır** eklenir).
`metadataBase` ve `SITE_URL` import'u Görev 7'de eklendi; burada yalnız `openGraph`
satırı ekleniyor. Blok, değişiklikten sonraki hâliyle:
```ts
import { SITE_URL } from '@/lib/site-url'

export const metadata: Metadata = {
  // metadataBase olmadan göreli canonical ve Open Graph adresleri mutlak hâle gelmez;
  // Next derleme sırasında uyarı basıp localhost varsayar. (Görev 7'de eklendi.)
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: 'Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık.',
  openGraph: { type: 'website', locale: 'tr_TR', siteName: SITE.name },   // ← bu görevde eklenen satır
  // alternates.canonical BURAYA YAZILMIYOR. Kök metadata alt sayfalara miras kalıyor;
  // burada '/' yazılsaydı sitedeki her sayfa kendini ana sayfaya canonical gösterirdi ve
  // makaleler indeksten düşerdi. Canonical her sayfanın KENDİ metadata'sında verilir.
}
```

`src/app/(site)/page.tsx` (değişiklik — Görev 2/6 sonrası hâline iki satır ekleniyor):
```tsx
import { LegalServiceJsonLd } from '@/components/LegalServiceJsonLd'
// ...
      <LegalServiceJsonLd settings={settings} />
```
`settings` ana sayfada zaten `getSettings()` ile alınıyor (Görev 2). Alınmıyorsa bu satırdan
önce `const settings = await getSettings()` eklenir. Bileşen `<Hero />`'dan hemen önce,
döndürülen parçanın en üstüne konur.

`src/app/(site)/not-found.tsx` (ekleme):
```ts
import type { Metadata } from 'next'

// 404 sayfası indekslenmemeli; başlık da varsayılan büro adında kalmamalı.
export const metadata: Metadata = { title: 'Sayfa bulunamadı', robots: { index: false } }
```

**404/500 durumu:** `src/app/(site)/not-found.tsx`, `src/app/not-found.tsx`,
`src/app/(site)/error.tsx` ve `src/app/global-error.tsx` **mevcut ve tasarımın parçası**
(Plan 1'de yazılmış, telefon alternatifi ve token'lı stil içeriyor). Eksik olan tek şey
yukarıdaki `metadata` bloğuydu; yeni dosya oluşturulmuyor.

- [ ] **Adım 4: e2e denetim testini yaz**

`tests/e2e/seo.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

const KAMUYA_ACIK = [
  '/', '/hakkimizda', '/kadro', '/calisma-alanlari', '/makaleler',
  '/iletisim', '/kvkk', '/cerez-politikasi',
] as const

// Canonical her sayfanın KENDİ metadata'sında veriliyor (kökte verilirse hepsi '/' olurdu).
// Bu test, herhangi bir görevde unutulan canonical'ı yakalar: eksikse ilgili sayfanın
// metadata'sına `alternates: { canonical: '<yol>' }` eklenir.
for (const yol of KAMUYA_ACIK) {
  test(`${yol} tek ve kendine işaret eden canonical taşır`, async ({ page }) => {
    await page.goto(yol)
    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveCount(1)
    const href = await canonical.getAttribute('href')
    expect(href).not.toBeNull()
    expect(new URL(href as string).pathname).toBe(yol)
  })
}

test('robots.txt paneli ve api yolunu engeller, sitemap adresini bildirir', async ({ request }) => {
  const yanit = await request.get('/robots.txt')
  expect(yanit.status()).toBe(200)
  const metin = await yanit.text()
  expect(metin).toContain('Disallow: /panel')
  expect(metin).toContain('Disallow: /api')
  expect(metin).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/)
})

test('sitemap.xml geçerli XML ve hiçbir panel adresi içermiyor', async ({ request }) => {
  const yanit = await request.get('/sitemap.xml')
  expect(yanit.status()).toBe(200)
  const xml = await yanit.text()
  expect(xml).toContain('<urlset')
  expect(xml).toContain('/iletisim')
  expect(xml).not.toContain('/panel')
})

test('rss.xml doğru içerik tipiyle ve geçerli XML olarak servis edilir', async ({ request }) => {
  const yanit = await request.get('/rss.xml')
  expect(yanit.status()).toBe(200)
  expect(yanit.headers()['content-type']).toContain('application/rss+xml')

  const xml = await yanit.text()
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  // Kaçırılmamış ham & besleme okuyucularını düşürür; kaçırılmış olan &amp; içinde geçer.
  expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#)/)
})

test('ana sayfa LegalService şeması basar, aggregateRating veya review BASMAZ', async ({ page }) => {
  await page.goto('/')
  const ham = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(ham).not.toBeNull()
  const veri = JSON.parse(ham as string)
  expect(veri['@type']).toBe('LegalService')
  // spec §10 + §2.1 — yıldız işaretlemesi reklam sayılır.
  expect(ham).not.toContain('aggregateRating')
  expect(ham).not.toContain('review')
})
```

- [ ] **Adım 5: Ortam değişkenini DOĞRULA ve testlerin GEÇTİĞİNİ gör**

`SITE_URL` satırı `.env.example`, `.env.local` ve `.env.test` içine Görev 7'de eklendi;
burada yalnız üçünde de bulunduğu doğrulanır (yoksa Görev 7 eksik uygulanmıştır, oraya
dönülür — buraya ikinci kez yazılmaz):
```bash
grep -l '^SITE_URL=' .env.example .env.local .env.test
```
(Üretimde büronun gerçek alan adı yazılır; alan adı seçimi spec §13'te açık madde.)

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npm test && npx tsc --noEmit && npm run lint && npm run build
```
Beklenen: dördü de PASS.

- [ ] **Adım 6: ÖLÇÜM — derleme çıktısı ve etiketle tazeleme**

1. `npm run build` çıktısındaki rota tablosunda `/sitemap.xml`, `/robots.txt` ve `/rss.xml`
   satırlarının işareti (statik `○` / önbellekli `◐` / dinamik `ƒ`) not edilir.
   Beklenti: `'use cache'` sayesinde sitemap ve rss önceden üretiliyor, robots statik.
   **Derleme `'use cache'` yüzünden hata verirse** (yönerge özel route handler'da
   desteklenmiyorsa) yardımcı fonksiyonlar `'use cache'` olmadan bırakılır; bu durumda
   rotalar istek anında çalışır, davranış doğru kalır, yalnız her istek veritabanına gider.
   Hangi yolun seçildiği görev raporuna yazılır.
2. Değişkeni kaldırarak derlemenin GERÇEKTEN düştüğü doğrulanır:
   ```bash
   SITE_URL= npm run build
   ```
   Beklenen: derleme `SITE_URL tanımlı değil` mesajıyla sıfırdan farklı çıkış kodu
   döndürür. Düşmüyorsa `site-url.ts` kök layout'tan gerçekten import edilmiyor demektir;
   import zinciri düzeltilir.
3. `npm run start` ile üretim sunucusu açılır, `/sitemap.xml` alınır; panelden yeni bir makale
   yayımlanır; `/sitemap.xml` yeniden alınır ve yeni slug'ın **listeye girdiği** görülür.
   Girmiyorsa `cacheTag` etiketleri panel eyleminin `revalidateTag` çağrılarıyla
   eşleşmiyordur (`src/lib/cache-tags.ts` tek kaynak).

- [ ] **Adım 7: Mutasyon kanıtı**

1. `src/lib/xml.ts` içinde `escapeXml`'in `.replace(/&/g, '&amp;')` satırı silinir →
   `escapeXml > & < > " ' karakterlerini kaçırır` ve `rssDocument > başlıktaki & ve <
   karakterlerini kaçırır` KIRMIZI. Geri alınır.
2. `escapeXml` içinde `&` ve `<` kaçırma satırlarının SIRASI değiştirilir (`<` önce) →
   `escapeXml('&<')` `&amp;&lt;` yerine `&amp;lt;`… üretir, aynı test KIRMIZI. Geri alınır.
3. `src/lib/json-ld.ts` içinde `legalServiceJsonLd`'nin dönen nesnesine
   `aggregateRating: { '@type': 'AggregateRating', ratingValue: 5 }` eklenir →
   `legalServiceJsonLd > aggregateRating ve review ÜRETMEZ` ve e2e `LegalService şeması
   yıldız işaretlemesi taşımaz` KIRMIZI. Geri alınır.
   (`jsonLdScriptContent` kaçışının ve `resolveSiteUrl`'ün mutasyon kanıtları Görev 8 ve
   Görev 7'de verildi; aynı üretim kodu ikinci kez bozulmuyor.)
4. `src/lib/json-ld.ts` içinde `legalServiceJsonLd`'nin `geo` koşulu
   `input.mapLat !== null && input.mapLng !== null` yerine `true` yapılır →
   `koordinat yoksa geo alanını hiç eklemez` KIRMIZI. Geri alınır.
5. `src/lib/sitemap-entries.ts` içindeki `STATIC_SITEMAP_PATHS` dizisine geçici olarak
   `'/panel'` eklenir → `STATIC_SITEMAP_PATHS > /panel ve /api yollarını içermez` ve
   `buildSitemap > hiçbir panel adresi üretmez` KIRMIZI. Geri alınır.

- [ ] **Adım 8: Commit**

```bash
git add src/lib/xml.ts src/lib/xml.test.ts \
  src/lib/json-ld.ts src/lib/json-ld.test.ts src/lib/sitemap-entries.ts src/lib/sitemap-entries.test.ts \
  src/components/LegalServiceJsonLd.tsx src/app/sitemap.ts src/app/robots.ts src/app/rss.xml \
  src/app/layout.tsx "src/app/(site)/page.tsx" "src/app/(site)/not-found.tsx" \
  tests/e2e/seo.spec.ts
git commit -m "feat: sitemap, robots, RSS ve LegalService yapılandırılmış verisi

- mutlak adresler Görev 7'nin SITE_URL/absoluteUrl'ünden; ikinci bir çözücü yok
- 'use cache' route handler gövdesinde değil yardımcıda (Next 16.3 dokümanı)
- RSS'te XML kaçırma testli; CDATA yerine kaçırma (]]> kaçış deliği yok)
- aggregateRating/review yok (spec §10, TBB reklam yasağı)
- doğrulama: npm test, tsc --noEmit, lint, build, test:e2e (seo.spec.ts)"
```

---

### Görev 11: Uçtan uca doğrulama ve erişilebilirlik denetimi

**Dosyalar:**
- Oluştur: `tests/e2e/helpers/test-article.ts`
- Oluştur: `tests/e2e/helpers/test-message.ts`
- Oluştur: `tests/e2e/makale-yayin-akisi.spec.ts`
- Oluştur: `tests/e2e/iletisim-formu.spec.ts`
- Oluştur: `tests/e2e/site-erisilebilirlik.spec.ts`

**Arayüzler:**
- Tüketir: `temizlikciAc(): Promise<Temizlikci>` (`tests/e2e/helpers/db-cleanup.ts`);
  `girisYap(page, kullanici)`, `EDITOR`, `ADMIN` (`tests/e2e/helpers/auth.ts`);
  `panelGezinmesiniAc(page)` (`tests/e2e/helpers/panel-nav.ts`);
  Görev 9'un `/iletisim` formu; Görev 3'ün `/makaleler?q=` araması ve
  `/makaleler/kategori/[slug]` filtresi.
- Üretir: `yayimlanmisMakaleHazirla(): Promise<TestMakalesi>`,
  `mesajTemizligiHazirla(): Promise<MesajTemizligi>`.

**Ön koşul (bağlayıcı):** `.env.local` içinde `MAIL_TRANSPORT=json` bulunmalı. Yoksa iletişim
e2e testi gerçek SMTP'ye bağlanmayı dener. Kontrol:
```bash
grep -c '^MAIL_TRANSPORT=json$' .env.local
```
Beklenen: `1`. Değilse satır eklenir ve `npm run dev` yeniden başlatılır (Next ortam
dosyasını yalnız açılışta okuyor).

- [ ] **Adım 1: Yardımcıları ve kırmızı testleri yaz**

`tests/e2e/helpers/test-article.ts`:
```ts
import { randomBytes } from 'node:crypto'
import { temizlikciAc } from './db-cleanup'

export type TestMakalesi = {
  /** Başlıkta, özette ve slug'da geçen benzersiz ek; arama testi bunu arıyor. */
  damga: string
  slug: string
  baslik: string
  kategoriAdi: string
  kategoriSlug: string
  temizle: () => Promise<void>
}

/**
 * Doğrudan veritabanına YAYIMLANMIŞ bir makale ve kategorisi kurar.
 *
 * Arayüzden geçmiyor: bu yardımcıyı kullanan testler (erişilebilirlik denetimi) makalenin
 * NASIL oluştuğuyla değil, sayfanın nasıl çizildiğiyle ilgileniyor. Arayüzden kurmak her
 * denetim testine bir tam panel turu eklerdi.
 *
 * Damga 13 karakter: MariaDB'nin innodb_ft_min_token_size değeri 3 (Plan 2'de ölçüldü),
 * yani daha kısa bir damga FULLTEXT indeksine hiç girmez ve arama testi hiçbir zaman
 * eşleşmezdi.
 */
export async function yayimlanmisMakaleHazirla(): Promise<TestMakalesi> {
  const damga = `e2e${randomBytes(5).toString('hex')}`
  const kategoriAdi = `E2E Kategori ${damga}`
  const kategoriSlug = `e2e-kategori-${damga}`
  const baslik = `Kira tespit incelemesi ${damga}`
  const slug = `kira-tespit-incelemesi-${damga}`
  const ozet = `Kira bedelinin belirlenmesine ilişkin ölçütleri özetleyen ${damga} notu.`
  const temizlikci = await temizlikciAc()

  await temizlikci.calistir('INSERT INTO categories (slug, name) VALUES (?, ?)', [kategoriSlug, kategoriAdi])
  const [kategori] = await temizlikci.sorgu<{ id: number }>(
    'SELECT id FROM categories WHERE slug = ?', [kategoriSlug],
  )
  if (kategori === undefined) throw new Error('E2E kategorisi kurulamadı.')

  await temizlikci.calistir(
    `INSERT INTO articles (slug, title, excerpt, content, status, published_at, category_id)
     VALUES (?, ?, ?, ?, 'published', UTC_TIMESTAMP(), ?)`,
    [slug, baslik, ozet, '<p>Kiracının hakları ve süreler.</p>', kategori.id],
  )

  return {
    damga, slug, baslik, kategoriAdi, kategoriSlug,
    async temizle() {
      try {
        // Sıra zorunlu: articles.category_id kısıtı ON DELETE RESTRICT.
        await temizlikci.sil('DELETE FROM articles WHERE slug = ?', [slug])
        await temizlikci.sil('DELETE FROM categories WHERE slug = ?', [kategoriSlug])
      } finally {
        // Bağlantı her durumda kapanmalı; açık kalırsa süit çıkışta askıda kalır ve asıl
        // hatayı örter (test-content.ts'teki aynı gerekçe).
        await temizlikci.kapat()
      }
    },
  }
}
```

`tests/e2e/helpers/test-message.ts`:
```ts
import { randomBytes } from 'node:crypto'
import { temizlikciAc } from './db-cleanup'

export type MesajTemizligi = {
  damga: string
  eposta: string
  /** Damgayla eşleşen mesaj satırlarını okur; iddialar bunu kullanıyor. */
  mesajlar: () => Promise<Array<{ name: string; email: string; kvkk_accepted_at: Date | null }>>
  temizle: () => Promise<void>
}

/**
 * İletişim formu testinin kendi damgasını kurar ve SİLER.
 *
 * Temizlik zorunlu: form testi her koşumda `messages` tablosuna satır yazıyor ve
 * temizlenmezse geliştirme veritabanında birikir. Plan 2'de tam olarak bu yaşandı
 * (14 koşum boyunca sessizce temizlenmeyen satırlar).
 *
 * E-posta her koşumda benzersiz: hız sınırı e-postaya anahtarlı (contact-rate-limit.ts),
 * sabit bir adres kullanılsaydı üçüncü koşumdan sonra testler sınıra takılırdı.
 */
export async function mesajTemizligiHazirla(): Promise<MesajTemizligi> {
  const damga = `e2e${randomBytes(5).toString('hex')}`
  const eposta = `${damga}@example.com`
  const temizlikci = await temizlikciAc()

  return {
    damga,
    eposta,
    async mesajlar() {
      return temizlikci.sorgu('SELECT name, email, kvkk_accepted_at FROM messages WHERE email = ?', [eposta])
    },
    async temizle() {
      try {
        // silmeyeCalis: doğrulama hatasını ölçen testler hiç satır yazmıyor, sıfır normal.
        await temizlikci.silmeyeCalis('DELETE FROM messages WHERE email = ?', [eposta])
      } finally {
        await temizlikci.kapat()
      }
    },
  }
}
```

`tests/e2e/makale-yayin-akisi.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import { girisYap, EDITOR } from './helpers/auth'
import { testIcerigiHazirla, type TestIcerigi } from './helpers/test-content'

let icerik: TestIcerigi | null = null

test.beforeEach(async () => {
  icerik = await testIcerigiHazirla()
})

// Referans önce boşaltılıyor: beforeEach düşerse afterEach bir önceki testin kapatılmış
// bağlantısına dokunup asıl hatayı örterdi (panel-makale.spec.ts'teki aynı düzen).
test.afterEach(async () => {
  const mevcut = icerik
  icerik = null
  await mevcut?.temizle()
})

function hazir(): TestIcerigi {
  if (icerik === null) throw new Error('Test içeriği hazırlanmadı; beforeEach düşmüş olmalı.')
  return icerik
}

// spec §12'nin tam akışı, tek testte: ara adımların hepsi birbirinin ön koşulu, ayrı
// testlere bölünürse her biri kendi makalesini yeniden kurmak zorunda kalır.
test('giriş → makale yaz → taslak sitede GÖRÜNMEZ → yayımla → görünür → arama ve kategoriyle bulunur', async ({ page }) => {
  const damga = hazir().damga
  const baslik = `Kira tespit notu ${damga}`
  const ozet = `Kira bedelinin belirlenmesinde uygulanan ölçütlere ilişkin ${damga} notu.`
  const slug = `kira-tespit-notu-${damga}`

  await girisYap(page, EDITOR)
  await page.goto('/panel/makaleler/yeni')
  await page.getByLabel('Başlık').fill(baslik)
  await page.getByLabel('Özet').fill(ozet)
  await page.locator('[contenteditable="true"]').fill('Kiracının hakları ve dava süreleri.')
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale taslak olarak kaydedildi.')
  await expect(page).toHaveURL(/\/panel\/makaleler\/\d+/)

  // TASLAK SIZINTISI DENETİMİ — bu planın en pahalı hatası burada yakalanır.
  // Tekil adres 404 vermeli: taslak bir makalenin adresi tahmin edilebilir (slug başlıktan
  // üretiliyor), yani "listede yok" yeterli bir güvence değil.
  await page.goto(`/makaleler/${slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeVisible()

  await page.goto('/makaleler')
  await expect(page.getByRole('link', { name: new RegExp(baslik) })).toHaveCount(0)

  // Arama da taslağı bulmamalı: arşiv listesi ile arama sorgusu farklı SQL yolları.
  await page.goto(`/makaleler?q=${damga}`)
  await expect(page.getByRole('link', { name: new RegExp(baslik) })).toHaveCount(0)

  // YAYIMLA
  await page.goto('/panel/makaleler')
  await page.getByRole('row', { name: new RegExp(baslik) }).getByRole('link', { name: 'Düzenle' }).click()
  await page.getByLabel('Kategori').selectOption({ label: hazir().kategoriAdi })
  await page.getByRole('button', { name: 'Yayımla' }).click()
  await expect(page.getByRole('status')).toHaveText('Makale yayımlandı.')

  // SİTEDE GÖRÜNÜYOR — reload() yok: revalidateTag gerçekten çalışmıyorsa bu iddia düşmeli.
  await page.goto(`/makaleler/${slug}`)
  await expect(page.getByRole('heading', { level: 1, name: baslik })).toBeVisible()

  await page.goto('/makaleler')
  await expect(page.getByRole('link', { name: new RegExp(baslik) })).toBeVisible()

  // ARAMAYLA BULUNUYOR
  await page.goto(`/makaleler?q=${damga}`)
  await expect(page.getByRole('link', { name: new RegExp(baslik) })).toBeVisible()

  // KATEGORİ FİLTRESİYLE BULUNUYOR
  await page.goto(`/makaleler/kategori/e2e-kategori-${damga}`)
  await expect(page.getByRole('link', { name: new RegExp(baslik) })).toBeVisible()

  // Alakasız bir arama BULMAMALI: filtre gerçekten süzüyor mu, yoksa her sorguda tüm
  // listeyi mi basıyor? Bu iddia olmadan yukarıdaki iki test yanlış yeşil kalabilir.
  await page.goto('/makaleler?q=zzzbulunmayanterim')
  await expect(page.getByRole('link', { name: new RegExp(baslik) })).toHaveCount(0)
})
```

`tests/e2e/iletisim-formu.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mesajTemizligiHazirla, type MesajTemizligi } from './helpers/test-message'

let mesaj: MesajTemizligi | null = null

test.beforeEach(async () => {
  mesaj = await mesajTemizligiHazirla()
})

test.afterEach(async () => {
  const mevcut = mesaj
  mesaj = null
  await mevcut?.temizle()
})

function hazir(): MesajTemizligi {
  if (mesaj === null) throw new Error('Mesaj temizliği hazırlanmadı; beforeEach düşmüş olmalı.')
  return mesaj
}

async function formuDoldur(page: import('@playwright/test').Page, eposta: string) {
  await page.getByLabel('Ad soyad').fill('Ayşe Yılmaz')
  await page.getByLabel('E-posta').fill(eposta)
  await page.getByLabel('Konu').fill('Kira sözleşmesi hakkında')
  await page.getByLabel('Mesajınız').fill('Merhaba, kira sözleşmemle ilgili kısa bir sorum olacaktı.')
}

// GERÇEK E-POSTA GÖNDERİLMİYOR: sunucu MAIL_TRANSPORT=json ile çalışıyor, nodemailer
// hiçbir yere bağlanmaz (src/lib/mailer.ts). Gönderim yolu yine de baştan sona koşuyor —
// test kipinde `if (test) return` ile atlansaydı üretimde ilk kez orada patlardı.
test('iletişim formu gönderimi mesajı kaydeder ve onay bildirimi basar', async ({ page }) => {
  await page.goto('/iletisim')
  await formuDoldur(page, hazir().eposta)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Mesajı gönder' }).click()

  await expect(page.getByRole('status')).toContainText('Mesajınız iletildi')

  const satirlar = await hazir().mesajlar()
  expect(satirlar).toHaveLength(1)
  expect(satirlar[0].name).toBe('Ayşe Yılmaz')
  // spec §9: onay zamanı saklanmalı.
  expect(satirlar[0].kvkk_accepted_at).not.toBeNull()
})

// Onay kutusu ÖNCEDEN İŞARETLİ DEĞİL ve işaretlenmeden gönderim kaydetmemeli (spec §9).
test('KVKK onayı olmadan gönderim alan hatası verir ve HİÇBİR ŞEY kaydetmez', async ({ page }) => {
  await page.goto('/iletisim')
  await expect(page.getByRole('checkbox')).not.toBeChecked()

  await formuDoldur(page, hazir().eposta)
  await page.getByRole('button', { name: 'Mesajı gönder' }).click()

  await expect(page.getByText(/KVKK aydınlatma metnini onaylayın/)).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(await hazir().mesajlar()).toHaveLength(0)
})

test('KVKK onay metni aydınlatma sayfasına bağlanır', async ({ page }) => {
  await page.goto('/iletisim')
  const bag = page.getByRole('link', { name: 'KVKK aydınlatma metnini' })
  await expect(bag).toHaveAttribute('href', '/kvkk')
})

// Boş gönderim: alan hataları Türkçe ve her biri kendi girdisine bağlı olmalı (spec §11).
test('boş gönderimde alan bazında Türkçe hata gösterilir', async ({ page }) => {
  await page.goto('/iletisim')
  await page.getByRole('button', { name: 'Mesajı gönder' }).click()
  await expect(page.getByLabel('Ad soyad')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Mesajınız')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert').first()).toBeVisible()
})

// Harita spec §9: iframe TIKLANINCA yükleniyor. Sayfa açılışında Google'a hiç istek gitmemeli.
test('harita yalnız rıza düğmesine basılınca yüklenir ve düğme klavyeyle çalışır', async ({ page }) => {
  const googleIstekleri: string[] = []
  page.on('request', (istek) => {
    if (istek.url().includes('google.com/maps')) googleIstekleri.push(istek.url())
  })

  await page.goto('/iletisim')
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(googleIstekleri, 'rıza öncesi Google isteği').toEqual([])

  const dugme = page.getByRole('button', { name: 'Haritayı yükle' })
  // Fare DEĞİL klavye: erişilebilirlik iddiası tam olarak bu (spec §8).
  await dugme.focus()
  await expect(dugme).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.locator('iframe')).toHaveCount(1)
  await expect(page.locator('iframe')).toHaveAttribute('title', /harita|Harita/i)
})

test('iletişim sayfası ve hatalı form durumu erişilebilirlik denetiminden geçer', async ({ page }) => {
  await page.goto('/iletisim')
  const temiz = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(temiz.violations, 'boş form').toEqual([])

  // Hata durumu ayrıca taranıyor: aria-invalid ve role="alert" düğümleri yalnız o anda var.
  await page.getByRole('button', { name: 'Mesajı gönder' }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()
  const hatali = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(hatali.violations, 'hatalı form').toEqual([])
})
```

`tests/e2e/site-erisilebilirlik.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { yayimlanmisMakaleHazirla, type TestMakalesi } from './helpers/test-article'

let makale: TestMakalesi | null = null

test.beforeEach(async () => {
  makale = await yayimlanmisMakaleHazirla()
})

test.afterEach(async () => {
  const mevcut = makale
  makale = null
  await mevcut?.temizle()
})

function hazir(): TestMakalesi {
  if (makale === null) throw new Error('Test makalesi hazırlanmadı; beforeEach düşmüş olmalı.')
  return makale
}

// spec §12: ana sayfa, makale arşivi ve TEKİL makale sayfası. Üçü ayrı ayrı taranıyor
// çünkü tekil makale krem zeminde (`[data-surface="paper"]`) çiziliyor ve kontrast oranları
// koyu zeminden bağımsız — yalnız ana sayfayı taramak o zemin hakkında hiçbir şey söylemez.
test('ana sayfa erişilebilirlik denetiminden geçer', async ({ page }) => {
  await page.goto('/')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('makale arşivi erişilebilirlik denetiminden geçer', async ({ page }) => {
  await page.goto('/makaleler')
  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('arama sonucu ve kategori sayfası erişilebilirlik denetiminden geçer', async ({ page }) => {
  for (const yol of [`/makaleler?q=${hazir().damga}`, `/makaleler/kategori/${hazir().kategoriSlug}`]) {
    await page.goto(yol)
    const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(sonuc.violations, `${yol} ihlalleri`).toEqual([])
  }
})

test('tekil makale sayfası krem zeminde erişilebilirlik denetiminden geçer', async ({ page }) => {
  await page.goto(`/makaleler/${hazir().slug}`)
  await expect(page.getByRole('heading', { level: 1, name: hazir().baslik })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

  // Krem zeminin gerçekten açıldığı ayrıca doğrulanıyor: açılmadıysa yukarıdaki axe
  // taraması koyu zeminin kontrastını ölçmüş olur ve iddia anlamsızlaşır (spec §7).
  await expect(page.locator('[data-surface="paper"]')).toHaveCount(1)

  const sonuc = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(sonuc.violations).toEqual([])
})

test('sitede mobilde yatay kaydırma yok', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'yalnızca mobil projede')
  for (const yol of ['/', '/makaleler', `/makaleler/${hazir().slug}`, '/iletisim']) {
    await page.goto(yol)
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(tasma, `${yol} yatay taşıyor`).toBe(false)
  }
})
```

- [ ] **Adım 2: Testlerin BAŞARISIZ olduğunu gör**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx playwright test tests/e2e/makale-yayin-akisi.spec.ts tests/e2e/iletisim-formu.spec.ts tests/e2e/site-erisilebilirlik.spec.ts
```
Beklenen: FAIL. Bu görevde üretim kodu YAZILMIYOR — testler Görev 1-10'un çıktısını ölçüyor.
Kırmızı çıkan her iddia, **ilgili görevin eksiğidir** ve o görevin dosyasında düzeltilir;
testi iddiadan düşürerek yeşile çevirmek yasaktır. Kırmızı iddia listesi görev raporuna
yazılır (hangi görevin hangi dosyası).

- [ ] **Adım 3: Kırmızıları kaynağında kapat**

Beklenen tipik bulgular ve gidilecek dosya:

| Kırmızı iddia | Neden | Nerede düzeltilir |
|---|---|---|
| Taslak adresi 404 vermiyor | `getPublishedArticleBySlug` yayımlanmışlık koşulunu uygulamıyor | `src/db/queries/public/articles.ts` (sözleşme §3.1 `publishedPredicate`) |
| Yayımdan sonra sayfa hâlâ eski | `revalidateTag` etiketi `cacheTag` ile eşleşmiyor | `src/lib/cache-tags.ts` tek kaynak; panel action ve sayfa aynı sabiti kullanmalı |
| `?q=` araması makaleyi bulmuyor | FULLTEXT `search_text` sütunu doldurulmuyor | sözleşme §3.7 — panel kaydetme yolu |
| Krem zemin bulunamıyor | `[data-surface="paper"]` tekil makale sarıcısında yok | tekil makale sayfası (Görev 6) |
| axe kontrast ihlali | Bileşende token yerine renk değeri yazılmış | ilgili `*.module.css` — yeni renk değeri EKLENMEZ, token kullanılır |
| Harita düğmesi Enter ile çalışmıyor | `<div onClick>` kullanılmış | `MapConsent.tsx` — gerçek `<button>` (Görev 9'da öyle yazıldı) |

- [ ] **Adım 4: Testlerin GEÇTİĞİNİ gör — dev kipi**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit && npm run lint && npm test && npm run test:e2e
```
Beklenen: dördü de PASS; `test:e2e` çıktısında `masaustu` ve `mobil` projelerinin ikisi de yeşil.

- [ ] **Adım 5: Testlerin GEÇTİĞİNİ gör — CI kipi (üretim derlemesi)**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
CI=1 npm run test:e2e
```
`playwright.config.ts` `CI` altında `npm run build && npm run start` çalıştırıyor, yani bu
koşum küçültülmüş üretim derlemesini ölçüyor: `'use cache'` davranışı, lightningcss
dönüşümleri ve React'in küçültülmüş hata metinleri yalnız burada görünür.

Beklenen: PASS. **Bu adım atlanamaz** — dev kipinde yeşil olan bir `'use cache'` yapılandırması
üretim derlemesinde tümüyle farklı davranabilir ve dağıtımda ilk kez orada patlar.

- [ ] **Adım 6: Temizlik doğrulaması (ÖLÇÜM)**

Testlerin gerçekten kendi izini sildiği ölçülür — Plan 2'de temizlik 14 koşum boyunca
sessizce başarısız olmuştu:

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
node -e "
const {readFileSync}=require('node:fs');const {parseEnv}=require('node:util');
const mysql=require('mysql2/promise');
(async()=>{
  const c=await mysql.createConnection({uri:parseEnv(readFileSync('.env.local','utf8')).DATABASE_URL});
  for (const s of ['SELECT COUNT(*) n FROM articles WHERE slug LIKE \"%e2e%\"',
                   'SELECT COUNT(*) n FROM categories WHERE slug LIKE \"e2e-%\"',
                   'SELECT COUNT(*) n FROM messages WHERE email LIKE \"e2e%@example.com\"']) {
    const [r]=await c.execute(s); console.log(s.slice(21,40), r[0].n);
  }
  await c.end();
})()"
```
Beklenen: üç sayı da `0`. Sıfırdan farklıysa artık satırlar elle silinir ve ilgili
`temizle()` sorgusunun neden eşleşmediği bulunur (`sil` yerine `silmeyeCalis` kullanılan bir
yer sessizce geçmiş olabilir).

- [ ] **Adım 7: Mutasyon kanıtı**

1. `src/db/queries/public/articles.ts` içindeki `publishedPredicate` sabitinden
   `status = 'published'` koşulu çıkarılır → `makale-yayin-akisi > taslak sitede GÖRÜNMEZ`
   adımı KIRMIZI (`Sayfa bulunamadı` başlığı yerine makale başlığı çizilir). Geri alınır.
2. `src/app/(site)/iletisim/actions.ts` içinde `createMessage(...)` çağrısı yorum satırına
   alınır → `iletişim formu gönderimi mesajı kaydeder` KIRMIZI (`expected [] to have length 1`).
   Geri alınır.
3. `src/lib/validation.ts` içinde `contactSchema.kvkk` alanı `checkbox` ile değiştirilir
   (zorunluluk kalkar) → `KVKK onayı olmadan gönderim ... HİÇBİR ŞEY kaydetmez` KIRMIZI.
   Geri alınır.
4. `src/app/(site)/iletisim/MapConsent.tsx` içinde `yuklendi` başlangıç değeri `true`
   yapılır → `harita yalnız rıza düğmesine basılınca yüklenir` KIRMIZI
   (`expected 1 to be 0` — rıza öncesi iframe var). Geri alınır.
5. Tekil makale sayfasındaki `data-surface="paper"` özniteliği silinir →
   `tekil makale sayfası krem zeminde ...` KIRMIZI. Geri alınır.

Her mutasyondan sonra ilgili tek dosya koşulur; tam süiti tekrar tekrar çalıştırmak gerekmez:
```bash
npx playwright test tests/e2e/<dosya>.spec.ts --project=masaustu
```

- [ ] **Adım 8: Kapanış — tüm doğrulama kapıları**

```bash
export PATH="/c/Users/NAZLICAN/AppData/Roaming/fnm/node-versions/v22.23.2/installation:$PATH";
npx tsc --noEmit && npm run lint && npm test && npm run test:e2e && CI=1 npm run test:e2e
```
Beşi de yeşil olmadan görev bitmiş sayılmaz. Herhangi biri kırmızıysa **testi gevşetmek
değil, üretim kodunu düzeltmek** gerekir; düzeltme kapsam dışına taşıyorsa durup Aborjina'ya
bildirilir.

Rapora yazılacaklar: her komutun çıktısındaki test sayısı, Adım 6'nın üç sayısı, Adım 7'nin
beş mutasyon sonucu, ve Görev 3'te bilinen sınır olarak kalan "Türkçe kök bulma yok"
davranışının e2e'de gözlenip gözlenmediği (spec §5, bilinçli kabul).

- [ ] **Adım 9: Commit**

```bash
git add tests/e2e/helpers/test-article.ts tests/e2e/helpers/test-message.ts \
  tests/e2e/makale-yayin-akisi.spec.ts tests/e2e/iletisim-formu.spec.ts \
  tests/e2e/site-erisilebilirlik.spec.ts
git commit -m "test: uçtan uca yayın akışı, iletişim formu ve axe denetimi

- taslak makalenin tekil adresinin 404 verdiği ayrıca ölçülüyor (slug tahmin edilebilir)
- iletişim testi gerçek e-posta göndermiyor: MAIL_TRANSPORT=json
- her test kendi damgasını siliyor; artık satır kalmadığı ayrıca doğrulandı
- axe: ana sayfa, arşiv, arama, kategori ve krem zeminli tekil makale
- doğrulama: tsc --noEmit, lint, npm test, test:e2e (dev), CI=1 test:e2e (üretim derlemesi)"
```

---
