'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { categories } from '@/db/schema'
import { deleteCategory as deleteCategoryRow, getCategoryById, isSlugTaken } from '@/db/queries/categories'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS } from '@/lib/cache-tags'
import { isForeignKeyRestriction } from '@/lib/db-errors'
import { parseFormId } from '@/lib/form-id'
import { categorySchema, toFormState, type FormState } from '@/lib/validation'

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Kategori kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('categories')

  const parsed = categorySchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
  })
  if (!parsed.success) return toFormState(parsed.error)

  // REKLAM YASAĞI TARAMASI BİLİNÇLİ OLARAK YOK. Tarama, avukatın yazdığı ve halkın okuduğu
  // DÜZYAZIYA uygulanıyor (makale, özgeçmiş, çalışma alanı özeti, büro adı ve alt bilgi).
  // Kategori adı düzyazı değil, iki-üç kelimelik bir sınıflandırma etiketi ve onu yalnız
  // yönetici giriyor. Buna karşılık bu form tek satırlık bir hızlı ekleme kutusu: onaylı
  // uyarı kutusunun getireceği ikinci gönderim turu, koruduğu riskten büyük bir sürtünme
  // olurdu.
  //
  // BAŞKA BİR YERDEN GELEN GÜVENCE YOK: makale taraması makalenin BAŞLIK, ÖZET ve
  // GÖVDESİNİ okuyor, bağlı olduğu kategorinin adını değil. Bugün ad hiç yayımlanmıyor —
  // yalnız panelde görünüyor, kamuya açık makale detay sayfası henüz yazılmadı. Plan 3'te
  // hem o sayfa hem kategori arşivi (/makaleler/kategori/[slug]) gelecek ve ad makaleden
  // bağımsız bir başlık olarak yayımlanacak; karar o noktada yeniden değerlendirilmelidir.
  //
  // spec §11: çakışma sessizce üzerine yazılmaz, kullanıcıya açıkça bildirilir.
  if (await isSlugTaken(parsed.data.slug)) {
    return { ok: false, errors: { slug: ['Bu adres başka bir kategoride kullanılıyor.'] } }
  }

  const [result] = await db.insert(categories).values({ slug: parsed.data.slug, name: parsed.data.name })

  revalidateTag(TAGS.categories, 'max')
  // Makale formundaki kategori seçicisi bu listeden besleniyor.
  revalidatePath('/panel/makaleler')

  // Yönlendirme bilinçli: bildirim adres üzerinden taşınıyor ve form yeniden kuruluyor,
  // böylece eklenen kategorinin adı kutuda asılı kalmıyor (bkz. lib/panel-notice.ts).
  redirect(`/panel/kategoriler?kaydedildi=${result.insertId}`)
}

export async function deleteCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccess('categories')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getCategoryById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Kategori bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  try {
    await deleteCategoryRow(id)
  } catch (cause) {
    // articles.category_id kısıtı ON DELETE RESTRICT. Ön denetim yerine kısıtın kendisi
    // kullanılıyor: sayım ile silme arasında başka bir oturum makale ekleyebilir, o yarışı
    // kapatan tek şey veritabanının kendi kısıtı. Yalnız bu kod çevriliyor, başka her hata
    // yeniden fırlatılıyor.
    if (isForeignKeyRestriction(cause)) {
      return { ok: false, errors: {}, message: 'Bu kategoriye bağlı makaleler var; önce onları taşıyın.' }
    }
    throw cause
  }

  revalidateTag(TAGS.categories, 'max')
  revalidatePath('/panel/makaleler')

  // Silinen kaydın kimliği adreste taşınıyor: ardışık silmelerde bildirim yeniden kurulup
  // duyurulsun (bkz. lib/panel-notice.ts).
  redirect(`/panel/kategoriler?silindi=${id}`)
}
