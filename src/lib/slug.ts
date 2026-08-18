// JS'in toLowerCase'i 'İ' harfini birleşik noktalı 'i̇' yapar; bu yüzden Türkçe harfleri
// küçük harfe çevirmeden ÖNCE elle eşliyoruz.
const TR_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
}

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
}
