import { readFile } from 'node:fs/promises'
import { STORED_CONTENT_TYPE, STORED_EXTENSION, resolveUploadPath } from '@/lib/media-storage'

// Yüklenen görseller dağıtım kökünün dışında durduğu için (spec §13) `public/` altından
// servis edilemiyor; okuma bu rotadan geçiyor.
//
// Rota BİLEREK herkese açık: yüklenen görseller zaten sitede yayımlanacak. proxy.ts
// matcher'ı /panel ile sınırlı olduğu için burada oturum denetimi zaten çalışmazdı.
// Açık olması yol denetimini gevşetmez — aşağıdaki iki süzgeç kullanıcı girdisini
// dosya sistemine geçmeden önce eler.

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { path: segments } = await context.params

  // Birinci süzgeç: parçalar Next tarafından yüzde-kodu çözülmüş hâlde geliyor, yani
  // "..%2f.." adres çubuğunda ".." parçalarına dönüşebilir. Ayıraç, nokta-nokta ve boş
  // bayt taşıyan hiçbir parça dosya sistemine ulaşmıyor.
  const gecerli = segments.length > 0 && segments.every(guvenliParca)
  if (!gecerli) return new Response('Geçersiz görsel adresi.', { status: 400 })

  const relative = segments.join('/')
  // Depolanan her dosya WebP; başka uzantı istemek yalnızca yoklama olabilir.
  if (!relative.endsWith(STORED_EXTENSION)) {
    return new Response('Geçersiz görsel adresi.', { status: 400 })
  }

  // İkinci süzgeç: yol kökün dışına düşerse resolveUploadPath fırlatır.
  let mutlak: string
  try {
    mutlak = resolveUploadPath(relative)
  } catch {
    return new Response('Geçersiz görsel adresi.', { status: 400 })
  }

  try {
    const bytes = await readFile(mutlak)
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': STORED_CONTENT_TYPE,
        'Content-Length': String(bytes.byteLength),
        // Dosya adı içerik özeti olduğu için içerik hiç değişmez; aynı ad başka bayt
        // gösteremez. Bu yüzden immutable güvenli.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (cause) {
    // Yalnız "dosya yok" 404'e çevriliyor. İzin hatası veya bozuk disk yutulmuyor:
    // sunucuya loglanıp yeniden fırlatılıyor, aksi hâlde arıza "görsel silinmiş" gibi görünürdü.
    if (dosyaYok(cause)) return new Response('Görsel bulunamadı.', { status: 404 })
    console.error('Görsel okunamadı:', relative, cause)
    throw cause
  }
}

function guvenliParca(segment: string): boolean {
  return (
    segment !== '' &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.includes('/') &&
    !segment.includes('\\') &&
    !segment.includes('\0')
  )
}

function dosyaYok(error: unknown): boolean {
  // ENOENT: dosya yok. ENOTDIR: ara parçalardan biri dosya (ör. .../a.webp/b.webp).
  // EISDIR: yol bir dizini gösteriyor. Üçü de "böyle bir görsel yok" demek.
  const code = (error as NodeJS.ErrnoException | null)?.code
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR'
}
