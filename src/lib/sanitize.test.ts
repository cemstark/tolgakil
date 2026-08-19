import { describe, expect, it } from 'vitest'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'

describe('sanitizeArticleHtml', () => {
  it('script etiketini ve içeriğini tamamen atar', () => {
    expect(sanitizeArticleHtml('<p>Merhaba</p><script>alert(1)</script>')).toBe('<p>Merhaba</p>')
  })

  it('olay özniteliklerini siler', () => {
    expect(sanitizeArticleHtml('<p onclick="calis()">Metin</p>')).toBe('<p>Metin</p>')
  })

  it('javascript: adresli bağlantıyı zararsızlaştırır', () => {
    const temiz = sanitizeArticleHtml('<a href="javascript:alert(1)">bağlantı</a>')
    expect(temiz).not.toContain('javascript:')
    expect(temiz).toContain('bağlantı')
  })

  it('iframe ve img etiketlerini beyaz listeye almaz', () => {
    expect(sanitizeArticleHtml('<iframe src="https://a.test"></iframe><img src="x" onerror="y">')).toBe('')
  })

  it('izin verilen biçimlendirmeyi korur', () => {
    const girdi = '<h2>Başlık</h2><p><strong>Kalın</strong> ve <em>eğik</em></p><ul><li>Madde</li></ul>'
    expect(sanitizeArticleHtml(girdi)).toBe(girdi)
  })

  it('dış bağlantıya rel ekler', () => {
    expect(sanitizeArticleHtml('<a href="https://resmigazete.gov.tr">Kaynak</a>')).toContain(
      'rel="noopener noreferrer"',
    )
  })

  it('Türkçe karakterleri bozmaz', () => {
    expect(sanitizeArticleHtml('<p>İşçi şğüöç ÇĞİÖŞÜ</p>')).toBe('<p>İşçi şğüöç ÇĞİÖŞÜ</p>')
  })

  // Tiptap boş editörde <p></p> üretiyor; "içerik girildi" sayılmaması gerekiyor.
  it('yalnızca boş paragraftan oluşan gövdeyi boş metne indirger', () => {
    expect(htmlToPlainText(sanitizeArticleHtml('<p></p><p><br></p>'))).toBe('')
  })
})

describe('htmlToPlainText', () => {
  it('etiketleri atıp metni bırakır', () => {
    expect(htmlToPlainText('<h2>Başlık</h2><p>Gövde</p>')).toBe('Başlık Gövde')
  })

  // Blok sınırına boşluk konmazsa iki blok bitişip var olmayan bir kelime üretir
  // ("BaşlıkGövde") ve reklam yasağı taraması yanlış konum bildirir.
  it('satır içi biçimlendirme kelimeyi bölmez', () => {
    expect(htmlToPlainText('<p><strong>Ka</strong>lın yazı</p>')).toBe('Kalın yazı')
  })

  it('liste maddelerini birbirinden ayırır', () => {
    expect(htmlToPlainText('<ul><li>Bir</li><li>İki</li></ul>')).toBe('Bir İki')
  })
})
