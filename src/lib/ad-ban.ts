// TBB Reklam Yasağı Yönetmeliği (spec §2.1) sitede bulunmayacak ifadeleri sayıyor. Bu liste
// hukuki denetim yerine geçmez ve YAYINI ENGELLEMEZ: meşru bir hukuk makalesi "ücret" veya
// "uzman görüşü" kelimesini teknik anlamda geçirebilir. Amaç yazara sürtünme yaratmak.
// Liste yalnızca burada tutulur; başka dosyaya kopyalanmaz.
const BANNED_PHRASES = [
  'uzman', 'en iyi', 'en başarılı', 'lider', 'başarı oran', 'kazanılmış dava',
  'müvekkil yorum', 'referans', 'yıldız', 'ücretsiz', 'ücret', 'fiyat', 'garanti',
  'kesin sonuç', 'hemen ara', 'indirim',
] as const

const CONTEXT_RADIUS = 30

export type BannedMatch = { phrase: string; index: number; context: string }

function buildContext(text: string, index: number, length: number): string {
  const start = Math.max(0, index - CONTEXT_RADIUS)
  const end = Math.min(text.length, index + length + CONTEXT_RADIUS)
  const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return `${start > 0 ? '…' : ''}${snippet}${end < text.length ? '…' : ''}`
}

export function findBannedPhrases(text: string): BannedMatch[] {
  // toLocaleLowerCase('tr') Türk alfabesinde uzunluğu korur (İ→i, I→ı); düz toLowerCase
  // 'İ' harfini iki karaktere açar ve bulunan konumu özgün metinden kaydırır.
  const normalized = text.toLocaleLowerCase('tr')
  // Aynı konumda birden çok kalem eşleşebilir ("Ücretsiz" hem 'ücretsiz' hem 'ücret'
  // kalemini tetikler); yazara aynı yeri iki kez göstermemek için konum başına en uzun
  // ifade tutuluyor — kısa olan zaten uzununun içinde.
  const bestAtIndex = new Map<number, BannedMatch>()

  for (const phrase of BANNED_PHRASES) {
    let from = 0
    for (;;) {
      const index = normalized.indexOf(phrase, from)
      if (index === -1) break
      const current = bestAtIndex.get(index)
      if (!current || phrase.length > current.phrase.length) {
        bestAtIndex.set(index, { phrase, index, context: buildContext(text, index, phrase.length) })
      }
      from = index + phrase.length
    }
  }

  return [...bestAtIndex.values()].sort((a, b) => a.index - b.index)
}

export function formatBannedMatch(match: BannedMatch): string {
  // index 0 tabanlı; kullanıcıya 1 tabanlı gösteriliyor ki metin düzenleyicideki konumla
  // örtüşsün. BannedMatch.index ham hâliyle kalıyor — dilimleme onu kullanıyor.
  return `“${match.phrase}” (${match.index + 1}. karakter): ${match.context}`
}
