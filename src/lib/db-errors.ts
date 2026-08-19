const RESTRICTION_CODES: ReadonlySet<string> = new Set(['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED'])

// Zincir uzunluğu sınırlanıyor: `cause` halkası kendine dönerse (kütüphaneler arası sarma
// bunu üretebiliyor) döngü sonsuza girerdi.
const MAX_CAUSE_DEPTH = 5

/**
 * Silinmek istenen satıra başka bir tablodan `ON DELETE RESTRICT` bağı var mı?
 *
 * MariaDB bu durumda `ER_ROW_IS_REFERENCED_2` (errno 1451) döndürüyor, ama kod hatanın
 * KENDİSİNDE olmayabilir: drizzle sürücü hatasını `DrizzleQueryError` içine sarıyor ve
 * özgün mysql2 hatasını `cause` alanına koyuyor (Görev 7'de ölçüldü — yalnız dış nesneye
 * bakan bir denetim kısıt hatasını hiç görmüyor ve kullanıcı Türkçe mesaj yerine panel
 * hata sayfasıyla karşılaşıyordu). Bu yüzden zincir yürünüyor.
 *
 * Yalnız BU kod Türkçe bir kullanıcı mesajına çevriliyor; başka her hata yeniden
 * fırlatılıyor, çünkü "silinemedi" diye özetlenen bir bağlantı arızası ya da izin hatası
 * arızayı görünmez kılardı (global kısıt: hiçbir hata yutulmaz).
 */
export function isForeignKeyRestriction(cause: unknown): boolean {
  let current: unknown = cause
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== 'object' || current === null) return false
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string' && RESTRICTION_CODES.has(code)) return true
    const next = (current as { cause?: unknown }).cause
    if (next === current) return false
    current = next
  }
  return false
}
