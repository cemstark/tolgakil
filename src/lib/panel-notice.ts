/**
 * Liste sayfalarının bildirim durumu.
 *
 * Kaydetme ve silme yönlendirme yapıyor, bu yüzden bildirim adres üzerinden taşınıyor
 * (bkz. makaleler/save-messages.ts ve medya/notices.ts ile aynı desen). Bu dosya
 * 'use server' TAŞIMIYOR: 'use server' modüllerinden yalnız async fonksiyon dışa aktarılabilir.
 */

export type PanelNoticeQuery = { kaydedildi?: string; silindi?: string }

export type PanelNoticeState = {
  /**
   * Bildirim öğesine verilen React anahtarı. Her işlemde DEĞİŞMEK zorunda: sabit bir
   * "?silindi=1" kullanılsaydı ardışık ikinci silmede adres değişmez, öğe yeniden
   * kurulmaz, odaklama effect'i bir daha koşmaz ve metin de aynı kaldığı için canlı bölge
   * duyuru yapmazdı — kullanıcı ikinci silmenin olup olmadığını hiç öğrenemezdi
   * (WCAG 4.1.3; Görev 6'da ölçüldü).
   */
  key: string
  message?: string
}

export type PanelNoticeMessages = { saved: string; deleted: string }

// Adres çubuğundan gelen değer kullanıcı tarafından yazılabilir; tanınmayan değer sessizce
// yok sayılır ve gelen metin ekrana HİÇ basılmaz, uydurma bir mesaj üretilmez.
function tanindi(value: string | undefined): boolean {
  return value !== undefined && /^[1-9]\d*$/.test(value)
}

export function panelNoticeState(query: PanelNoticeQuery, messages: PanelNoticeMessages): PanelNoticeState {
  if (tanindi(query.kaydedildi)) return { key: `kaydedildi-${query.kaydedildi}`, message: messages.saved }
  if (tanindi(query.silindi)) return { key: `silindi-${query.silindi}`, message: messages.deleted }
  return { key: 'bildirimsiz' }
}

/**
 * Düzenleme sayfasına yönlendirmeyle taşınan kayıt bildirimi.
 *
 * Liste bildiriminden ayrı: düzenleme formu yeniden kurulmadığı için anahtara ihtiyaç yok,
 * mesaj doğrudan `EntityForm`'un `initialMessage` girdisine gidiyor.
 */
export function savedMessage(value: string | undefined, message: string): string | undefined {
  return tanindi(value) ? message : undefined
}
