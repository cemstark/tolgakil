// Yükleme ve silme bildirimleri TEK bir canlı bölgede gösteriliyor. Gerekçe ölçüldü:
// iki ayrı role="status" bırakıldığında, silmeden sonra bir önceki yüklemenin
// "Görsel yüklendi." bildirimi ekranda asılı kalıyor ve kullanıcı hangi işlemin
// sonucuna baktığını anlayamıyor.
//
// Her iki işlem de yönlendirme yapıyor; mesaj adres üzerinden taşınıyor (makaleler
// bölümündeki save-messages.ts ile aynı desen). Bu dosya 'use server' taşımıyor:
// 'use server' modüllerinden yalnız async fonksiyon dışa aktarılabilir.

export type MediaNotice = { message: string; warning: boolean }

export type MediaNoticeQuery = { yuklendi?: string; silindi?: string; dosya?: string }

export type MediaNoticeState = {
  /**
   * Yükleme formuna verilen React anahtarı. Her işlemde değiştiği için form yeniden
   * kuruluyor: seçili dosya, yazılmış alt metin ve eski alan hataları böylece temizleniyor.
   */
  formKey: string
  notice?: MediaNotice
}

// Adres çubuğundan gelen değer kullanıcı tarafından yazılabilir; tanınmayan değer sessizce
// yok sayılır ve gelen metin ekrana HİÇ basılmaz, uydurma bir mesaj üretilmez.
export function mediaNoticeState(query: MediaNoticeQuery): MediaNoticeState {
  if (query.yuklendi !== undefined && /^[1-9]\d*$/.test(query.yuklendi)) {
    return { formKey: `yuklendi-${query.yuklendi}`, notice: { message: 'Görsel yüklendi.', warning: false } }
  }
  // Silinen kaydın kimliği adreste taşınıyor. Sabit bir "?silindi=1" kullanılsaydı ARDIŞIK
  // ikinci silmede adres değişmez, form yeniden kurulmaz, odaklama effect'i bir daha
  // koşmaz ve metin de aynı kaldığı için canlı bölge duyuru yapmazdı: kullanıcı ikinci
  // silmenin olup olmadığını hiç öğrenemezdi (WCAG 4.1.3 — bu kodun önlemeyi hedeflediği
  // durumun ta kendisi).
  if (query.silindi !== undefined && /^[1-9]\d*$/.test(query.silindi)) {
    const dosyasiz = query.dosya === 'yok'
    return {
      formKey: `silindi-${query.silindi}${dosyasiz ? '-dosyasiz' : ''}`,
      notice: dosyasiz
        ? {
            message: 'Kayıt silindi ancak dosya diskte bulunamadı. Durum sunucu günlüğüne yazıldı.',
            warning: true,
          }
        : { message: 'Görsel silindi.', warning: false },
    }
  }
  return { formKey: 'form' }
}
