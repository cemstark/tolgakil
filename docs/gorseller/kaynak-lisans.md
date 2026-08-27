# Stok görseller — kaynak ve lisans kaydı

Bu dosya `public/gorsel/` altındaki dokuz WebP dosyasının nereden geldiğini ve hangi lisansla
kullanıldığını kaydeder. Dosyaları üreten betik: `scripts/fetch-stock-images.mts`.

```
node scripts/fetch-stock-images.mts          # eksik olanları üretir
node scripts/fetch-stock-images.mts --force  # var olanların üstüne yazar
```

Müvekkil belgesindeki talep: *"STOK GÖRSEL KULLANILSIN, THEMİS HEYKELİ GİBİ GÖRSELLER OLABİLİR."*

## Lisans

Hepsi **Unsplash License**: ticari kullanım serbest, atıf zorunlu değil, değiştirilebilir.
Satılamaz ve Unsplash'e rakip bir servis olarak yeniden dağıtılamaz — ikisi de bu sitede
söz konusu değil.

Lisans doğrulaması teknik olarak betiğe gömülü: Unsplash+ (ücretli abonelik) içeriği indirme
uç noktasında **403 ve sıfır bayt** döndürüyor, ücretsiz içerik **200 ve image/\*** döndürüyor.
Betik 200 dışındaki her yanıtta fırlatıp dosya yazmıyor, dolayısıyla `public/gorsel/` altına
düşen her dosya tanım gereği ücretsiz Unsplash içeriğidir. Arama sonucundaki
"Photo on Unsplash+" etiketi yalnız ön eleme için kullanıldı, kanıt olarak değil.

## Kullanılan görseller

Üretim tarihi: 27.08.2026 · Kalite: WebP q82 (`WEBP_QUALITY`, `src/lib/media-limits.ts`)

| Dosya | Ölçü | Boyut | Konu | Unsplash slug | Foto sayfası |
|---|---|---|---|---|---|
| `hero-themis.webp` | 1280×1600 (4/5) | 200 KB | Adalet (Themis) heykeli ve terazi; açık gri zemin, solda geniş boşluk | `yCdPU73kGSc` | https://unsplash.com/photos/yCdPU73kGSc |
| `gayrimenkul.webp` | 1600×1000 (16/10) | 95 KB | Tarihi mimari çizim: bina cepheleri ve kat planları | `1hSh1aDG6Mg` | https://unsplash.com/photos/1hSh1aDG6Mg |
| `icra-iflas.webp` | 1600×1000 | 200 KB | Siyah kurdeleyle bağlanmış eski dosya tomarları; adliye arşivi görünümü | `K-ZsC7YdJ6Y` | https://unsplash.com/photos/K-ZsC7YdJ6Y |
| `is.webp` | 1600×1000 | 49 KB | Boş toplantı masası ve deri sandalyeler; insan yok | `tjd5CfdDPRA` | https://unsplash.com/photos/tjd5CfdDPRA |
| `tazminat.webp` | 1600×1000 | 42 KB | Dolmakalem ve el yazılı defter, ahşap masa | `CKlHKtCJZKk` | https://unsplash.com/photos/CKlHKtCJZKk |
| `sigorta.webp` | 1600×1000 | 54 KB | Belge imzalayan eller, sıcak bokeh ışık; yüz yok | `QI6NLgN5XnM` | https://unsplash.com/photos/QI6NLgN5XnM |
| `kira.webp` | 1600×1000 | 34 KB | Ahşap kapı ve antika kapı kolu yakın çekim | `iHNGF-5Dyn8` | https://unsplash.com/photos/iHNGF-5Dyn8 |
| `miras.webp` | 1600×1000 | 153 KB | Antika el yazması belge, sararmış kâğıt dokusu | `MiNq1Mjikfw` | https://unsplash.com/photos/MiNq1Mjikfw |
| `buro-kitaplik.webp` | 1600×700 (16/7) | 34 KB | Koyu ahşap kitaplık, pencereden düşen altın ışık hüzmesi | `cnRuUMK9EWI` | https://unsplash.com/photos/cnRuUMK9EWI |

Fotoğrafçı adları bilerek yazılmadı: atıf zorunlu olmadığı için isim listesi tutmak, doğruluğu
denetlenmeyen bir veri alanı eklemek olurdu. Kim çektiyse foto sayfasında yazıyor ve slug
üzerinden her zaman ulaşılabilir.

## Gözle denetim

Her dosya üretildikten SONRA tek tek açılıp denetlendi (27.08.2026). Aranan kusurlar:
filigran veya gömülü logo, okunur yabancı marka/kurum adı, tanınabilir yüz, banknot ve para,
tokmak (Türk yargısında kullanılmaz), el sıkışma ve "kazanma/zafer" çağrışımı, kırpma sonrası
ana öznenin kadraj dışında kalması, koyu `--ink` yüzeyle ton uyumsuzluğu.

Dokuz dosyanın dokuzu da onaylandı.

## Reddedilenler

Aynı görselin ikinci kez aranmaması için, elenenler sebepleriyle birlikte:

| Slug | Neydi | Ret sebebi |
|---|---|---|
| `ioRcKUIiIdw` | Raftaki hukuk kitapları | "Black's Law Dictionary", "Deutsches Rechts-Lexikon" sırtları okunuyor — Türk bürosunda yabancı külliyat yanlış mesaj verir |
| `IqV6EYHoXK0` | Raftaki hukuk kitapları | "EU Law", "The Constitution of Europe" — aynı sebep |
| `GkNt6DE0TdQ` | Antika ahşap kitaplık | Kitap sırtlarında Kiril alfabe: "Rus İmparatorluğu Kanunları" |
| `bV5dFLEYecM` | Toplantı odası | Baskın turkuaz duvar; altın/koyu paletle çatışıyor, co-working havası |
| `e2YsciK_14E` | Toplantı odası | Mavi vurgu, ucuz ofis görünümü |
| `SiJt15u6Yw4` | Raftaki kırmızı klasörler | Baskın kırmızı ve barkod etiketleri; palet uyumsuz |
| `snNHKZ-mGfE` | Yığılmış dosyalar | Floresan ışık, bunaltıcı bürokrasi çağrışımı |
| `bqUZEAeWuok` | Ev anahtarı tutan el | Emlakçı "anahtar teslim" klişesi, ucuz anahtarlık |
| `cw2ai6A_eeM` | Antika kalem ucu | Uçtaki "JOHNSON & CO. — NEW YORK" gravürü kadrajdan çıkmıyor; kaynak zaten 16/10'a yakın olduğu için kırpma odağı da çözmedi |
| `8XddFc6NkBY` | Altın dolmakalem | "IRIDIUM POINT GERMANY" gravürü + fazla beyaz zemin |
| `TDe_01_NrTo`, `-L2tUvJ80ho` | Gayrimenkul kavramı | Banknot ve para yığını; hukuk bürosu için uygunsuz |

Unsplash+ olduğu için indirilemeyenler (403): `SVXza7LaNhI`, `LO3oGuDSCns`, `YKEx4EoChk4`,
`6j-2PBu7h4U`, `ZjXZp70IvBk`.

## Görsel değiştirmek gerekirse

1. Unsplash'te ücretsiz bir görsel bul, foto sayfası adresindeki son 11 karakteri (slug) al.
2. `scripts/fetch-stock-images.mts` içindeki ilgili satırda `slug` alanını değiştir.
3. `node scripts/fetch-stock-images.mts --force` çalıştır.
4. Üretilen dosyayı **aç ve gözle denetle** — yukarıdaki kusur listesine göre.
5. Bu dosyadaki satırı güncelle; elediğin görseli "Reddedilenler" tablosuna sebebiyle ekle.
