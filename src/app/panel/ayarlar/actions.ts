'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { updateSettings } from '@/db/queries/settings'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS } from '@/lib/cache-tags'
import { settingsSchema, toFormState, type FormState } from '@/lib/validation'

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('settings')

  const parsed = settingsSchema.safeParse({
    officeName: formData.get('officeName'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    whatsapp: formData.get('whatsapp'),
    kep: formData.get('kep'),
    mapLat: formData.get('mapLat'),
    mapLng: formData.get('mapLng'),
    socialLinks: formData.get('socialLinks'),
    footerText: formData.get('footerText'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // Reklam yasağı taraması BURADA da çalışıyor. Gerekçe: tarama, avukatın yazdığı ve
  // halkın okuduğu düzyazıya uygulanır. Büro adı ve alt bilgi metni sitenin HER sayfasında
  // görünüyor, yani makale özetinden daha geniş bir yüzey — aynı cümle makalede uyarı
  // üretirken alt bilgide hiçbir sürtünme görmemesi tutarsızdı.
  //
  // Koşul yok: ayarların "taslak" durumu yok, kaydetmek doğrudan yayımlamaktır.
  // Adres, telefon, e-posta ve koordinatlar taranmıyor — onlar düzyazı değil, biçimi
  // şemayla sabitlenmiş iletişim verisi.
  const scanned = [parsed.data.officeName, parsed.data.footerText ?? ''].join(' ')
  const matches = findBannedPhrases(scanned)
  const acknowledged = formData.get('adBanAcknowledged') === 'evet'
  if (matches.length > 0 && !acknowledged) {
    // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
    // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse kayıt tamamlanır.
    return { ok: false, errors: {}, warnings: matches.map(formatBannedMatch) }
  }

  // Tablo tek satırlık ve satır tohumla kuruluyor; yoksa updateSettings hiçbir satıra
  // dokunmaz ve getSettings bir sonraki okumada zaten gürültülü biçimde fırlatır.
  await updateSettings(parsed.data)

  // İki argümanlı biçim zorunlu (Next 16.3); Plan 3 okuma tarafını bağlayana kadar etkisiz.
  revalidateTag(TAGS.settings, 'max')
  // Yönlendirme YOK: form aynı sayfada kalıyor ve girilen değerler ekranda duruyor, yani
  // kullanıcı kaydettiği şeyi görmeye devam ediyor. revalidatePath sunucu bileşenini
  // tazeliyor ki bir sonraki yükleme veritabanındaki değeri okusun.
  revalidatePath('/panel/ayarlar')

  return { ok: true, errors: {}, message: 'Ayarlar kaydedildi.' }
}
