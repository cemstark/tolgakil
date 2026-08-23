'use server'

import { headers } from 'next/headers'
import { createMessage } from '@/db/queries/messages'
import { createRateLimiter } from '@/lib/rate-limit'
import { contactSchema, toFormState, type FormState } from '@/lib/validation'

/**
 * İletişim formu server action'ı.
 *
 * Sitenin KİMLİK DOĞRULAMASI OLMAYAN tek yazma yolu. Panelin bütün action'ları
 * `requireAccess(...)` ile başlıyor; burada öyle bir kapı yok, dolayısıyla savunma üç
 * katmanda: şema doğrulaması, hız sınırı ve tuzak alan.
 *
 * E-POSTA GÖNDERMİYOR — bilinçli kapsam kararı. Mesaj veritabanına yazılıyor ve panelin
 * Mesajlar ekranında okunuyor. E-posta iletimi bir SMTP bağımlılığı ve kimlik bilgisi
 * gerektiriyor; onlar sağlandığında bu action'a bir bildirim adımı eklenir. Şu hâliyle
 * hiçbir mesaj KAYBOLMUYOR, yalnız bildirim anlık değil.
 */

// 15 dakikada 3 gönderim. Sınır IP başına: aynı ağdaki iki ziyaretçinin birbirini
// engellemesi teorik olarak mümkün ama bir hukuk bürosunun iletişim formunda gerçek
// gönderim sıklığı bunun çok altında. Süreç belleğinde tutuluyor — birden çok sunucu
// örneğinde her örnek kendi sayacını taşır, yani sınır katı değil YAVAŞLATICI.
const contactLimiter = createRateLimiter({ limit: 3, windowMs: 15 * 60 * 1000 })

// Ters vekil arkasında istemci adresi bu başlıklardan okunuyor. Sıra önemli: X-Forwarded-For
// birden çok adres taşıyabilir (istemci, vekil1, vekil2) ve İLK değer istemcidir.
async function istemciBilgisi(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent')
  return {
    // Sütunlar varchar(45) ve varchar(255): uzun bir başlık INSERT'i düşürmesin diye
    // burada kırpılıyor. Kırpılmış bir tarayıcı imzası, kaybedilmiş bir mesajdan iyidir.
    ip: ip === null ? null : ip.slice(0, 45),
    userAgent: userAgent === null ? null : userAgent.slice(0, 255),
  }
}

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  // Tuzak alan (honeypot): ekranda gizli, gerçek ziyaretçi doldurmaz, basit botlar doldurur.
  // Dolu geldiğinde BAŞARILI görünen bir yanıt dönüyoruz — bota "engellendim" demek, onu
  // formu değiştirip yeniden denemeye iter. Kayıt yapılmıyor.
  if (typeof formData.get('website') === 'string' && formData.get('website') !== '') {
    return { ok: true, errors: {}, message: 'Mesajınız alındı. En kısa sürede dönüş yapılacaktır.' }
  }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    kvkkAccepted: formData.get('kvkkAccepted'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  const { ip, userAgent } = await istemciBilgisi()

  // Hız sınırı doğrulamadan SONRA: geçersiz bir gönderim kotayı yakmasın, kullanıcı formu
  // düzeltip yeniden gönderebilsin. Anahtar IP; adres okunamıyorsa tek bir ortak kovaya
  // düşülüyor — kimliksiz trafiği sınırsız bırakmaktansa hep birlikte yavaşlatmak yeğdir.
  const limit = contactLimiter.record(ip ?? 'bilinmeyen')
  if (!limit.allowed) {
    const dakika = Math.max(1, Math.ceil(limit.retryAfterMs / 60000))
    return {
      ok: false,
      errors: {},
      message: `Çok sayıda gönderim yapıldı. Lütfen ${dakika} dakika sonra tekrar deneyin.`,
    }
  }

  try {
    await createMessage({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
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
    contactLimiter.refund(ip ?? 'bilinmeyen', limit.windowId)
    return {
      ok: false,
      errors: {},
      message: 'Mesaj şu anda kaydedilemedi. Lütfen telefonla ulaşın veya daha sonra tekrar deneyin.',
    }
  }

  // revalidate YOK: mesaj yalnız panelde görünüyor ve panel sayfaları zaten dinamik.
  return { ok: true, errors: {}, message: 'Mesajınız alındı. En kısa sürede dönüş yapılacaktır.' }
}
