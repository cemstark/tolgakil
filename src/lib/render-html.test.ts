import { describe, expect, it } from 'vitest'
import { renderableHtml } from '@/lib/render-html'

describe('renderableHtml', () => {
  // dangerouslySetInnerHTML'e giden TEK kapı burası. Satırlar tek yoldan gelmiyor:
  // drizzle studio, migration, tohum ve ileride yazılacak her yeni yazma yolu panelin
  // temizleyicisini atlayabilir; atlanan tek yol doğrudan XSS demektir.
  it('script etiketini basmaz', () => {
    expect(renderableHtml('<p>Merhaba</p><script>alert(1)</script>').__html)
      .toBe('<p>Merhaba</p>')
  })

  it('olay özniteliğini söker', () => {
    expect(renderableHtml('<p onclick="alert(1)">Metin</p>').__html).toBe('<p>Metin</p>')
  })

  it('izin verilen biçimlendirmeyi korur', () => {
    expect(renderableHtml('<p><strong>Kalın</strong></p>').__html)
      .toBe('<p><strong>Kalın</strong></p>')
  })
})
