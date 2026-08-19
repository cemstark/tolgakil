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

  // Protokol göreli adres allowedSchemes denetimini hiç görmeden geçiyordu (ölçüldü):
  // tarayıcı "//evil.test/x" adresini sayfanın protokolüyle tamamlar. allowProtocolRelative
  // kaldırılırsa bu test kırılır.
  it('protokol göreli adresi kabul etmez', () => {
    const temiz = sanitizeArticleHtml('<a href="//evil.test/x">git</a>')
    expect(temiz).not.toContain('evil.test')
    expect(temiz).toContain('git')
  })
})

// Bugünkü korumanın büyük kısmı sanitize-html'in VARSAYILANLARINDAN geliyor, bizim
// listemizden değil. Paket ana sürüm atlayıp varsayılanı gevşetirse yukarıdaki testler
// bunu yakalamaz; aşağıdaki vektörler o varsayımı sabitliyor.
describe('sanitizeArticleHtml — saldırı vektörleri', () => {
  const vektorler: ReadonlyArray<{ ad: string; girdi: string; yasak: string }> = [
    { ad: 'data: adresli bağlantı', girdi: '<a href="data:text/html;base64,PHN2Zz4=">tıkla</a>', yasak: 'data:' },
    { ad: 'style etiketi', girdi: '<style>body{background:red}</style><p>Metin</p>', yasak: 'background' },
    { ad: 'svg ve içindeki script', girdi: '<svg onload="alert(1)"><script>alert(2)</script></svg><p>Metin</p>', yasak: 'alert' },
    { ad: 'base etiketi', girdi: '<base href="https://evil.test/"><p>Metin</p>', yasak: 'evil.test' },
    { ad: 'img srcset', girdi: '<img srcset="x.jpg 1x" src="y.jpg"><p>Metin</p>', yasak: 'srcset' },
    { ad: 'varlık kaçışlı javascript', girdi: '<a href="&#106;avascript:alert(1)">tıkla</a>', yasak: 'alert' },
    { ad: 'büyük-küçük harf karışık şema', girdi: '<a href="JaVaScRiPt:alert(1)">tıkla</a>', yasak: 'alert' },
    { ad: 'boşluk kaçırmalı şema', girdi: '<a href="  java\tscript:alert(1)">tıkla</a>', yasak: 'alert' },
  ]

  for (const { ad, girdi, yasak } of vektorler) {
    it(`${ad} vektörünü geçirmez`, () => {
      expect(sanitizeArticleHtml(girdi)).not.toContain(yasak)
    })
  }

  // İç içe yazılmış etiket, dıştaki atıldıktan sonra içteki birleşip yeniden
  // <script> oluşturmamalı; kalan her şey kaçırılmış düz metin olmalı.
  it('iç içe script etiketinden çalışabilir etiket üretmez', () => {
    const temiz = sanitizeArticleHtml('<scr<script>ipt>alert(1)</scr</script>ipt><p>Metin</p>')
    expect(temiz).not.toContain('<script')
    expect(temiz).toContain('<p>Metin</p>')
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

  // Kaçış çözülmezse her "&" bildirilen karakter konumunu dört kaydırır ve reklam
  // yasağı uyarısı kullanıcıyı editörde yanlış yere gönderir.
  it('HTML varlıklarını çözer', () => {
    expect(htmlToPlainText('<p>Ahmet &amp; Ortakları &lt;bilgi&gt;</p>')).toBe('Ahmet & Ortakları <bilgi>')
  })

  it('çözülmüş metnin uzunluğu özgün metinle aynı olur', () => {
    // "A & B" beş karakter; kaçışlı hâli dokuz olurdu.
    expect(htmlToPlainText('<p>A &amp; B</p>')).toHaveLength(5)
  })

  // &amp; önce çözülseydi kullanıcının düz metin olarak yazdığı "&lt;" iki adımda
  // "<" olur ve var olmayan bir etiket başlangıcı üretirdi.
  it('çift kaçışlı metni tek adımda çözer', () => {
    expect(htmlToPlainText('<p>&amp;lt;</p>')).toBe('&lt;')
  })
})
