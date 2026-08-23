/**
 * MÜŞTERİ ONAYLI İÇERİK — Akil Hukuk Bürosu.
 *
 * Buradaki hukuki düzyazı, büronun teslim ettiği "akil hukuk web.docx" belgesinden BİREBİR
 * alınmıştır. Belgenin sonunda şu kayıt var: "HER BİR BAŞLIK AVUKAT TOLGA AKİL TARAFINDAN
 * HAZIRLANMIŞTIR. METİNLER AV TOLGA AKİL TARAFINDAN ONAYLANMIŞTIR. SON GÜNCELLEME TARİHİ
 * 07.08.2026."
 *
 * Bu yüzden paragraflar YENİDEN YAZILMAZ, kısaltılmaz, "iyileştirilmez". Bir avukatın
 * onayladığı hukuki metni model çıktısıyla değiştirmek, onayı geçersiz kılar. Değişiklik
 * ancak büro yeni bir metin gönderdiğinde yapılır.
 *
 * TÜRETİLEN tek alan `summary`: belgede kart özeti yok, ama kartların ve meta açıklamaların
 * bir özete ihtiyacı var. Özetler yeni iddia üretmez — her biri o başlığın kendi "Başlıca
 * Çalışma Konuları" listesinin düz bir cümleye dönüştürülmüş hâlidir.
 *
 * Metinler seed.ts'ten AYRI duruyor çünkü seed.ts bir kurulum betiği; onaylı düzyazının
 * kurulum mantığıyla aynı dosyada olması, ikisinden birine dokunurken diğerini kazara
 * değiştirme riskini doğuruyordu.
 *
 * Uzantılı göreli import yok: bu modül hiçbir şey import etmiyor, saf veri. seed.ts onu
 * `./seed-content.ts` olarak yüklüyor (Node ESM uzantısız belirteç kabul etmiyor).
 */

/** Belgedeki iletişim bilgileri. Panelden değiştirilebilir; burası yalnız ilk kurulum. */
export const SEED_SETTINGS = {
  officeName: 'Akil Hukuk Bürosu',
  address: 'Bahçelievler Mah. İstiklal Cad. No: 162/A D: 8, İlkadım / Samsun',
  phone: '0362 234 00 54',
  phoneSecondary: '0541 643 50 55',
  whatsapp: '0541 643 50 55',
  workingHours: 'Hafta içi 08.00-18.00, Cumartesi 08.00-14.00, Pazar kapalı',
  email: 'akilavukatlik@gmail.com',
  footerText: 'Bu sitedeki bilgiler hukuki tavsiye niteliği taşımaz.',
} as const

/**
 * Avukat kaydı.
 *
 * `practiceStartDate` bilerek YOK. Alan siteye tam tarih olarak basılıyor
 * ("Mesleğe başlama: 1 Ocak 2018" gibi, bkz. lib/lawyer-facts.ts) ama belge yalnız yılı
 * veriyor: "2018 yılında Samsun'da yasal stajını tamamladıktan sonra". Gün uydurmak, bir
 * hukuk bürosunun sicil bilgisinde yanlış veri yayımlamak olurdu. Kesin tarih büro
 * tarafından bildirildiğinde panelden girilir.
 *
 * `barRegistryNo`, `tbbRegistryNo` ve `languages` aynı gerekçeyle boş: belgede yer almıyor.
 */
export const SEED_LAWYER = {
  slug: 'tolga-akil',
  fullName: 'Tolga Akil',
  title: 'Avukat',
  barAssociation: 'Samsun Barosu',
  university: 'İstanbul Bilgi Üniversitesi Hukuk Fakültesi',
  email: 'akilavukatlik@gmail.com',
  sortOrder: 0,
  bio: [
    '<p>Büromuzun kurucusu Av. Tolga Akil, Samsun Barosuna kayıtlı bir avukat olup Türk hukukunun farklı alanlarına ilişkin bilgi birikimi ve uygulama deneyimiyle yerli ve yabancı müvekkillere hukuki danışmanlık ve avukatlık hizmetleri sunmaktadır.</p>',
    '<p>Çalışma alanı özellikle gayrimenkul uyuşmazlıkları, icra ve iflas hukuku, iş hukuku ve tazminat davaları ile sözleşmesel ilişkilerden kaynaklanan ihtilaflar üzerinde yoğunlaşmaktadır.</p>',
    '<p>Avukat Tolga Akil, 2017 yılında İstanbul Bilgi Üniversitesi Hukuk Fakültesinden mezun olmuştur. 2018 yılında Samsun’da yasal stajını tamamladıktan sonra avukatlık mesleğini Samsun’da icra etmeye başlamıştır.</p>',
    '<p>Av. Tolga Akil, müvekkilleriyle uzun vadeli ve güvene dayalı ilişkiler kurmanın, hukuki sorunların doğru şekilde anlaşılması ve her somut olayın özelliklerine göre uygun stratejinin belirlenmesiyle mümkün olduğuna inanır. Bu doğrultuda hukuki meseleleri kapsamlı şekilde analiz ederek uygulanabilir çözüm yolları geliştirmeyi hedefler.</p>',
  ].join(''),
} as const

/** Bir çalışma alanının HTML gövdesini kurar: paragraflar + "Başlıca Çalışma Konuları". */
function govde(paragraflar: readonly string[], konular: readonly string[]): string {
  const p = paragraflar.map((metin) => `<p>${metin}</p>`).join('')
  const liste = konular.map((konu) => `<li>${konu}</li>`).join('')
  // Başlık seviyesi h2: sayfa gövdesinde h1 çalışma alanının adı, bu onun altındaki bölüm.
  return `${p}<h2>Başlıca Çalışma Konuları</h2><ul>${liste}</ul>`
}

/**
 * Yedi çalışma alanı. Sıra belgedeki sırayla aynı ve gayrimenkul başta: belge "özellikle
 * gayrimenkul hukuku başta olmak üzere" diyor, yani sıralama büronun kendi vurgusu.
 */
export const SEED_PRACTICE_AREAS = [
  {
    slug: 'gayrimenkul-hukuku',
    name: 'Gayrimenkul Hukuku',
    summary:
      'Tapu işlemleri, tapu iptali ve tescil, taşınmaz alım satımı, ortak mülkiyet ve gayrimenkul sözleşmelerinden kaynaklanan uyuşmazlıklar.',
    sortOrder: 0,
    content: govde(
      [
        'Akil Hukuk Bürosunun başlıca çalışma alanlarından biri gayrimenkul hukukudur. Gayrimenkullere ilişkin hukuki işlemler ve uyuşmazlıklar, taşınmazın niteliği, tarafların hukuki durumu ve somut olayın özellikleri doğrultusunda değerlendirilmektedir.',
        'Gayrimenkul hukukuna ilişkin faaliyetler kapsamında; taşınmaz alım ve satım işlemlerinden kaynaklanan hukuki sorunlar, tapu işlemleri, tapu iptali ve tescil talepleri, taşınmaz mülkiyeti, ortak mülkiyet ilişkileri, taşınmaz kullanımından doğan uyuşmazlıklar ve gayrimenkul sözleşmeleriyle ilgili hukuki süreçler ele alınmaktadır.',
        'Bunun yanında taşınmazlarla ilgili uyuşmazlıklarda dava ve yargılama süreçlerinin takibi ile tarafların hak ve yükümlülüklerinin hukuki açıdan değerlendirilmesine yönelik çalışmalar yürütülmektedir.',
        'Akil Hukuk Bürosu, gayrimenkul hukukuna ilişkin hukuki ihtiyaçları somut olayın özellikleri çerçevesinde değerlendirerek, ilgili mevzuat ve yargı uygulamaları doğrultusunda hukuki süreçlerin yürütülmesine yönelik faaliyet göstermektedir.',
      ],
      [
        'Tapu işlemleri ve taşınmaz mülkiyeti',
        'Tapu iptali ve tescil uyuşmazlıkları',
        'Taşınmaz alım ve satım işlemleri',
        'Gayrimenkul sözleşmeleri',
        'Ortak mülkiyet ve paydaşlık uyuşmazlıkları',
        'Taşınmaz kullanımından kaynaklanan uyuşmazlıklar',
        'Gayrimenkullere ilişkin dava ve hukuki süreçlerin takibi',
      ],
    ),
  },
  {
    slug: 'icra-ve-iflas-hukuku',
    name: 'İcra ve İflas Hukuku',
    summary:
      'İcra takiplerinin başlatılması ve yürütülmesi, alacak takibi, ödeme emrine itiraz, haciz ve satış işlemleri.',
    sortOrder: 1,
    content: govde(
      [
        'Akil Hukuk Bürosu, alacakların tahsili, borç ilişkilerinden kaynaklanan uyuşmazlıklar ve icra takipleri kapsamında hukuki faaliyet yürütmektedir.',
        'İcra ve iflas hukukuna ilişkin süreçlerde, alacaklı veya borçlu tarafın hukuki durumunun değerlendirilmesi, uygun takip yollarının belirlenmesi ve icra dosyalarının takibi önem taşımaktadır. Bu kapsamda icra takiplerinin başlatılması ve yürütülmesi, ödeme emri ve takip işlemlerine ilişkin hukuki süreçler ile itiraz ve şikâyet yollarına ilişkin çalışmalar gerçekleştirilmektedir.',
        'Büro tarafından ayrıca haciz, satış ve tahsilat süreçleri ile icra dosyalarından kaynaklanan uyuşmazlıkların hukuki açıdan değerlendirilmesine yönelik çalışmalar yürütülmektedir.',
        'İcra ve iflas hukukunda her dosyanın kendi koşulları içerisinde değerlendirilmesi gerektiğinden, takip öncesi ve takip sürecindeki hukuki durumun somut olay üzerinden incelenmesi esas alınmaktadır.',
      ],
      [
        'İlamsız ve ilamlı icra takipleri',
        'Alacak takibi',
        'İcra dosyalarının takibi',
        'Ödeme emrine itiraz süreçleri',
        'İcra işlemlerine yönelik şikâyetler',
        'Haciz ve satış işlemleri',
        'İcra hukukundan kaynaklanan uyuşmazlıklar',
        'Alacak ve borç ilişkilerinin hukuki değerlendirilmesi',
      ],
    ),
  },
  {
    slug: 'is-hukuku',
    name: 'İş Hukuku',
    summary:
      'İşçilik alacakları, kıdem ve ihbar tazminatı, fazla çalışma, işe iade ve iş sözleşmesinin feshinden doğan uyuşmazlıklar.',
    sortOrder: 2,
    content: govde(
      [
        'Akil Hukuk Bürosu, işçi ve işveren arasındaki hukuki ilişkilerden kaynaklanan uyuşmazlıklara ilişkin avukatlık ve hukuki danışmanlık faaliyetleri yürütmektedir.',
        'İş ilişkisinin kurulmasından sona ermesine kadar ortaya çıkabilecek hukuki sorunlar, iş sözleşmesinin niteliği ve tarafların hak ve yükümlülükleri çerçevesinde değerlendirilmektedir.',
        'Bu kapsamda iş sözleşmelerinin sona ermesi, kıdem ve ihbar tazminatı, yıllık izin, ücret ve diğer işçilik alacakları, fazla çalışma, işe iade ve iş ilişkisinden kaynaklanan diğer hukuki uyuşmazlıklara ilişkin süreçler ele alınmaktadır.',
        'İş hukukundan kaynaklanan uyuşmazlıklarda dava ve arabuluculuk süreçlerinin hukuki açıdan değerlendirilmesi, gerekli başvuruların yapılması ve yargısal süreçlerin takibi konusunda çalışmalar gerçekleştirilmektedir.',
      ],
      [
        'İş sözleşmeleri',
        'İşçilik alacakları',
        'Kıdem ve ihbar tazminatı',
        'Fazla çalışma ve ücret alacakları',
        'Yıllık izin alacakları',
        'İş sözleşmesinin feshi',
        'İşe iade uyuşmazlıkları',
        'İşçi ve işveren arasındaki hukuki uyuşmazlıklar',
        'İş hukukuna ilişkin arabuluculuk ve dava süreçleri',
      ],
    ),
  },
  {
    slug: 'tazminat-hukuku',
    name: 'Tazminat Hukuku',
    summary:
      'Trafik ve iş kazalarından kaynaklanan maddi ve manevi tazminat talepleri ile haksız fiilden doğan zararlar.',
    sortOrder: 3,
    content: govde(
      [
        'Akil Hukuk Bürosu, hukuka aykırı eylem veya işlemler sonucunda ortaya çıkan maddi ve manevi zararların giderilmesine ilişkin hukuki süreçlerde faaliyet göstermektedir.',
        'Tazminat hukukunda, meydana gelen zararın niteliği, zarara neden olan olay, tarafların hukuki sorumluluğu ve mevcut deliller birlikte değerlendirilmektedir. Maddi ve manevi zararların belirlenmesi ile tazminat taleplerinin hukuki dayanaklarının incelenmesine yönelik çalışmalar yürütülmektedir.',
        'Özellikle trafik kazaları, iş kazaları ve çeşitli haksız fiillerden kaynaklanan zararlar bakımından sorumluluğun belirlenmesi, tazminat taleplerinin değerlendirilmesi ve gerekli hukuki süreçlerin takip edilmesi konusunda faaliyet gösterilmektedir.',
        'Her tazminat uyuşmazlığının kendine özgü koşulları bulunduğundan, olayın meydana geliş şekli, zarar ve illiyet ilişkisi ile tarafların hukuki durumunun birlikte değerlendirilmesi esas alınmaktadır.',
      ],
      [
        'Maddi tazminat talepleri',
        'Manevi tazminat talepleri',
        'Trafik kazalarından kaynaklanan tazminat uyuşmazlıkları',
        'İş kazalarından kaynaklanan tazminat talepleri',
        'Haksız fiilden kaynaklanan zararlar',
        'Zarar ve sorumluluğun hukuki değerlendirilmesi',
        'Tazminat davaları ve ilgili hukuki süreçlerin takibi',
      ],
    ),
  },
  {
    slug: 'sigorta-hukuku',
    name: 'Sigorta Hukuku',
    summary:
      'Trafik sigortası ve kasko uyuşmazlıkları, sigorta tazminatları ile hasar dosyalarının hukuki değerlendirilmesi.',
    sortOrder: 4,
    content: govde(
      [
        'Akil Hukuk Bürosu, sigorta sözleşmelerinden ve sigorta ilişkilerinden kaynaklanan hukuki uyuşmazlıklara ilişkin çalışmalar yürütmektedir.',
        'Sigorta hukukunda, sigorta sözleşmesinin kapsamı, tarafların hak ve yükümlülükleri, meydana gelen riskin poliçe kapsamında bulunup bulunmadığı ve sigorta şirketinin sorumluluğu somut olayın özellikleri çerçevesinde değerlendirilmektedir.',
        'Özellikle trafik kazaları ve çeşitli zarar olayları sonrasında ortaya çıkan sigorta uyuşmazlıklarında, poliçe ve hasar dosyasının incelenmesi, sigorta şirketleri ile yürütülen hukuki süreçler ve gerektiğinde yargısal başvuruların takibi konusunda faaliyet gösterilmektedir.',
        'Sigorta uyuşmazlıklarında olayın niteliği, poliçe hükümleri ve ilgili mevzuatın birlikte değerlendirilmesi önem taşıdığından, her dosya kendi koşulları içerisinde ele alınmaktadır.',
      ],
      [
        'Sigorta sözleşmelerinden kaynaklanan uyuşmazlıklar',
        'Trafik sigortası uyuşmazlıkları',
        'Kasko ve diğer sigorta uyuşmazlıkları',
        'Sigorta tazminatları',
        'Hasar dosyalarının hukuki değerlendirilmesi',
        'Sigorta şirketleri ile yaşanan uyuşmazlıklar',
        'Sigorta hukukuna ilişkin dava ve başvuru süreçleri',
      ],
    ),
  },
  {
    slug: 'kira-hukuku',
    name: 'Kira Hukuku',
    summary:
      'Konut ve işyeri kira sözleşmeleri, kira bedelinin belirlenmesi, tahliye ve kira alacaklarına ilişkin süreçler.',
    sortOrder: 5,
    content: govde(
      [
        'Akil Hukuk Bürosu, konut ve işyeri kiraları başta olmak üzere kira ilişkilerinden kaynaklanan hukuki uyuşmazlıklara ilişkin faaliyet göstermektedir.',
        'Kira sözleşmesinin kurulmasından sona ermesine kadar geçen süreçte kiraya veren ve kiracının hak ve yükümlülükleri, ilgili mevzuat çerçevesinde değerlendirilmektedir.',
        'Kira bedelinin belirlenmesi, kira bedelinin ödenmemesi, tahliye, kira sözleşmesinin sona ermesi ve taraflar arasında kira ilişkisinden kaynaklanan diğer uyuşmazlıklara ilişkin hukuki süreçler yürütülmektedir.',
        'Kira hukukundan kaynaklanan uyuşmazlıklarda somut olayın özellikleri, kira sözleşmesinin içeriği ve tarafların hukuki durumu birlikte değerlendirilerek gerekli hukuki başvuru ve süreçlerin takibine yönelik çalışmalar gerçekleştirilmektedir.',
      ],
      [
        'Konut ve işyeri kira sözleşmeleri',
        'Kira bedeli uyuşmazlıkları',
        'Kira bedelinin belirlenmesine ilişkin uyuşmazlıklar',
        'Kiralananın tahliyesi',
        'Kira alacakları',
        'Kira sözleşmesinin sona ermesi',
        'Kiracı ve kiraya veren arasındaki uyuşmazlıklar',
        'Kira hukukuna ilişkin dava ve arabuluculuk süreçleri',
      ],
    ),
  },
  {
    slug: 'miras-hukuku',
    name: 'Miras Hukuku',
    summary:
      'Miras paylaşımı, mirasçılık belgesi, tereke işlemleri ve mirasçılar arasındaki uyuşmazlıklar.',
    sortOrder: 6,
    content: govde(
      [
        'Akil Hukuk Bürosu, miras bırakanın vefatı sonrasında ortaya çıkan miras ilişkileri ve mirasçılar arasındaki hukuki uyuşmazlıklara ilişkin çalışmalar yürütmektedir.',
        'Miras hukukunda mirasçıların hakları, mirasın paylaşılması, terekenin kapsamı ve mirasçılar arasındaki hukuki ilişkiler somut olayın özellikleri doğrultusunda değerlendirilmektedir.',
        'Mirasın paylaşılması, mirasçılar arasında ortaya çıkan uyuşmazlıklar, mirasçılık belgesi ve terekeye ilişkin hukuki işlemler ile miras hukukundan kaynaklanan dava süreçleri çalışma konuları arasında yer almaktadır.',
        'Miras uyuşmazlıklarında terekenin niteliği, mirasçıların hukuki durumu ve mevcut belgeler birlikte değerlendirilerek ilgili hukuki süreçlerin yürütülmesine yönelik çalışmalar gerçekleştirilmektedir.',
      ],
      [
        'Miras paylaşımı',
        'Mirasçılık belgesi',
        'Tereke işlemleri',
        'Mirasçılar arasındaki uyuşmazlıklar',
        'Miras hukukundan kaynaklanan alacak ve talepler',
        'Miras hukukuna ilişkin dava süreçleri',
        'Mirasın paylaşılmasına ilişkin hukuki süreçler',
      ],
    ),
  },
] as const

/**
 * /hakkimizda sayfasının gövdesi — belgenin "Hakkımızda" ve "Mesleki Deneyim" bölümleri.
 *
 * KVKK ve çerez politikası metinleri BURADA YOK ve bilerek yok: onlar hukuki belgedir,
 * belgede de yer almıyorlar ve seed.ts'teki yer tutucu kararı yürürlükte kalıyor
 * (üretilmiş bir metin gerçek belge gibi görünürdü).
 */
export const SEED_ABOUT_PAGE = [
  '<p>Akil Hukuk Bürosu, Samsun’un İlkadım ilçesinde faaliyet gösteren bir hukuk bürosudur. Büro, bireysel ve kurumsal nitelikteki hukuki ihtiyaçlara yönelik avukatlık ve hukuki danışmanlık faaliyetlerini farklı çalışma alanlarında sürdürmektedir.</p>',
  '<p>Büronun faaliyetlerinde özellikle gayrimenkul hukuku önemli bir çalışma alanı olarak öne çıkmaktadır. Bunun yanında icra ve iflas hukuku, iş hukuku, tazminat hukuku, sigorta hukuku, kira hukuku ve miras hukuku alanlarında da hukuki hizmet sunulmaktadır.</p>',
  '<p>Akil Hukuk Bürosunun çalışma anlayışında, her hukuki uyuşmazlığın kendi koşulları içerisinde değerlendirilmesi ve hukuki sürecin somut olayın özelliklerine göre ele alınması esas alınmaktadır.</p>',
  '<p>Büro, hukuki süreçlerin başlangıcından sonuçlanmasına kadar gerekli hukuki işlemlerin yürütülmesi, uyuşmazlıkların hukuki açıdan değerlendirilmesi ve müvekkillerin süreç hakkında bilgilendirilmesi doğrultusunda çalışmalarını sürdürmektedir.</p>',
  '<h2>Mesleki Deneyim</h2>',
  '<p>Büromuzun kurucusu Av. Tolga Akil, Samsun Barosuna kayıtlı bir avukat olup Türk hukukunun farklı alanlarına ilişkin bilgi birikimi ve uygulama deneyimiyle yerli ve yabancı müvekkillere hukuki danışmanlık ve avukatlık hizmetleri sunmaktadır.</p>',
  '<p>Avukat Tolga Akil, 2017 yılında İstanbul Bilgi Üniversitesi Hukuk Fakültesinden mezun olmuştur. 2018 yılında Samsun’da yasal stajını tamamladıktan sonra avukatlık mesleğini Samsun’da icra etmeye başlamıştır.</p>',
  '<p>Akil Hukuk Bürosu, hukuki ihtiyaçların doğru şekilde değerlendirilmesi ve hukuki süreçlerin mevzuat çerçevesinde yürütülmesi amacıyla faaliyet göstermektedir.</p>',
].join('')

/** Makale kategorileri çalışma alanlarıyla aynı kümeden: yazılar bir alana bağlanacak. */
export const SEED_CATEGORIES = SEED_PRACTICE_AREAS.map((area) => ({
  slug: area.slug,
  name: area.name,
}))
