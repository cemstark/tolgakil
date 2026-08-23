import { describe, expect, it } from 'vitest'
import {
  ARTICLE_CONTENT_MAX_BYTES, articleContentLengthError, articleSchema, byteLength,
  categorySchema, contactSchema, lawyerSchema, loginSchema, settingsSchema, toFormState,
  userCreateSchema, userUpdateSchema,
} from '@/lib/validation'

const gecerliAvukat = { slug: '', fullName: 'Tolga Akil', title: 'Avukat' }

const gecerliAyarlar = {
  officeName: 'Akil Hukuk Bürosu',
  address: 'Örnek Mah. Örnek Cad. No: 1, Kadıköy / İstanbul',
  phone: '+90 216 000 00 00',
  email: 'info@example.com',
  whatsapp: '',
  kep: '',
  mapLat: '',
  mapLng: '',
  socialLinks: '',
  footerText: '',
}

const gecerliMakale = {
  title: 'İşe iade davasında süre koşulu',
  slug: '',
  excerpt: 'Bir aylık hak düşürücü süre üzerine not.',
  content: '<p>Gövde</p>',
  status: 'draft' as const,
  categoryId: '3',
  authorId: '',
}

describe('articleContentLengthError', () => {
  it('sınırın altındaki içeriği geçirir', () => {
    expect(articleContentLengthError('<p>Kısa gövde</p>')).toBeNull()
  })

  it('tam sınırdaki içeriği geçirir', () => {
    expect(articleContentLengthError('a'.repeat(ARTICLE_CONTENT_MAX_BYTES))).toBeNull()
  })

  it('sınırı aşan içeriği Türkçe mesajla reddeder', () => {
    const mesaj = articleContentLengthError('a'.repeat(ARTICLE_CONTENT_MAX_BYTES + 1))
    expect(mesaj).toContain('İçerik çok uzun')
    expect(mesaj).toContain(String(ARTICLE_CONTENT_MAX_BYTES + 1))
  })

  // Asıl tuzak: karakter sayan bir kontrol bunu geçirir, veritabanı geçirmez.
  it('Türkçe harfleri iki bayt sayar', () => {
    expect(byteLength('ş')).toBe(2)
    const yariUzunluk = ARTICLE_CONTENT_MAX_BYTES / 2 + 1
    expect(articleContentLengthError('ş'.repeat(yariUzunluk))).not.toBeNull()
  })
})

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
    expect(toFormState(sonuc.error!).errors.slug).toContain(
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
    expect(toFormState(sonuc.error!).errors.categoryId).toContain('Yayımlamak için kategori seçin.')
  })

  it('taslakta kategori boş bırakılabilir', () => {
    const sonuc = articleSchema.safeParse({ ...gecerliMakale, categoryId: '' })
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.categoryId).toBeNull()
  })

  // Kimlikler autoincrement; negatif veya üstel gösterimli değer var olmayan satıra
  // referans üretip kullanıcıya 500 gösterirdi.
  it('negatif ve üstel gösterimli kimliği reddeder', () => {
    for (const categoryId of ['-5', '3e2', '1.5']) {
      const sonuc = articleSchema.safeParse({ ...gecerliMakale, categoryId })
      expect(sonuc.success, `categoryId=${categoryId} kabul edilmemeliydi`).toBe(false)
    }
  })

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
})

describe('slug üretilemediğinde gösterilen alan adı', () => {
  it('avukat formunda "ad soyad" alanını işaret eder', () => {
    const sonuc = lawyerSchema.safeParse({ slug: '', fullName: '!!! ???', title: 'Avukat' })
    expect(toFormState(sonuc.error!).errors.slug).toContain(
      'Ad soyad alanından adres üretilemedi; slug alanını elle doldurun.',
    )
  })

  it('kategori formunda "kategori adı" alanını işaret eder', () => {
    const sonuc = categorySchema.safeParse({ slug: '', name: '!!! ???' })
    expect(toFormState(sonuc.error!).errors.slug).toContain(
      'Kategori adından adres üretilemedi; slug alanını elle doldurun.',
    )
  })
})

describe('onay kutusu', () => {
  // <input type="checkbox"> value yazılmazsa tarayıcı 'on' gönderir; yalnız 'evet' aransaydı
  // kullanıcı kutuyu işaretler, "Kaydedildi" görür ama kayıt yayına girmezdi.
  it('tarayıcının varsayılan "on" değerini de işaretli sayar', () => {
    expect(lawyerSchema.safeParse({ slug: '', fullName: 'Tolga Akil', title: 'Avukat', isPublished: 'on' }).data?.isPublished).toBe(true)
    expect(lawyerSchema.safeParse({ slug: '', fullName: 'Tolga Akil', title: 'Avukat', isPublished: 'evet' }).data?.isPublished).toBe(true)
  })

  it('alan hiç gönderilmezse işaretsiz sayar', () => {
    expect(userUpdateSchema.safeParse({ role: 'editor', password: '' }).data?.isActive).toBe(false)
  })

  // Görev 7'de ölçüldü: server action'lar alanları `formData.get(...)` ile okuyor ve o
  // çağrı bulunmayan alan için `undefined` DEĞİL **null** döndürüyor. Şema yalnız
  // `optional` olduğunda kutuyu işaretlemeden kaydeden kullanıcı, hiçbir alana
  // bağlanamayan bir "beklenen string" hatası alıyordu: ekranda hiçbir şey görünmüyor,
  // kayıt da yapılmıyordu. Bu iddia gerçek çağrı biçimini ölçüyor.
  it('formData.get sonucu olan null değeri işaretsiz sayar', () => {
    const veri = new FormData()
    veri.set('role', 'editor')
    veri.set('password', '')
    const sonuc = userUpdateSchema.safeParse({
      role: veri.get('role'),
      isActive: veri.get('isActive'),
      password: veri.get('password'),
    })
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.isActive).toBe(false)

    const avukat = lawyerSchema.safeParse({ ...gecerliAvukat, isPublished: null })
    expect(avukat.success).toBe(true)
    expect(avukat.data?.isPublished).toBe(false)
  })

  // Aynı tuzak isteğe bağlı metin, tarih ve sıra alanlarında da vardı.
  it('gönderilmeyen isteğe bağlı alanlar null değerle de çözülür', () => {
    const sonuc = lawyerSchema.safeParse({
      ...gecerliAvukat, barAssociation: null, practiceStartDate: null, email: null, sortOrder: null,
    })
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.barAssociation).toBeNull()
    expect(sonuc.data?.sortOrder).toBe(0)
  })

  // Aynı tuzağın son iki örneği: harita koordinatları ve düzenlemedeki parola alanı.
  it('gönderilmeyen koordinat ve parola alanları null değerle de çözülür', () => {
    const ayarlar = settingsSchema.safeParse({ ...gecerliAyarlar, mapLat: null, mapLng: null })
    expect(ayarlar.success).toBe(true)
    expect(ayarlar.data?.mapLat).toBeNull()

    const kullanici = userUpdateSchema.safeParse({ role: 'editor', isActive: null, password: null })
    expect(kullanici.success).toBe(true)
    // Çıktı tipi `string` kalmalı: çağıran "boşsa mevcut özeti koru" kararını `=== ''` ile veriyor.
    expect(kullanici.data?.password).toBe('')
  })
})

describe('hata mesajları', () => {
  // Global kısıt: kullanıcıya giden her mesaj Türkçe. Özel mesaj verilmeyen kurallarda
  // (eksik alan, bilinmeyen enum) zod'un varsayılanı İngilizce üretiyordu.
  it('özel mesaj verilmeyen kurallarda da Türkçe döner', () => {
    const eksikAlan = loginSchema.safeParse({})
    const bilinmeyenRol = userCreateSchema.safeParse({
      username: 'yeni-kullanici', name: 'Yeni Kullanıcı', password: 'yeterince-uzun-parola', role: 'superadmin',
    })
    const mesajlar = [...eksikAlan.error!.issues, ...bilinmeyenRol.error!.issues].map((i) => i.message)
    expect(mesajlar.length).toBeGreaterThan(0)
    for (const mesaj of mesajlar) {
      expect(mesaj, `İngilizce mesaj sızdı: ${mesaj}`).not.toMatch(/Invalid|expected|received/)
    }
  })

  // z.flattenError path'i olmayan hataları fieldErrors'a DEĞİL formErrors'a koyuyor.
  // Yalnız alan hatalarına bakan bir çağıran onları yutar: kullanıcı "Kaydet"e basar,
  // hiçbir alanda uyarı çıkmaz ve hiçbir şey olmaz. toFormState mesaja taşıyor.
  it('alana bağlanamayan hata yutulmaz, mesaja taşınır', () => {
    const sonuc = articleSchema.safeParse('form verisi değil')
    const durum = toFormState(sonuc.error!)
    expect(durum.errors).toEqual({})
    expect(durum.message).toBeTruthy()
    expect(durum.ok).toBe(false)
  })
})

describe('lawyerSchema isteğe bağlı alanları', () => {
  // Bu alanlar formda boş bırakılabiliyor, sütunlar ise NULL bekliyor. Boş dize yazılsaydı
  // "baro girilmedi" ile "baro boş yazıldı" ayırt edilemezdi.
  it('boş bırakılan alanları null yapar', () => {
    const sonuc = lawyerSchema.safeParse({
      ...gecerliAvukat, barAssociation: '', barRegistryNo: '', practiceStartDate: '', email: '', sortOrder: '',
    })
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.barAssociation).toBeNull()
    expect(sonuc.data?.practiceStartDate).toBeNull()
    expect(sonuc.data?.email).toBeNull()
    // Sütun NOT NULL DEFAULT 0; boş sıra null değil sıfır olmalı.
    expect(sonuc.data?.sortOrder).toBe(0)
  })

  it('mesleğe başlama tarihini olduğu gibi saklar', () => {
    // Sütun mode: 'string'; dize hiç Date'e çevrilmediği için gün kayması yolu yok.
    expect(lawyerSchema.safeParse({ ...gecerliAvukat, practiceStartDate: '2010-03-15' }).data?.practiceStartDate)
      .toBe('2010-03-15')
  })

  // Desene uyan ama takvimde olmayan gün: MariaDB STRICT_TRANS_TABLES altında satırı
  // reddeder ve kullanıcı formda değil hata sayfasında karşılanırdı.
  it('takvimde olmayan günü reddeder', () => {
    const sonuc = lawyerSchema.safeParse({ ...gecerliAvukat, practiceStartDate: '2026-02-31' })
    expect(sonuc.success).toBe(false)
    expect(toFormState(sonuc.error!).errors.practiceStartDate).toContain('Tarihi GG.AA.YYYY takvim günü olarak seçin.')
  })

  it('geçersiz e-postayı reddeder ama boş bırakılmasına izin verir', () => {
    expect(lawyerSchema.safeParse({ ...gecerliAvukat, email: 'bu-bir-eposta-degil' }).success).toBe(false)
    expect(lawyerSchema.safeParse({ ...gecerliAvukat, email: 'avukat@ornek.test' }).data?.email).toBe('avukat@ornek.test')
  })

  it('negatif ve ondalık sırayı reddeder', () => {
    for (const deger of ['-1', '1.5', 'iki', '12345']) {
      expect(lawyerSchema.safeParse({ ...gecerliAvukat, sortOrder: deger }).success, `sortOrder=${deger}`).toBe(false)
    }
    expect(lawyerSchema.safeParse({ ...gecerliAvukat, sortOrder: '7' }).data?.sortOrder).toBe(7)
  })
})

describe('settingsSchema', () => {
  it('harita koordinatları boş bırakılabilir', () => {
    const sonuc = settingsSchema.safeParse(gecerliAyarlar)
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.mapLat).toBeNull()
  })

  it('sayı olmayan koordinatı reddeder', () => {
    const sonuc = settingsSchema.safeParse({ ...gecerliAyarlar, mapLat: 'kuzey' })
    expect(toFormState(sonuc.error!).errors.mapLat).toContain('Koordinat sayı olmalı.')
  })

  it('geçersiz e-postayı Türkçe mesajla reddeder', () => {
    const sonuc = settingsSchema.safeParse({ ...gecerliAyarlar, email: 'bu-bir-eposta-degil' })
    expect(toFormState(sonuc.error!).errors.email).toContain('Geçerli bir e-posta adresi girin.')
  })

  // Alt bilgi metni sütunu varchar(500); sınırı aşan değer STRICT_TRANS_TABLES altında
  // "Data too long" fırlatır ve kullanıcı hata sayfası görürdü.
  it('sütuna sığmayan alt bilgi metnini alan hatasıyla reddeder', () => {
    const sonuc = settingsSchema.safeParse({ ...gecerliAyarlar, footerText: 'a'.repeat(501) })
    expect(toFormState(sonuc.error!).errors.footerText).toContain('Alt bilgi metni en fazla 500 karakter olabilir.')
  })
})

// Kullanıcı adı kuralı iki şemadan da geçiyor (loginSchema, userCreateSchema); her ikisi
// de lib/username.ts'teki tek deseni kullanıyor. Kabul edilen ve reddedilen örnekler AYRI
// AYRI iddia ediliyor: tek bir toplu döngü, hangi sınıfın kaçtığını gizlerdi.
describe('kullanıcı adı biçimi', () => {
  function girisSonucu(username: unknown) {
    return loginSchema.safeParse({ username, password: 'parola-uzun-1' })
  }

  it('sade küçük harfli adı kabul eder', () => {
    expect(girisSonucu('admin').success).toBe(true)
  })

  it('rakam, nokta, alt çizgi ve tireyi kabul eder', () => {
    expect(girisSonucu('a.v_2-x9').success).toBe(true)
  })

  it('baştaki ve sondaki boşluğu kırpar', () => {
    expect(girisSonucu('  admin  ').data?.username).toBe('admin')
  })

  it('büyük harfi reddeder', () => {
    // Sessizce küçük harfe çevrilmiyor: "Admin" kaydedilip "admin" diye aranırsa
    // kullanıcı hiçbir açıklama görmeden "parola hatalı" duvarına çarpar.
    expect(girisSonucu('Admin').success).toBe(false)
  })

  it('Türkçe harfi reddeder', () => {
    // Asıl gerekçe: 'I'.toLocaleLowerCase('tr') === 'ı' ve 'İ'.toLowerCase() iki kod
    // birimine açılıyor; kümeyi ASCII'ye kısmak bu sınıfı tümüyle kapatıyor.
    expect(girisSonucu('şükrü').success).toBe(false)
  })

  it('araya giren boşluğu reddeder', () => {
    expect(girisSonucu('buro yonetici').success).toBe(false)
  })

  it('e-posta biçimli değeri reddeder', () => {
    // "@" kümede yok; eski e-posta kimlikleriyle giriş denemesi burada duruyor.
    expect(girisSonucu('admin@ornek.test').success).toBe(false)
  })

  it('çok kısa adı reddeder', () => {
    expect(girisSonucu('ab').success).toBe(false)
  })

  it('çok uzun adı reddeder', () => {
    expect(girisSonucu('a'.repeat(61)).success).toBe(false)
  })

  it('tam sınırdaki uzunlukları kabul eder', () => {
    expect(girisSonucu('abc').success).toBe(true)
    expect(girisSonucu('a'.repeat(60)).success).toBe(true)
  })

  it('neyin kabul edildiğini söyleyen Türkçe mesaj döner', () => {
    // "Geçersiz" demekle yetinen bir mesaj kullanıcıyı çıkmaza sokar.
    const mesaj = toFormState(girisSonucu('Admin').error!).errors.username?.join(' ')
    expect(mesaj).toContain('3-60 karakter')
    expect(mesaj).toContain('küçük İngiliz harfleri (a-z)')
  })

  it('aynı kural kullanıcı oluşturma şemasında da geçerli', () => {
    const sonuc = userCreateSchema.safeParse({
      username: 'Yeni Kullanıcı', name: 'Yeni Kullanıcı', password: 'yeterince-uzun-parola', role: 'editor',
    })
    expect(toFormState(sonuc.error!).errors.username?.join(' ')).toContain('3-60 karakter')
  })
})

describe('loginSchema', () => {
  it('boş parolayı reddeder', () => {
    const sonuc = loginSchema.safeParse({ username: 'admin', password: '' })
    expect(toFormState(sonuc.error!).errors.password).toContain('Parola zorunlu.')
  })
})

describe('userCreateSchema', () => {
  it('kısa parolayı reddeder', () => {
    const sonuc = userCreateSchema.safeParse({
      username: 'yeni-kullanici', name: 'Yeni Kullanıcı', password: 'kisa', role: 'editor',
    })
    expect(toFormState(sonuc.error!).errors.password).toContain('Parola en az 12 karakter olmalı.')
  })

  it('bilinmeyen rolü reddeder', () => {
    const sonuc = userCreateSchema.safeParse({
      username: 'yeni-kullanici', name: 'Yeni Kullanıcı', password: 'yeterince-uzun-parola', role: 'superadmin',
    })
    expect(sonuc.success).toBe(false)
  })
})

/**
 * İletişim formu şeması.
 *
 * Denetimde yakalandı: bu şema ve onu kullanan server action, sitenin KİMLİK DOĞRULAMASI
 * OLMAYAN tek yazma yolu olmasına rağmen hiç test edilmiyordu. Aşağıdaki durumlar o
 * boşluğu kapatıyor — özellikle sütun sınırları (aşan bir değer INSERT'i düşürürdü) ve
 * KVKK onayının atlanamazlığı.
 */
describe('contactSchema', () => {
  const gecerli = {
    name: 'Deneme Ziyaretçi',
    email: 'ziyaretci@ornek.com',
    phone: '0532 111 22 33',
    subject: 'Kira sözleşmesi hakkında',
    body: 'Kiracı olduğum işyeri için kira bedelinin belirlenmesi konusunda görüşmek istiyorum.',
    kvkkAccepted: 'evet',
  }

  it('geçerli gönderimi kabul eder', () => {
    const sonuc = contactSchema.safeParse(gecerli)
    expect(sonuc.success).toBe(true)
    expect(sonuc.data?.name).toBe('Deneme Ziyaretçi')
  })

  it('KVKK onayı işaretlenmemişse reddeder', () => {
    // İşaretlenmemiş kutu FormData'ya hiç girmez; FormData.get() null döndürür.
    const sonuc = contactSchema.safeParse({ ...gecerli, kvkkAccepted: null })
    expect(sonuc.success).toBe(false)
    expect(toFormState(sonuc.error!).errors.kvkkAccepted?.[0]).toContain('onaylamalısınız')
  })

  it('telefon isteğe bağlı; boş bırakılınca null olur', () => {
    expect(contactSchema.safeParse({ ...gecerli, phone: '' }).data?.phone).toBeNull()
    expect(contactSchema.safeParse({ ...gecerli, phone: null }).data?.phone).toBeNull()
  })

  it('çok kısa mesajı reddeder', () => {
    const sonuc = contactSchema.safeParse({ ...gecerli, body: 'Merhaba' })
    expect(sonuc.success).toBe(false)
    expect(toFormState(sonuc.error!).errors.body?.[0]).toContain('en az 20 karakter')
  })

  it('geçersiz e-posta biçimini reddeder', () => {
    expect(contactSchema.safeParse({ ...gecerli, email: 'ornek.com' }).success).toBe(false)
  })

  // Sütun genişlikleri: name 160, email 190, phone 40, subject 220 (bkz. db/schema.ts).
  // Şema sınırı sütunu AŞAMAZ — aşarsa INSERT çalışma anında düşer ve ziyaretçi mesajını
  // kaybeder. Sınırlar burada kilitleniyor.
  it('sütun genişliğini aşan değerleri reddeder', () => {
    expect(contactSchema.safeParse({ ...gecerli, name: 'a'.repeat(161) }).success).toBe(false)
    expect(contactSchema.safeParse({ ...gecerli, subject: 'a'.repeat(221) }).success).toBe(false)
    expect(contactSchema.safeParse({ ...gecerli, phone: '1'.repeat(41) }).success).toBe(false)
    expect(contactSchema.safeParse({ ...gecerli, body: 'a'.repeat(5001) }).success).toBe(false)
  })

  it('sınır değerleri kabul eder', () => {
    expect(contactSchema.safeParse({ ...gecerli, name: 'a'.repeat(160) }).success).toBe(true)
    expect(contactSchema.safeParse({ ...gecerli, subject: 'a'.repeat(220) }).success).toBe(true)
    expect(contactSchema.safeParse({ ...gecerli, body: 'a'.repeat(5000) }).success).toBe(true)
  })

  it('baştaki ve sondaki boşlukları kırpar', () => {
    const sonuc = contactSchema.safeParse({ ...gecerli, name: '  Deneme  ', subject: '  Konu  ' })
    expect(sonuc.data?.name).toBe('Deneme')
    expect(sonuc.data?.subject).toBe('Konu')
  })
})
