import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";
import { ArticleList } from "@/components/ArticleList";
import { SITE } from "@/content/site";
import { listPublicCategories } from "@/db/queries/public/categories";
import { listPublishedArticles } from "@/db/queries/public/articles";
import { getPublicSiteIdentity } from "@/db/queries/public/site-identity";
import styles from "./page.module.css";

// Açıklama sayfaya özgü yazılmak zorunda: boş bırakıldığında Next kök layout'un genel
// açıklamasına düşüyor ve arama sonucunda /makaleler ile ana sayfa aynı iki satırı
// gösteriyor. Metin bilgilendirme amacını belirtiyor; hukuki tavsiye vaadi vermiyor.
const ACIKLAMA = `${SITE.name} tarafından yayımlanan hukuk alanındaki bilgilendirme yazıları.`;

export const metadata: Metadata = {
  title: "Makaleler",
  description: ACIKLAMA,
  // Gerekçe iletisim/page.tsx ile aynı: kart paylaşıldığında sayfa adı görünsün.
  openGraph: {
    siteName: SITE.name,
    locale: "tr_TR",
    title: "Makaleler",
    description: ACIKLAMA,
    url: "/makaleler",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Makaleler",
    description: ACIKLAMA,
  },
  // Kanonik adres: aynı içerik sorgu dizesi eklenmiş adreslerden de
  // ulaşılabildiğinde arama motoru bunu içerik kopyası sayabiliyor.
  alternates: { canonical: "/makaleler" },
};

// Adres çubuğundan gelen HER değer kullanıcı tarafından yazılabilir. Sayfa numarası
// burada sayıya çevrilip taban değere kırpılıyor; sorgu katmanı da ayrıca kendi
// sınırlarını uyguluyor, ama bozuk bir değerin oraya hiç ulaşmaması daha iyi.
function sayfaNo(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Metin alanları sorgu katmanına ham gidiyor (orada parametreli sorgu ve tam metin
// terimi üretimi var), ekrana ise React'in kendi kaçışıyla basılıyor.
function metin(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim();
  return t === "" ? undefined : t;
}

type ArticlesPageProps = {
  searchParams: Promise<{ q?: string; kategori?: string; sayfa?: string }>;
};

// SAYFA SENKRON ve searchParams'ı AWAIT ETMİYOR — promise'i olduğu gibi aşağıya
// geçiriyor. cacheComponents açıkken çalışma anı verisine <Suspense> sınırının DIŞINDA
// dokunmak derlemeyi düşürüyor ("uncached or runtime data during prerendering"; Next 16
// göç kılavuzu, "cookies, headers, and searchParams" başlığı). Bu yapıda başlık bandı ve
// krem gövde çerçevesi statik kabuk olarak ön üretiliyor, arama sonucu istek anında
// akıyor.
export default function ArticlesPage({ searchParams }: ArticlesPageProps) {
  return (
    <article>
      <div className={styles.head}>
        <div className={styles.headInner}>
          <PageHeading eyebrow="Yayınlar" title="Makaleler" />
          <p className={styles.headLead}>
            Çalışma alanlarına ilişkin bilgilendirme yazıları. Buradaki metinler
            genel bilgilendirme amaçlıdır ve hukuki tavsiye niteliği taşımaz.
          </p>
        </div>
      </div>

      {/* Krem gövde (devir tasarımı 6a): koyu başlık bandından sonra okuma alanı krem
          zemine geçiyor. Yüzey sözleşmesi data-surface="paper" ile geliyor — metin,
          ayırıcı ve odak halkası kendi krem karşılıklarına dönüyor. */}
      <div data-surface="paper" className={styles.body}>
        <div className={styles.bodyInner}>
          {/* Yedek içerik `role="status"`: sonuç akarken ekran okuyucu bekleme durumunu
              duysun. Statik kabukta görünen tek şey bu satır. */}
          <Suspense
            fallback={
              <p className={styles.empty} role="status">
                Yazılar yükleniyor…
              </p>
            }
          >
            <Sonuclar searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </article>
  );
}

// Çalışma anı verisine dokunan parça. <Suspense> içinde çizildiği için sayfanın geri
// kalanı statik kabuk olarak ön üretilebiliyor.
async function Sonuclar({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const q = metin(params.q);
  const kategori = metin(params.kategori);
  const sayfa = sayfaNo(params.sayfa);

  // Üç sorgu paralel; sıralı await'te toplam gecikme üçünün toplamı olurdu.
  const [sonuc, kategoriler, identity] = await Promise.all([
    listPublishedArticles({ q, categorySlug: kategori, page: sayfa }),
    listPublicCategories(),
    getPublicSiteIdentity(),
  ]);

  // Filtre bağlantıları kurulurken mevcut arama korunuyor: kullanıcı "kira" arayıp
  // kategoriye tıkladığında araması silinmemeli. Sayfa numarası ise BİLEREK düşüyor —
  // filtre değişince 4. sayfada kalmak çoğu zaman boş sonuç demek.
  const filtreHref = (slug: string | null): string => {
    const sp = new URLSearchParams();
    if (q !== undefined) sp.set("q", q);
    if (slug !== null) sp.set("kategori", slug);
    const qs = sp.toString();
    return qs === "" ? "/makaleler" : `/makaleler?${qs}`;
  };

  // Sayfalama bağlantıları hem aramayı hem kategoriyi taşır.
  const sayfaHref = (n: number): string => {
    const sp = new URLSearchParams();
    if (q !== undefined) sp.set("q", q);
    if (kategori !== undefined) sp.set("kategori", kategori);
    if (n > 1) sp.set("sayfa", String(n));
    const qs = sp.toString();
    return qs === "" ? "/makaleler" : `/makaleler?${qs}`;
  };

  return (
    <>
      {/* Arama, JavaScript'siz çalışan düz bir GET formu: sunucu bileşeni kalıyor ve
              sonuç adres çubuğunda taşınıyor, yani paylaşılabilir ve geri tuşuyla
              gezilebilir. */}
      <form className={styles.search} role="search" action="/makaleler">
        <label className={styles.searchLabel} htmlFor="q">
          Makalelerde ara
        </label>
        <div className={styles.searchRow}>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Başlık veya konu"
            className={styles.searchInput}
          />
          {/* Kategori seçili ve arama yapılıyorsa kategori korunuyor. */}
          {kategori !== undefined ? (
            <input type="hidden" name="kategori" value={kategori} />
          ) : null}
          <button type="submit" className={styles.searchButton}>
            Ara
          </button>
        </div>
      </form>

      {kategoriler.length > 0 ? (
        <nav className={styles.chips} aria-label="Kategori filtresi">
          <ul className={styles.chipList}>
            <li>
              {/* aria-current="page": etkin filtre yalnız renkle değil, ekran
                      okuyucuya da bildiriliyor (WCAG 1.4.1). */}
              <Link
                href={filtreHref(null)}
                className={styles.chip}
                aria-current={kategori === undefined ? "page" : undefined}
              >
                Tümü
              </Link>
            </li>
            {kategoriler.map((c) => (
              <li key={c.slug}>
                <Link
                  href={filtreHref(c.slug)}
                  className={styles.chip}
                  aria-current={kategori === c.slug ? "page" : undefined}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className={styles.split}>
        <div className={styles.main}>
          {sonuc.items.length === 0 ? (
            <p className={styles.empty}>
              {q !== undefined || kategori !== undefined
                ? "Bu arama için sonuç bulunamadı."
                : "Henüz yayımlanmış makale yok."}
            </p>
          ) : (
            <>
              {/* Sonuç sayısı `role="status"` ile: filtre değiştiğinde ekran okuyucu
                      kaç sonuç kaldığını duysun. */}
              <p className={styles.count} role="status">
                {sonuc.total} yazı
              </p>
              <ArticleList articles={sonuc.items} />
            </>
          )}

          {sonuc.pageCount > 1 ? (
            <nav className={styles.pager} aria-label="Sayfalar">
              {sayfa > 1 ? (
                <Link
                  href={sayfaHref(sayfa - 1)}
                  className={styles.pagerLink}
                  rel="prev"
                >
                  ← Önceki
                </Link>
              ) : null}
              <span className={styles.pagerState}>
                Sayfa {sayfa} / {sonuc.pageCount}
              </span>
              {sayfa < sonuc.pageCount ? (
                <Link
                  href={sayfaHref(sayfa + 1)}
                  className={styles.pagerLink}
                  rel="next"
                >
                  Sonraki →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>

        <aside className={styles.side}>
          {kategoriler.length > 0 ? (
            <nav className={styles.topics} aria-label="Konu başlıkları">
              <h2 className={styles.sideTitle}>Konu başlıkları</h2>
              <ul className={styles.topicList}>
                {kategoriler.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={filtreHref(c.slug)}
                      className={styles.topicLink}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* İletişim kartı. Metin TBB reklam yasağına uygun: iddia, üstünlük, başarı
                  veya ücret ifadesi yok — yalnız iletişim daveti. */}
          <div className={styles.ask}>
            <h2 className={styles.askTitle}>Sorunuz mu var?</h2>
            <p className={styles.askText}>
              Konunuzu iletirseniz çalışma saatleri içinde dönüş yapılır.
            </p>
            <a href={identity.phoneHref} className={styles.askPhone}>
              {identity.phone}
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
