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
 * BELGEDEN SAPAN TEK ŞEYLER — tam liste:
 *   1. `summary` alanları TÜRETİLMİŞTİR. Belgede kart özeti yok ama kartların ve meta
 *      açıklamaların bir özete ihtiyacı var. Özetler yeni iddia üretmez; her biri o
 *      başlığın kendi "Başlıca Çalışma Konuları" listesinin düz bir cümleye dönüşmüş hâli.
 *   2. Belgedeki "AKİL" büyük harf yazımı "Akil" olarak normalleştirilmiştir.
 * Bunun dışında düzyazıya dokunulmamıştır. (İlk sürümde avukatın özgeçmişindeki çalışma
 * alanı listesi sessizce değiştirilmiş ve birkaç cümle düşürülmüştü; denetimde yakalanıp
 * belgedeki hâline döndürüldü.)
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
  // Uluslararası biçim: wa.me ülke kodu bekliyor. whatsappHref() ulusal biçimi de çevirir
  // ama veri kaynağının kendisi doğru olsun.
  whatsapp: '+90 541 643 50 55',
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
  // Belgenin "Mesleki Deneyim" bölümünden BİREBİR. İlk sürümde iki sapma vardı ve denetimde
  // yakalandı: (1) avukatın kendi çalışma alanlarını saydığı cümleden "yatırım hukuku,
  // ticaret ve şirketler hukuku" çıkarılıp yerine belgede o cümlede geçmeyen "icra ve iflas
  // hukuku" konmuştu, (2) "Yaklaşık 8 yıllık mesleki deneyim" cümlesi ile birkaç sıfat
  // sessizce düşürülmüştü. Bir avukatın onayladığı, kendi uzmanlığını tarif eden cümleyi
  // değiştirmek onayın kapsamı dışındadır; metin belgedeki hâline döndürüldü.
  // Tek biçimsel düzeltme: belgedeki "AKİL" büyük harf yazımı "Akil" olarak normalleştirildi.
  bio: [
    '<p>Büromuzun kurucusu Av. Tolga Akil, Samsun Barosuna kayıtlı bir avukat olup Türk hukukunun farklı alanlarına ilişkin kapsamlı bilgi birikimi ve uygulama deneyimiyle yerli ve yabancı müvekkillere hukuki danışmanlık ve avukatlık hizmetleri sunmaktadır.</p>',
    '<p>Çalışma alanı özellikle yatırım hukuku, ticaret ve şirketler hukuku, gayrimenkul uyuşmazlıkları, iş hukuku ve tazminat davaları ile sözleşmesel ilişkilerden kaynaklanan ihtilaflar üzerinde yoğunlaşmaktadır.</p>',
    '<p>Avukat Tolga Akil, 2017 yılında İstanbul Bilgi Üniversitesi Hukuk Fakültesinden mezun olmuştur. 2018 yılında Samsun’da yasal stajını tamamladıktan sonra avukatlık mesleğini Samsun’da icra etmeye başlamıştır.</p>',
    '<p>Yaklaşık 8 yıllık mesleki deneyimi bulunan Avukat Tolga Akil, farklı hukuk alanlarında edindiği bilgi ve deneyim doğrultusunda çalışmalarını sürdürmektedir. Av. Tolga Akil, müvekkilleriyle uzun vadeli ve güvene dayalı ilişkiler kurmanın, hukuki sorunların doğru şekilde anlaşılması ve her somut olayın özelliklerine göre uygun stratejinin belirlenmesiyle mümkün olduğuna inanır. Bu doğrultuda karmaşık hukuki meseleleri kapsamlı şekilde analiz ederek etkili ve uygulanabilir çözüm yolları geliştirmeyi hedefler.</p>',
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
  '<p>Büromuzun kurucusu Av. Tolga Akil, Samsun Barosuna kayıtlı bir avukat olup Türk hukukunun farklı alanlarına ilişkin kapsamlı bilgi birikimi ve uygulama deneyimiyle yerli ve yabancı müvekkillere hukuki danışmanlık ve avukatlık hizmetleri sunmaktadır. Çalışma alanı özellikle yatırım hukuku, ticaret ve şirketler hukuku, gayrimenkul uyuşmazlıkları, iş hukuku ve tazminat davaları ile sözleşmesel ilişkilerden kaynaklanan ihtilaflar üzerinde yoğunlaşmaktadır.</p>',
  '<p>Avukat Tolga Akil, 2017 yılında İstanbul Bilgi Üniversitesi Hukuk Fakültesinden mezun olmuştur. 2018 yılında Samsun’da yasal stajını tamamladıktan sonra avukatlık mesleğini Samsun’da icra etmeye başlamıştır.</p>',
  '<p>Yaklaşık 8 yıllık mesleki deneyimi bulunan Avukat Tolga Akil, farklı hukuk alanlarında edindiği bilgi ve deneyim doğrultusunda çalışmalarını sürdürmektedir.</p>',
  '<p>Akil Hukuk Bürosu, deneyimli kadrosuyla birlikte hukuki ihtiyaçların doğru şekilde değerlendirilmesi ve hukuki süreçlerin mevzuat çerçevesinde yürütülmesi amacıyla faaliyet göstermektedir.</p>',
].join('')

/**
 * KVKK aydınlatma metni ve çerez politikası.
 *
 * **KARAR DEĞİŞİKLİĞİ — kaydı burada duruyor.** Bu iki metin daha önce bilerek yer tutucuydu
 * ve gerekçesi `seed.ts` içinde "hukuki metin üretilmiyor" başlığıyla yazılıydı: üretilmiş
 * bir metnin gerçek belge gibi görünmesi riski. Karar 27.08.2026'da site sahibinin açık
 * talimatıyla değiştirildi. Sebep pratik: bir hukuk bürosunun sitesinde BOŞ bir KVKK sayfası,
 * eksik bir metinden daha kötü görünüyor ve site o hâliyle yayına çıkamıyordu.
 *
 * Riski azaltan şey metnin kaynağı: aşağıdaki her cümle KODUN GERÇEĞİNDEN türetildi,
 * genel bir şablondan değil.
 *   - İşlenen veri kalemleri `messages` tablosunun sütunlarıyla birebir (schema.ts):
 *     name, email, phone, subject, body, kvkk_accepted_at, ip, user_agent, created_at.
 *   - Çerez bölümü kod taranarak VE `curl -I` ile ölçülerek yazıldı: halka açık sayfalar
 *     hiç çerez bırakmıyor; `/panel/giris` açıldığında next-auth iki çerez kuruyor
 *     (`authjs.csrf-token`, `authjs.callback-url`), girişten sonra buna oturum çerezi
 *     ekleniyor — yani üçü de zorunlu ve üçü de panele ait. Analitik veya üçüncü taraf
 *     izleyici HİÇ YOK — arandı, bulunamadı.
 *   - Veri sorumlusu bilgileri `SEED_SETTINGS` ile aynı kaynaktan.
 *
 * Yine de bu metin bir AVUKAT TARAFINDAN GÖZDEN GEÇİRİLMELİDİR; saklama süresi gibi
 * kalemler büronun kendi politikasına göre değişir ve kod onu bilemez. Av. Tolga Akil
 * panelden (/panel/sayfalar) istediği an düzeltebilir — tohum idempotent olduğu için
 * panelden girilen metnin üstüne yazmaz.
 *
 * Yalnız `src/lib/sanitize.ts` beyaz listesindeki etiketler kullanılıyor
 * (p, h2, h3, ul, li, strong, a). TABLO YOK: beyaz listede olmadığı için `renderableHtml`
 * onu sessizce siler ve sayfada içeriği kaybolmuş bir boşluk kalırdı.
 */
export const SEED_KVKK_PAGE = [
  '<p>Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca, veri sorumlusu sıfatıyla Akil Hukuk Bürosu tarafından hazırlanmıştır.</p>',

  '<h2>Veri sorumlusu</h2>',
  `<p><strong>Akil Hukuk Bürosu</strong><br />Adres: ${SEED_SETTINGS.address}<br />Telefon: ${SEED_SETTINGS.phone} — ${SEED_SETTINGS.phoneSecondary}<br />E-posta: <a href="mailto:${SEED_SETTINGS.email}">${SEED_SETTINGS.email}</a></p>`,

  '<h2>İşlenen kişisel veriler</h2>',
  '<p>Bu internet sitesi üzerinden kişisel verileriniz yalnızca iletişim formunu doldurmanız hâlinde işlenir. Formu doldurmadığınız sürece siteyi gezmeniz nedeniyle kimliğinizi belirlenebilir kılan bir veri kaydedilmez.</p>',
  '<p>İletişim formu aracılığıyla işlenen veriler şunlardır:</p>',
  '<ul>',
  '<li><strong>Kimlik verisi:</strong> ad ve soyad.</li>',
  '<li><strong>İletişim verisi:</strong> e-posta adresi ve — bildirmeniz hâlinde — telefon numarası. Telefon alanı zorunlu değildir.</li>',
  '<li><strong>Mesaj içeriği:</strong> formda yazdığınız konu başlığı ve mesaj metni. Bu alanlara ilettiğiniz her bilgi tarafımızca kaydedilir; hassas nitelikteki kişisel verilerinizi ve uyuşmazlığınıza ilişkin ayrıntıları form üzerinden değil, kuracağımız doğrudan iletişimde paylaşmanızı öneririz.</li>',
  '<li><strong>İşlem güvenliği verisi:</strong> formun gönderildiği andaki IP adresi, tarayıcı bilgisi (user-agent) ve gönderim zamanı.</li>',
  '<li><strong>Onay kaydı:</strong> bu aydınlatma metnini okuduğunuza dair verdiğiniz onayın tarih ve saati.</li>',
  '</ul>',

  '<h2>İşleme amaçları</h2>',
  '<ul>',
  '<li>İletmiş olduğunuz talep ve sorulara cevap verilmesi, sizinle iletişim kurulması.</li>',
  '<li>Talebiniz hâlinde hukuki danışmanlık ve avukatlık hizmetlerine ilişkin ön görüşmenin yürütülmesi.</li>',
  '<li>İşlem güvenliğinin sağlanması, kötüye kullanımın ve otomatik gönderimlerin (spam) önlenmesi.</li>',
  '</ul>',
  '<p>Kişisel verileriniz, tarafınızca ayrıca ve açıkça talep edilmedikçe pazarlama, tanıtım veya bülten gönderimi amacıyla kullanılmaz.</p>',

  '<h2>Hukuki sebep ve toplama yöntemi</h2>',
  '<p>Verileriniz, iletişim formunu doldurmanız suretiyle elektronik ortamda ve otomatik yolla toplanır.</p>',
  '<p>Formu gönderebilmek için, kişisel verilerinizin bu aydınlatma metni kapsamında işlenmesine ilişkin onay kutusunu işaretlemeniz gerekir. Bu onay, Kanun’un 5. maddesinin 1. fıkrası anlamında <strong>açık rızanızı</strong> ifade eder; onayın verildiği tarih ve saat kayıt altına alınır. Ayrıca, talebiniz üzerine avukatlık ilişkisinin kurulması hâlinde işleme, Kanun’un 5. maddesinin 2. fıkrasının (c) bendi kapsamında sözleşmenin kurulması ve ifasıyla doğrudan ilgili hâle gelir; 1136 sayılı Avukatlık Kanunu ve ilgili mevzuattan doğan yükümlülüklerimiz bakımından (ç) bendi de uygulanır.</p>',
  `<p><strong>Rızanızı her zaman geri alabilirsiniz.</strong> Geri alma talebinizi <a href="mailto:${SEED_SETTINGS.email}">${SEED_SETTINGS.email}</a> adresine iletmeniz hâlinde, yalnız rızaya dayanan işleme faaliyeti durdurulur ve ilgili kayıtlar silinir. Avukatlık ilişkisinin kurulmuş olması hâlinde, mevzuatın saklanmasını zorunlu kıldığı bilgiler bu talebin kapsamı dışında kalır.</p>`,

  '<h2>Aktarım</h2>',
  '<p>İletişim formu aracılığıyla elde edilen kişisel verileriniz üçüncü kişilere satılmaz, pazarlama amacıyla paylaşılmaz ve yurt dışına aktarılmaz. Veriler, sitenin barındırıldığı sunucu hizmet sağlayıcısının altyapısında saklanır. Kanunen yetkili kamu kurum ve kuruluşlarına, mahkemelere ve icra dairelerine mevzuattan doğan yükümlülükler çerçevesinde aktarım yapılabilir.</p>',

  '<h2>Saklama süresi</h2>',
  '<p>Mesajınız, iletilen talebin sonuçlandırılması için gereken süre boyunca saklanır. Avukatlık ilişkisi kurulmayan başvurulara ait kayıtlar, başvurunun niteliğine göre makul süre içinde silinir. Avukatlık ilişkisi kurulması hâlinde dosyaya ilişkin veriler, Avukatlık Kanunu ve ilgili mevzuatın öngördüğü saklama süreleri boyunca muhafaza edilir.</p>',

  '<h2>İlgili kişi olarak haklarınız</h2>',
  '<p>Kanun’un 11. maddesi uyarınca veri sorumlusuna başvurarak şu haklarınızı kullanabilirsiniz:</p>',
  '<ul>',
  '<li>Kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme.</li>',
  '<li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.</li>',
  '<li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme.</li>',
  '<li>Eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme.</li>',
  '<li>Kanun’un 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme.</li>',
  '<li>Düzeltme, silme ve yok edilme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.</li>',
  '<li>Münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme.</li>',
  '<li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>',
  '</ul>',

  '<h2>Başvuru</h2>',
  `<p>Haklarınıza ilişkin taleplerinizi, kimliğinizi tevsik edici bilgilerle birlikte yukarıda belirtilen adrese yazılı olarak veya <a href="mailto:${SEED_SETTINGS.email}">${SEED_SETTINGS.email}</a> adresine e-posta göndererek iletebilirsiniz. Başvurularınız, talebin niteliğine göre en kısa sürede ve her hâlükârda en geç otuz gün içinde sonuçlandırılır.</p>`,

  '<p>Bu metin 27.08.2026 tarihinde güncellenmiştir.</p>',
].join('')

/** Çerez politikası. İçeriği koddan doğrulanarak yazıldı; gerekçe SEED_KVKK_PAGE'de. */
export const SEED_COOKIE_PAGE = [
  '<p>Bu politika, Akil Hukuk Bürosu internet sitesinde çerezlerin nasıl kullanıldığını açıklar.</p>',

  '<h2>Çerez nedir?</h2>',
  '<p>Çerez, ziyaret ettiğiniz internet sitelerinin tarayıcınız aracılığıyla cihazınıza kaydettiği küçük metin dosyasıdır. Çerezler bir sitenin çalışması için gerekli olabileceği gibi, ziyaretçi davranışını ölçmek veya reklam göstermek amacıyla da kullanılabilir.</p>',

  '<h2>Bu sitede hangi çerezler kullanılıyor?</h2>',
  '<p>Bu sitede yalnızca <strong>zorunlu çerezler</strong> kullanılır ve bunların tamamı, büro çalışanlarının kullandığı yönetim paneline aittir. Sitenin halka açık sayfalarını ziyaret ettiğinizde cihazınıza hiçbir çerez kaydedilmez.</p>',
  '<p>Yönetim paneline ait zorunlu çerezler şunlardır:</p>',
  '<ul>',
  '<li><strong>Oturum çerezi.</strong> Panele giriş yapıldığında oluşturulur ve oturumun açık kalmasını sağlar. Çıkış yapıldığında veya oturum süresi dolduğunda geçerliliğini yitirir.</li>',
  '<li><strong>Güvenlik (CSRF) çerezi.</strong> Giriş formunun sahte bir siteden gönderilmesini engellemek için kullanılır; giriş ekranı açıldığında oluşur.</li>',
  '<li><strong>Yönlendirme çerezi.</strong> Giriş tamamlandıktan sonra kullanıcının hangi panel sayfasına döneceğini tutar; giriş ekranı açıldığında oluşur.</li>',
  '</ul>',
  '<p>Sitede <strong>analitik, reklam, pazarlama veya sosyal medya izleme çerezi bulunmamaktadır.</strong> Ziyaretçi davranışını ölçen üçüncü taraf hiçbir hizmet siteye eklenmemiştir; ziyaretiniz üçüncü kişilerle paylaşılmaz.</p>',

  '<h2>Çerezleri yönetmek</h2>',
  '<p>Çerezleri tarayıcınızın ayarlar bölümünden silebilir veya engelleyebilirsiniz. Bu sitedeki çerezlerin tamamı yönetim paneline ait olduğundan, çerezleri engellemeniz sitenin halka açık sayfalarını görüntülemenizi etkilemez; yalnızca panele giriş yapılmasını engeller.</p>',

  '<h2>İletişim</h2>',
  `<p>Çerez kullanımına ilişkin sorularınızı <a href="mailto:${SEED_SETTINGS.email}">${SEED_SETTINGS.email}</a> adresine iletebilirsiniz. Kişisel verilerinizin işlenmesine ilişkin ayrıntılı bilgi için <a href="/kvkk">KVKK Aydınlatma Metni</a> sayfasını inceleyebilirsiniz.</p>`,

  '<p>Bu metin 27.08.2026 tarihinde güncellenmiştir.</p>',
].join('')

/** Makale kategorileri çalışma alanlarıyla aynı kümeden: yazılar bir alana bağlanacak. */
export const SEED_CATEGORIES = SEED_PRACTICE_AREAS.map((area) => ({
  slug: area.slug,
  name: area.name,
}))
