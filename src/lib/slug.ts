// JS'in toLowerCase'i 'İ' harfini birleşik noktalı 'i̇' yapar; bu yüzden Türkçe harfleri
// küçük harfe çevirmeden ÖNCE elle eşliyoruz.
const TR_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
}

// Bütün slug sütunları varchar(190) (articles, lawyers, practice_areas, categories —
// şemadan ölçüldü). Kesme burada yapılıyor ki dört şema da tek yerden korunsun.
// Sınır KARAKTER cinsinden güvenli: çıktı bu noktada yalnız [a-z0-9-], yani her
// karakter UTF-8'de bir bayt.
//
// Neden gerekli: articles.title 220 karaktere kadar geçerli. Kesme olmadan uzun bir
// başlık STRICT_TRANS_TABLES altında "Data too long" fırlatır; sunucu hata sayfası
// döner ve kullanıcının yazdığı metin kaydedilemeden kaybolur.
export const SLUG_MAX_LENGTH = 190

export function slugify(input: string): string {
  return input
    // Sınıf ile TR_MAP ayrı yerlerde durduğu için biri güncellenip diğeri unutulursa
    // eşleme undefined döner; ?? ch harfi bozmadan geçirir.
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    // Kesme bir kelimenin ortasına ya da tam tireye denk gelebilir; sonda tire bırakmak
    // hem adresi çirkinleştirir hem iki başlığı gereksizce aynı slug'a düşürür.
    .replace(/-+$/, '')
}
