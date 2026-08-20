# Tolga Akıl Hukuk Bürosu — Web Sitesi Tasarım Belgesi

**Tarih:** 18 Ağustos 2026
**Durum:** Onaylandı (TBY), uygulama planı bekliyor
**Hazırlayan:** Aborjina

---

## 1. Amaç

Birkaç avukatlı bir hukuk bürosu için tanıtım ve makale yayını sitesi. Site iki işi yapar:
büroyu ve kadrosunu mevzuatın izin verdiği sınırlar içinde tanıtır, ve avukatların yazdığı
mesleki makaleleri yayımlar. Makaleler siteye **müşteri tarafından**, kendi yönetim
panelinden girilir.

Bu bir pazarlama sitesi değildir. Türkiye Barolar Birliği Reklam Yasağı Yönetmeliği
avukatların iş sağlamaya yönelik her türlü tanıtımını yasaklar; site bu nedenle
**kimlik + bilgilendirme** sitesi olarak kurgulanmıştır.

## 2. Bağlayıcı kısıtlar

### 2.1 Mevzuat (TBB Reklam Yasağı Yönetmeliği, son değişiklik 9 Ağustos 2024)

**İzin verilen içerik:** ad-soyad, akademik unvan, baro ve TBB sicil numarası, mesleğe
başlama tarihi, mezun olunan üniversite, bilinen yabancı diller, büro adresi, telefon/faks,
e-posta/KEP, fotoğraf.

**İzin verilen amaçlar:** mesleki faaliyeti yürütmek, müvekkili bilgilendirmek, mesleki
makale yayımlamak, şifre korumalı sanal ofis.

**Sitede bulunmayacaklar:** "uzman/en iyi" iddiası, başarı oranı, kazanılmış dava sayısı,
müvekkil referansı, yorum/yıldız derecelendirmesi, ücret bilgisi, "ücretsiz ilk görüşme"
türü çağrılar, canlı sohbetle hukuki tavsiye, üçüncü taraf reklam betiği, afiliye bağlantı.

**Anahtar kelime sınırı:** ad-soyad, büro unvanı, şehir + kayıtlı olunan baro ve
"avukat, hukuk, hukukçu, adalet, savunma, hak" gibi genel terimler. Şehir + hukuk dalı
kombinasyonlarının yoğun kullanımı (ör. "Samsun Avukat" kalıbı) iş sağlama sayılabileceği
için **kullanılmayacaktır**. Daha geniş yorum müşterinin kendi riskidir ve barosuna
danışmasını gerektirir.

**Alan adı:** `.av.tr` esastır; yönetmeliğin 9. maddesindeki değişiklikle diğer `.tr`
uzantıları da mümkündür. `.com` tartışmalıdır — seçim müşterinin barosuyla teyit
edilmeden yapılmayacaktır.

### 2.2 Barındırma

Hostinger. Paylaşımlı **Premium** planı Node.js çalıştırmaz; dinamik Next.js ve panel için
**Business** (veya Cloud) planı gerekir. Yönetilen veritabanı MySQL'dir — bu nedenle
Postgres/Mongo isteyen hazır CMS'ler (Payload v3 dahil) elenmiştir.

## 3. Kullanıcılar

| Rol | Ne yapar |
|---|---|
| Ziyaretçi | Sayfaları okur, makale arar, iletişim formu doldurur, telefon/WhatsApp ile ulaşır |
| `editor` (avukat) | Makale yazar, düzenler, taslak tutar, yayımlar; görsel yükler |
| `admin` (TBY / büro yöneticisi) | Yukarıdakiler + kadro, çalışma alanları, site ayarları, panel kullanıcıları, gelen mesajlar |

## 4. Sayfa haritası

| Yol | İçerik |
|---|---|
| `/` | Hero, çalışma alanları, son makaleler, kadro şeridi, iletişim bandı |
| `/hakkimizda` | Büro metni, tesis görselleri |
| `/kadro` | Avukat listesi |
| `/kadro/[slug]` | Avukat özgeçmişi — mevzuatın saydığı alanlar |
| `/calisma-alanlari` | Alan listesi |
| `/calisma-alanlari/[slug]` | Tekil alan açıklaması |
| `/makaleler` | Arşiv: arama (`?q=`) + kategori filtresi + sayfalama |
| `/makaleler/kategori/[slug]` | Kategoriye göre arşiv |
| `/makaleler/[slug]` | Tekil makale (krem zeminde okuma düzeni) |
| `/iletisim` | Form, harita, telefon/WhatsApp, adres |
| `/kvkk`, `/cerez-politikasi` | Aydınlatma metni ve çerez politikası |
| `/panel/**` | Yönetim paneli (kimlik doğrulaması zorunlu) |
| `/rss.xml`, `/sitemap.xml`, `/robots.txt` | Beslemeler |

## 5. Veri modeli (MySQL + Drizzle ORM)

- **`users`** — `id`, `email` (tekil), `password_hash` (argon2), `role` (`admin`|`editor`),
  `name`, `created_at`, `last_login_at`
- **`lawyers`** — `id`, `slug` (tekil), `full_name`, `title`, `bar_association`,
  `bar_registry_no`, `tbb_registry_no`, `practice_start_date`, `university`, `languages`,
  `email`, `photo_media_id`, `bio` (HTML), `sort_order`, `is_published`
- **`practice_areas`** — `id`, `slug` (tekil), `name`, `summary`, `content` (HTML),
  `sort_order`, `is_published`
- **`categories`** — `id`, `slug` (tekil), `name`, `description`
- **`articles`** — `id`, `slug` (tekil), `title`, `excerpt`, `content` (sanitize edilmiş HTML),
  `cover_media_id`, `author_id` → `lawyers.id`, `category_id` → `categories.id`,
  `status` (`draft`|`published`), `published_at`, `updated_at`, `meta_title`,
  `meta_description`
- **`messages`** — `id`, `name`, `email`, `phone`, `subject`, `body`, `kvkk_accepted_at`,
  `ip`, `user_agent`, `is_read`, `created_at`
- **`media`** — `id`, `filename`, `path`, `alt_text`, `width`, `height`, `size_bytes`,
  `uploaded_by` → `users.id`, `created_at`
- **`settings`** — tek satır: büro adı, adres, telefon, WhatsApp numarası, e-posta, KEP,
  harita koordinatı, sosyal hesaplar, footer metni
- **`pages`** — `id`, `slug` (tekil: `hakkimizda` | `kvkk` | `cerez-politikasi`), `title`,
  `content` (sanitize edilmiş HTML), `updated_at`. Sabit satırlıdır: panelden yeni satır
  oluşturulamaz ve silinemez, yalnız düzenlenir. **Plan 3'te eklendi** — §4'ün istediği üç
  metin sayfasının içeriğini tutacak bir yer veri modelinde yoktu ve bu metinlerin kodda
  sabit kalması "avukat kendi girer" kararına aykırıydı.

**İndeksler:** `articles(status, published_at)`, `articles(category_id)`,
`FULLTEXT articles(title, excerpt, search_text)`, `messages(created_at)`.

**`articles.search_text` (Plan 3'te eklendi):** makale kaydedilirken `content`'in düz metne
çevrilmiş hâliyle doldurulur. FULLTEXT indeksi önce HTML tutan `content` sütununu
kapsıyordu; bu hâliyle `<strong>` araması makale getiriyor, etiket adları terim olarak
indeksleniyordu. `content` artık indekslenmez.

**Bilinen sınır:** MySQL `FULLTEXT` Türkçe kök bulma yapmaz — "davası" araması "dava"yı
getirmez. Arşiv birkaç yüz yazıyı aşarsa harici arama gerekir. Bu bilinçli kabul edilmiştir.

## 6. Teknik mimari

- **Next.js 16.3**, App Router, TypeScript. Genel sayfalar sunucu bileşeni.
- **Önbellekleme:** makale, kadro ve alan sayfaları statik üretilir; panelden içerik
  değişince ilgili etiket `revalidateTag` ile tazelenir.
- **Drizzle ORM + `mysql2`**; şema TypeScript'te, migration'lar `drizzle-kit` ile dosyada.
- **Auth.js v5**, credentials sağlayıcı, `argon2` parola özeti, HTTP-only çerezde JWT
  oturum. `/panel/**` middleware ile korunur. Giriş denemesine IP başına hız sınırı.
- **Tiptap** editör; çıktı HTML sunucu tarafında `sanitize-html` beyaz listesiyle
  temizlenir. Panelden gelen veri de güvenilmez kabul edilir.
- **İletişim formu:** server action → `zod` doğrulama → `messages` tablosu → `nodemailer`
  ile büro e-postasına iletim. Honeypot alanı + hız sınırı. CAPTCHA yok.
- **Görseller:** `next/image`, panelden yükleme, sunucu tarafında yeniden boyutlandırma.
- **Yazı tipleri:** `next/font` ile kendi sunucumuzdan servis edilir; Google'a istek gitmez.
- **Çalışma zamanı:** Node 22. **Dağıtım:** GitHub push → Hostinger otomatik derleme.
- **Ortam değişkenleri:** `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO_EMAIL`, `UPLOAD_DIR`.

## 7. Tasarım sistemi

Yön: **Kümmerlein × MSG karışımı, koyu taban.** Referanslar: `kuemmerlein.de` (ince serif
display, hap nav, geniş boşluk, yuvarlak formlar), `msghukukburosu.com` (lacivert–altın
kimlik, Cormorant Garamond).

| Token | Değer | Kullanım |
|---|---|---|
| `--ink` | `#161d27` | Ana zemin |
| `--ink-2` | `#1f2732` | Kart yüzeyi, footer |
| `--paper` | `#efece3` | Araya giren krem bloklar |
| `--paper-2` | `#f7f5ef` | Krem blok içi kart |
| `--gold` | `#c9a86a` | Koyu zeminde aksan, CTA dolgusu |
| `--gold-ink` | `#7d5f26` | Krem zeminde aksan metni/çizgisi |
| `--text-ink` | `#f3f1ea` | Koyu zeminde metin |
| `--text-ink-muted` | `#aab1bc` | Koyu zeminde ikincil metin |
| `--text-paper` | `#161d27` | Krem zeminde metin |
| `--text-paper-muted` | `#4b535f` | Krem zeminde ikincil metin |
| `--line-ink` | `rgba(243,241,234,.12)` | Koyu zeminde ayraç |
| `--line-paper` | `#d5d1c4` | Krem zeminde ayraç |

**Tipografi:** Cormorant Garamond 300/400 (başlık), Outfit 300–600 (gövde ve arayüz).
Gövde 17px/1.8; h1 56px/1.05 masaüstü, 36px mobil; h2 40px; eyebrow 11px, 3px harf aralığı,
büyük harf.

**Geometri:** hap nav ve butonlar `999px`; büyük bloklar `26px`; kartlar `20px`.
Bölüm ritmi 96px masaüstü / 56px mobil. Kap genişliği 1200px; yan boşluk akışkan:
`--pad: clamp(1.25rem, 4vw, 2.5rem)` (20–40px).

**Bileşenler renk değeri yazmaz** — yalnızca token kullanır.

**Kural — okuma zemini:** tekil makale sayfasının gövdesi `--paper` üzerindedir. Sitenin
kimliği koyu kalır; uzun metnin okunduğu yer açıktır. Arşiv, kadro ve alan sayfaları koyu
zemindedir.

## 8. Erişilebilirlik

Baştan kuruludur, sonradan eklenmez: `<html lang="tr">`; semantik başlık hiyerarşisi;
tüm renk çiftlerinde en az 4.5:1 kontrast (`--gold`/`--ink` = 7.5:1, `--gold-ink`/`--paper`
= 5.0:1 — ilk yazılan `#8a6a2c` ölçümde 4.26:1 çıktığı için `#7d5f26` ile değiştirildi);
odak halkası 2px ve zemine göre `--focus-ring` üzerinden değişir (koyu zeminde `--gold`,
`[data-surface="paper"]` altında `--gold-ink`); atlama bağlantısı; harita ve WhatsApp dahil her
etkileşim klavyeyle erişilebilir; tüm görsellerde `alt` (panelde alt metin alanı zorunlu);
`prefers-reduced-motion` desteği.

## 9. KVKK ve çerezler

- İletişim formunda KVKK onay kutusu **önceden işaretli değildir** ve aydınlatma metnine
  bağlanır; onay zamanı `kvkk_accepted_at` olarak saklanır.
- Google Haritalar iframe'i **tıklanınca yüklenir** (statik önizleme + rıza).
- Analitik gerekirse çerezsiz çözüm (self-hosted Umami/Plausible) kullanılır; bu durumda
  çerez rıza banner'ı gerekmez. Google Analytics tercih edilirse rıza banner'ı zorunlu olur.
- Oturum çerezi yalnızca `/panel` içindir ve zorunlu çerez kapsamındadır.

## 10. SEO

Semantik HTML, `sitemap.xml`, `robots.txt`, canonical, Open Graph etiketleri; makalelerde
`Article`, büroda `LegalService` yapılandırılmış verisi; makale arşivi için RSS.
`aggregateRating` ve `review` şemaları **kullanılmaz** (yıldız işaretlemesi reklam sayılır).
Sayfa başlıkları büro adı ve sayfa konusu ile sınırlıdır.

## 11. Hata yönetimi

Hiçbir hata yutulmaz. Form hataları alan bazında Türkçe gösterilir; sunucu hatasında
kullanıcıya telefonla ulaşma alternatifi sunulur ve hata sunucuya loglanır. Veritabanı
erişilemese bile statik üretilmiş sayfalar yayında kalır. 404 ve 500 sayfaları tasarımın
parçasıdır.

**Ölçülmüş kısıt (Next 16.3, üretim derlemesi — deney sonucu, varsayım değil):**
Hata sınırlarının arayüzü sunucuda çizilmez, hydrate sonrası gelir.

- **Kök layout hatası:** sunucu Next'in `__html id="__next_error__"__` kabuğunu döndürür —
  Türkçe metin, telefon ve stil yoktur. `global-error.tsx` ancak JavaScript yüklenince görünür.
- **Sayfa düzeyi hata:** layout sunucuda çizilir; başlık, alt bilgi ve **telefon numarası
  JavaScript olmadan da HTML'de bulunur**. Yalnız `error.tsx` metni istemci tarafında gelir.

**Bağlayıcı karar:** kök `layout.tsx` içinde **veri çekilmez**. `settings` sorgusu iç içe bir
layout'a veya sayfaya konur; böylece hata `error.tsx` sınırına düşer ve kullanıcı her hâlükârda
kabuğu ve telefon numarasını görür. Panelde slug çakışması ve eşzamanlı düzenleme kullanıcıya açıkça bildirilir.

## 12. Test

- **Vitest:** `zod` şemaları, HTML sanitize, slug üretimi, yetki kontrolü (rol bazlı erişim),
  makale durum geçişleri.
- **Playwright:** "giriş → makale yaz → taslak kaydet → yayımla → sitede görünüyor" akışı;
  iletişim formu gönderimi; `editor` rolünün kadro sayfasına erişememesi.
- **axe:** ana sayfa ve tekil makale sayfasında otomatik erişilebilirlik denetimi.

Düzen `webstudio` projesindeki Vitest + Playwright yapılandırmasıyla aynıdır.

## 13. Açık maddeler

| Madde | Kim çözer | Ne zaman |
|---|---|---|
| Görsel yüklemelerin dağıtım sonrası kalıcılığı (Hostinger'da `UPLOAD_DIR` testi) | Aborjina | Uygulamanın **ilk** adımı — sonuç olumsuzsa Cloudflare R2'ye geçilir |
| Alan adı seçimi (`.av.tr` / `.tr` / `.com`) | Müşteri + barosu | Yayına almadan önce |
| Analitik kullanılacak mı, kullanılacaksa hangisi | TBY | Uygulama sırasında |
| Gerçek içerik: büro adı, avukat özgeçmişleri, çalışma alanları, iletişim bilgileri | Müşteri | Panel hazır olduğunda |
| MySQL yedekleme düzeni | TBY | Yayına almadan önce |
| **KVKK aydınlatma metni ve çerez politikasının gerçek içeriği** — bu metinler hukuki belgedir ve model tarafından üretilmez; yer tutucu bugün `pages` tablosunda duruyor ve **Panel → Sayfa Metinleri** bölümünden düzenlenir | Müşteri (avukat) + barosu | **Yayına almadan önce — zorunlu; yer tutucuyla yayına çıkılmaz** |
| Site adresi (`SITE_URL`) — tanımlı değilse derleme bilerek düşer; `localhost` dolu bir `sitemap.xml` indekslenirse geri alması haftalar sürer | TBY | Dağıtımdan önce |

## 14. Kapsam dışı

Şifre korumalı müvekkil alanı (sanal ofis), online randevu takvimi, çok dillilik, ödeme
alma, e-bülten aboneliği, canlı sohbet. Hiçbiri bu sürümde yapılmayacaktır; sanal ofis
ileride istenirse `users` ve rol yapısı buna hazırdır.
