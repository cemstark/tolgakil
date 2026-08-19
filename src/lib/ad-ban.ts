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
  const matches: BannedMatch[] = []

  for (const phrase of BANNED_PHRASES) {
    let from = 0
    for (;;) {
      const index = normalized.indexOf(phrase, from)
      if (index === -1) break
      matches.push({ phrase, index, context: buildContext(text, index, phrase.length) })
      from = index + phrase.length
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}

export function formatBannedMatch(match: BannedMatch): string {
  return `“${match.phrase}” (${match.index}. karakter): ${match.context}`
}
