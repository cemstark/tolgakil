'use server'

import { headers } from 'next/headers'
import { createMessage } from '@/db/queries/messages'
import { createRateLimiter } from '@/lib/rate-limit'
import { contactSchema, toFormState, type FormState } from '@/lib/validation'

/**
 * İletişim formu server action'ı.
 *
 * Sitenin KİMLİK DOĞRULAMASI OLMAYAN tek yazma yolu. Panelin bütün action'ları
 * `requireAccess(...)` ile başlıyor; burada öyle bir kapı yok.
 *
 * E-POSTA GÖNDERMİYOR — bilinçli kapsam kararı. Mesaj veritabanına yazılıyor ve panelin
 * Mesajlar ekranında okunuyor. E-posta iletimi bir SMTP bağımlılığı ve kimlik bilgisi
 * gerektiriyor; onlar sağlandığında buraya bir bildirim adımı eklenir. Şu hâliyle hiçbir
 * mesaj KAYBOLMUYOR, ama bildirim de anlık değil: panele bakılmadıkça mesaj görülmez.
 */

/**
 * HIZ SINIRI ANAHTARI: e-posta, IP DEĞİL.
 *
 * İlk sürümde IP anahtarlanmıştı ve bu projenin kendi bağlayıcı kısıtını çiğniyordu
 * (`.superpowers/.../global-kisitlar.md:122`): "Giriş hız sınırı e-posta anahtarlıdır, IP
 * değil. `x-forwarded-for`'un ilk girdisi istemci tarafından yazılabildiği için bilinçli
 * olarak kullanılmıyor." Denetimde yakalandı.
 *
 * Somut sonucu şuydu: saldırgan her istekte `X-Forwarded-For: <rastgele>` göndererek sınırı
 * tümüyle atlıyor, üstelik her sahte değer sayaç tablosunda yeni bir giriş açıyordu.
 * Süpürücü pencere başına en fazla bir kez koştuğu için (rate-limit.ts:31) o 15 dakika
 * boyunca hiçbir giriş temizlenmiyor, tablo sınırsız büyüyordu.
 *
 * E-posta da sahte olabilir; tek başına yeterli değil. Bu yüzden ikinci bir katman var:
 * anahtarsız KÜRESEL tavan. Tek anahtar kullandığı için belleği sabit — sahte değerlerle
 * şişirilemez — ve toplu gönderimde son durak. Değeri bilerek yüksek: gerçek bir büronun
 * günlük başvuru sayısının çok üstünde, yani meşru ziyaretçiyi engellemez.
 */
const epostaBasinaLimit = createRateLimiter({ limit: 3, windowMs: 15 * 60 * 1000 })
const kureselLimit = createRateLimiter({ limit: 40, windowMs: 60 * 60 * 1000 })
const KURESEL_ANAHTAR = 'iletisim-formu'

/**
 * İstemci bilgisi — YALNIZ kayıt için, hız sınırı için DEĞİL.
 *
 * Değerler güvenilmez (yukarıdaki not) ve bu yüzden hiçbir karar bunlara dayanmıyor;
 * yalnız kötüye kullanım incelemesinde bir iz bırakıyorlar. Okunamadıklarında uydurma bir
 * değer yazılmıyor, sütunlar nullable.
 */
async function istemciBilgisi(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent')
  return {
    // Sütunlar varchar(45) ve varchar(255): uzun bir başlık INSERT'i düşürmesin diye
    // kırpılıyor. Kırpılmış bir tarayıcı imzası, kaybedilmiş bir mesajdan iyidir.
    ip: ip === null ? null : ip.slice(0, 45),
    userAgent: userAgent === null ? null : userAgent.slice(0, 255),
  }
}

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    kvkkAccepted: formData.get('kvkkAccepted'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur (Görev 1-2 sözleşmesi).
  //
  // `values` BURADA DA dönmek zorunda ve bu en kritik yol: doğrulama hatası, ziyaretçinin
  // en sık karşılaşacağı durum (onay kutusunu unutmak, kısa mesaj yazmak). İlk düzeltmede
  // yalnız hız sınırı ve veritabanı hatası yollarına eklenmişti; e2e testi tam bu boşluğu
  // yakaladı — form yine boşalıyordu. Değerler HAM FormData'dan alınıyor, `parsed.data`dan
  // değil: doğrulama düştüğünde `parsed.data` yok, üstelik kullanıcının yazdığı metin
  // kırpılmamış hâliyle geri yazılmalı.
  if (!parsed.success) return { ...toFormState(parsed.error), values: formDegerleri(formData) }

  /**
   * Tuzak alan (honeypot): ekranda gizli, gerçek ziyaretçi doldurmaz, basit botlar doldurur.
   *
   * Dolu geldiğinde mesaj yine de KAYDEDİLİYOR, yalnız konusu işaretleniyor. İlk sürüm
   * sessizce "başarılı" dönüp kaydı ATIYORDU; denetimde şu senaryoyla yakalandı: parola
   * yöneticisi veya tarayıcının adres profili gizli alanı doldurur (`autocomplete="off"`
   * Chrome'un profil tabanlı doldurmasında güvenilir biçimde dinlenmiyor), ziyaretçi
   * "Mesajınız alındı" görür, mesaj hiçbir yere gitmez. Bir hukuk bürosunda bu, süreye
   * bağlı bir başvurunun sessizce kaybı demek.
   *
   * Bot gürültüsünü panelde ayıklamak, gerçek bir başvuruyu kaybetmekten çok daha ucuz.
   */
  const tuzak = formData.get('website')
  const supheli = typeof tuzak === 'string' && tuzak.trim() !== ''
  // Önek sütun sınırını (220) aşmasın: konu şemada en fazla 220 karakter ve önek 11 karakter.
  const subject = supheli ? `[şüpheli] ${parsed.data.subject}`.slice(0, 220) : parsed.data.subject

  // Sınırlar doğrulamadan SONRA: geçersiz bir gönderim kotayı yakmasın, kullanıcı formu
  // düzeltip yeniden gönderebilsin.
  const kuresel = kureselLimit.record(KURESEL_ANAHTAR)
  if (!kuresel.allowed) {
    return {
      ok: false,
      errors: {},
      message: 'Form şu anda yoğun. Lütfen daha sonra tekrar deneyin veya telefonla ulaşın.',
      values: girilenler(parsed.data),
    }
  }

  const epostaBasina = epostaBasinaLimit.record(parsed.data.email.toLowerCase())
  if (!epostaBasina.allowed) {
    const dakika = Math.max(1, Math.ceil(epostaBasina.retryAfterMs / 60000))
    // Küresel kota bu gönderim için harcanmasın: reddin sebebi tekil kullanıcının sıklığı.
    kureselLimit.refund(KURESEL_ANAHTAR, kuresel.windowId)
    return {
      ok: false,
      errors: {},
      message: `Bu e-posta adresinden çok sayıda gönderim yapıldı. Lütfen ${dakika} dakika sonra tekrar deneyin.`,
      values: girilenler(parsed.data),
    }
  }

  const { ip, userAgent } = await istemciBilgisi()

  try {
    await createMessage({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject,
      body: parsed.data.body,
      // Onay anı kaydediliyor: KVKK açık rızasının NE ZAMAN verildiği, rızanın kendisi
      // kadar önemli. Şema bu sütunu tam bu amaçla taşıyor.
      kvkkAcceptedAt: new Date(),
      ip,
      userAgent,
    })
  } catch (error) {
    // Hata YUTULMUYOR: sunucu günlüğüne düşüyor. Ziyaretçiye teknik ayrıntı verilmiyor ama
    // "gönderildi" de DENMİYOR — yazma başarısızken başarı göstermek, kullanıcının yanıt
    // beklemesine ve mesajın sessizce kaybolmasına yol açar.
    console.error('İletişim mesajı kaydedilemedi:', error)
    // Başarısız gönderim kotayı yakmasın: hata kullanıcının değil sistemin.
    kureselLimit.refund(KURESEL_ANAHTAR, kuresel.windowId)
    epostaBasinaLimit.refund(parsed.data.email.toLowerCase(), epostaBasina.windowId)
    return {
      ok: false,
      errors: {},
      message: 'Mesaj şu anda kaydedilemedi. Lütfen telefonla ulaşın veya daha sonra tekrar deneyin.',
      values: girilenler(parsed.data),
    }
  }

  // revalidate YOK: mesaj yalnız panelde görünüyor ve panel sayfaları zaten dinamik.
  // Başarıda `values` DÖNMÜYOR: form temizlenmeli, aksi hâlde kullanıcı gönderdiği metni
  // ekranda görüp gönderilmediğini sanır.
  return { ok: true, errors: {}, message: 'Mesajınız alındı. En kısa sürede dönüş yapılacaktır.' }
}

/**
 * Hata durumunda forma geri yazılacak değerler.
 *
 * React 19'da `<form action={fn}>` ile gönderilen kontrolsüz form, eylem çalışmadan ÖNCE
 * otomatik sıfırlanıyor (react-dom kaynağında `requestFormReset`). Bu değerler geri
 * verilmezse, KVKK kutusunu işaretlemeyi unutan bir ziyaretçi yazdığı her şeyi kaybediyordu
 * — denetimde yakalandı. Onay kutusu bilerek YOK: rıza her gönderimde bilinçli olarak
 * yeniden verilmeli.
 */
function formDegerleri(formData: FormData): Record<string, string> {
  const al = (ad: string): string => {
    const deger = formData.get(ad)
    // Dosya girdisi veya eksik alan boş dizeye indirgeniyor: forma yazılacak değer daima metin.
    return typeof deger === 'string' ? deger : ''
  }
  return {
    name: al('name'),
    email: al('email'),
    phone: al('phone'),
    subject: al('subject'),
    body: al('body'),
  }
}

function girilenler(data: { name: string; email: string; phone: string | null; subject: string; body: string }) {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone ?? '',
    subject: data.subject,
    body: data.body,
  }
}
