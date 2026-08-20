# Hostinger kurulum ve ilk dağıtım

Bu belge **sırayla** izlenir. Her adımın sonunda bir **doğrulama** vardır; doğrulama
geçmeden sonraki adıma geçilmez. Amaç, sorunları tek tek ve ucuzken yakalamaktır.

**Paket:** Business (Node.js Web Apps özelliği bu pakette var — doğrulandı).
**Depo:** `https://github.com/cemstark/tolgakil` (dal: `main`).
**Çalışma zamanı:** Node 22 (Hostinger 18/20/22/24 destekliyor; projemiz 22.23.2 ile geliştirildi).

> **Bu dağıtımda ne sınanıyor?** Halka açık sayfalar hâlâ örnek içerik gösteriyor —
> Plan 3 onları veriye bağlayacak. Şu an sınadığımız şey sunucu tarafı: MySQL bağlantısı,
> migration'lar, kimlik doğrulama, panel ve **medya yüklemelerinin kalıcılığı.**
> Riskli olan kısım budur ve şimdi sınanması doğrudur.

---

## Adım 1 — MySQL veritabanı oluştur

hPanel → **Veritabanları → MySQL Veritabanları**

1. Veritabanı adı, kullanıcı adı ve **güçlü bir parola** gir. Hostinger ikisinin de başına
   hesap kimliğini ekler (ör. `u123456789_tolga`). Oluşan **tam adları** not al.
2. Parolayı bir parola yöneticisine kaydet. Bu parola depoya **girmeyecek**.

**Doğrulama:** Listede veritabanı ve kullanıcı görünüyor, kullanıcı veritabanına atanmış.

> **Harmanlama (collation) kaygısı — çözülmüş durumda.** Hostinger veritabanını hangi
> varsayılanla oluşturursa oluştursun sorun çıkmaz: migration dosyamızdaki **8 tablonun
> 8'inde de** `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` açıkça yazılı.
> Tablo düzeyindeki bu ayar veritabanı varsayılanını ezer. Türkçe karakterler ve sıralama
> doğru çalışır. (Ölçüldü, varsayılmadı.)

---

## Adım 2 — Uzaktan MySQL erişimini aç (geçici)

hPanel → **Veritabanları → Uzaktan MySQL** (Remote MySQL)

Buradaki amaç, migration'ları ve doğrulamaları **sizin makinenizden** çalıştırabilmek.
Böylece veritabanının gerçekten doğru kurulduğunu tıklayarak değil, sorgulayarak görürüz.

1. Kendi IP adresini yetkilendir (hPanel genelde "mevcut IP'yi ekle" seçeneği sunar).
2. Erişilecek veritabanını seç.

**Doğrulama:** Aşağıdaki komutu birlikte çalıştıracağız; bağlantı kurulup harmanlama
ve saat dilimi okunacak.

> **Bu adım geçicidir.** İlk dağıtım doğrulandıktan sonra Adım 8'de **kapatılacak** —
> veritabanını sürekli internete açık bırakmak gereksiz bir saldırı yüzeyidir.

---

## Adım 3 — Node.js Web App oluştur ve depoyu bağla

hPanel → **Web Siteleri → Web Sitesi Ekle → Node.js Uygulamaları**

1. **Import Git Repository** seç, GitHub erişimini yetkilendir, `cemstark/tolgakil` deposunu seç.
2. Dal: `main`.
3. Çalışma zamanı: **Node 22**.
4. Komutlar:

   | Alan | Değer |
   |---|---|
   | Install | `npm ci` |
   | Build | `npm run build` |
   | Start | `npm run start -- -p $PORT` |

5. Geçici alan adını (Hostinger'ın verdiği `*.hostingersite.com` benzeri adres) not al.

**Henüz dağıtımı başlatma** — önce Adım 4'teki ortam değişkenleri girilmeli, yoksa
derleme veritabanı olmadan düşer.

> **Depo klonlama uyarısı:** Hostinger, herkese açık depoları bazen kendi hesabınıza
> **klonlayarak** bağlar. Bağladıktan sonra hangi depoya bağlandığını kontrol et —
> `cemstark/tolgakil` değilse otomatik dağıtım yanlış depoyu izler.

---

## Adım 4 — Ortam değişkenlerini gir

hPanel → Web App panosu → **Environment Variables**

| Değişken | Değer | Not |
|---|---|---|
| `DATABASE_URL` | `mysql://KULLANICI:PAROLA@localhost:3306/VERITABANI` | **`?charset=` EKLEME** — mysql2 bu parametreyi tanımaz ve bağlantı düşer |
| `AUTH_SECRET` | 32 baytlık rastgele dize | Aşağıda üretiyoruz |
| `AUTH_URL` | `https://GECICI-ALAN-ADI` | Sonunda `/` yok |
| `UPLOAD_DIR` | `/home/UXXXXXXXX/uploads` | **Depo kökünün DIŞINDA** olmalı — gerekçesi Adım 7'de |
| `SEED_ADMIN_USERNAME` | `buro` | Panele girilecek **kullanıcı adı** — e-posta değil. 3-60 karakter, yalnız `a-z`, `0-9`, `.`, `_`, `-` |
| `SEED_ADMIN_PASSWORD` | en az 12 karakter | Gerçek giriş parolası |
| `SEED_EDITOR_USERNAME` | `avukat` | Aynı kural |
| `SEED_EDITOR_PASSWORD` | en az 12 karakter | Gerçek giriş parolası |
| `NODE_ENV` | `production` | Hostinger genelde kendi ayarlar; yoksa ekle |

`AUTH_SECRET` üretmek için kendi makinenizde şunu çalıştırın ve çıktıyı yapıştırın:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> Bu değeri bana veya başka bir yere yapıştırmanıza gerek yok — doğrudan hPanel'e girin.
> Sızarsa herkes panele giriş çerezi üretebilir.

> **Eski kurulumdan geliyorsanız:** `SEED_ADMIN_EMAIL` ve `SEED_EDITOR_EMAIL` değişkenleri
> **SİLİNMELİ**, yerlerine yukarıdaki `SEED_*_USERNAME` çifti girilmeli. Eski adlar artık
> okunmuyor ve tohum betiği eksik değişkende **durur** — sessizce yanlış hesap oluşmaz.

**Doğrulama:** Dokuz değişken de listede görünüyor; `DATABASE_URL` içinde `?charset=` yok
ve `SEED_*_EMAIL` kalmamış.

---

## Adım 5 — Şemayı kur (veritabanı boş → tablolar)

Bu adımı **ben** sizin makinenizden çalıştırıyorum (Adım 2'deki uzaktan erişim sayesinde).
Sırasıyla:

1. Bağlantı, harmanlama ve saat dilimi doğrulanır.
2. `npm run db:migrate` — 8 tablo + FULLTEXT indeksi kurulur.
3. `npm run db:seed` — ilk yönetici hesabı ve başlangıç kayıtları. Hesabın giriş kimliği
   `SEED_ADMIN_USERNAME` değeridir (kullanıcı adı, e-posta değil).
4. `information_schema` sorgulanarak tabloların gerçekten `utf8mb4_unicode_ci` olduğu
   **okunarak** doğrulanır.

**Doğrulama:** 9 tablo mevcut, hepsi `utf8mb4_unicode_ci`, `articles_fulltext_idx` yerinde.

---

## Adım 6 — İlk dağıtımı başlat

hPanel → Web App panosu → **Deploy**

Hostinger sırasıyla `npm ci`, `npm run build` çalıştırır ve uygulamayı başlatır.

**Doğrulama:**
- Derleme günlüğü hatasız bitiyor.
- Geçici alan adı açılıyor, ana sayfa çiziliyor.
- `/panel` giriş ekranı açılıyor, seed'deki yönetici hesabıyla giriş yapılıyor.

> **Neden bu adım rahatlatıcı:** `argon2` ve `sharp` platforma özel ikili dosyalar içerir;
> Windows'ta derlenmiş hâlleri Linux'ta çalışmaz. Hostinger derlemeyi **kendi sunucusunda**
> yaptığı için bu sorun tümüyle ortadan kalkıyor. Elle dosya yükleseydik bu bizi uğraştıracaktı.

---

## Adım 7 — Medya kalıcılığını SINA (bu dağıtımın asıl sınavı)

Spec §13 bu maddeyi "uygulamanın ilk adımı" diye işaretlemişti; sırası şimdi geldi.

1. Panelden bir görsel yükle. Sitede/panelde göründüğünü doğrula.
2. hPanel'den **yeniden dağıtım** yap (veya depoya boş bir commit atıp otomatik dağıtımı tetikle).
3. Yeniden dağıtım bitince **aynı görsele tekrar bak.**

| Sonuç | Anlamı | Ne yapacağız |
|---|---|---|
| Görsel duruyor | `UPLOAD_DIR` kalıcı | Devam, sorun yok |
| Görsel kayıp | Dağıtım dizini siliniyor | **Cloudflare R2'ye geçiyoruz** (spec §13'te öngörülmüş) |

> Bu ölçümü atlamak, aylar sonra avukatın yüklediği bütün görsellerin bir dağıtımda
> silinmesi demektir. Şimdi 5 dakika, sonra telafisi yok.

---

## Adım 8 — Kapanış

1. **Uzaktan MySQL erişimini kapat** (Adım 2 geçiciydi).
2. Otomatik dağıtımı doğrula: depoya küçük bir commit at, Hostinger'ın kendiliğinden
   dağıttığını gör.
3. `SITE_URL` değişkenini not al — Plan 3'ün Görev 7'sinde gerekecek ve **tanımlı değilse
   derleme bilerek düşecek** (sessizce `localhost` yazan bir sitemap yayına çıkmasın diye).

---

## Sonraki iş

Bu kurulum bittiğinde Plan 3'e dönüyoruz. Yayına almadan önce spec §13'te çözülmesi
gereken açık maddeler:

- KVKK aydınlatma metni ve çerez politikasının **gerçek** içeriği (müvekkilden gelir —
  yer tutucuyla yayına çıkılmaz).
- Gerçek içerik: büro adı, avukat özgeçmişleri, çalışma alanları, iletişim bilgileri.
- Alan adı seçimi (`.av.tr` / `.tr` / `.com`) — müvekkil ve barosu.
- MySQL yedekleme düzeni.
