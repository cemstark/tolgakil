'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { lawyers } from '@/db/schema'
import { deleteLawyer as deleteLawyerRow, getLawyerById, isSlugTaken } from '@/db/queries/lawyers'
import { getMediaById } from '@/db/queries/media'
import { findBannedPhrases, formatBannedMatch } from '@/lib/ad-ban'
import { requireAccess } from '@/lib/auth-guards'
import { TAGS } from '@/lib/cache-tags'
import { isForeignKeyRestriction } from '@/lib/db-errors'
import { parseFormId } from '@/lib/form-id'
import { htmlToPlainText, sanitizeArticleHtml } from '@/lib/sanitize'
import { lawyerSchema, textColumnLengthError, toFormState, type FormState } from '@/lib/validation'

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Avukat kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

export async function saveLawyer(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil: server function bulunduğu rotaya POST olarak
  // gider ve matcher değişirse koruma sessizce kalkar (global kısıt).
  await requireAccess('lawyers')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid') return INVALID_ID

  // Fotoğraf şemaya EKLENMEDİ (bkz. makaleler/actions.ts kapak görseli gerekçesi):
  // şema alanın FormData'da bulunmasını şart koşardı ve seçicisi olmayan bir çağrı
  // anlaşılmaz bir "beklenen dize" hatası alırdı.
  const photoMediaId = parseFormId(formData.get('photoMediaId'))
  if (photoMediaId === 'invalid') {
    return { ok: false, errors: { photoMediaId: ['Geçersiz fotoğraf seçildi.'] } }
  }

  const parsed = lawyerSchema.safeParse({
    slug: formData.get('slug'),
    fullName: formData.get('fullName'),
    title: formData.get('title'),
    barAssociation: formData.get('barAssociation'),
    barRegistryNo: formData.get('barRegistryNo'),
    tbbRegistryNo: formData.get('tbbRegistryNo'),
    practiceStartDate: formData.get('practiceStartDate'),
    university: formData.get('university'),
    languages: formData.get('languages'),
    email: formData.get('email'),
    sortOrder: formData.get('sortOrder'),
    isPublished: formData.get('isPublished'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur ve kullanıcı düğmeye basıp
  // hiçbir şey olmadığını görür (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // İstemci tarafı temizliği güvenlik önlemi sayılmaz; beyaz liste burada uygulanıyor ve
  // makale ile AYNI: img/iframe girmiyor.
  const rawBio = formData.get('bio')
  const bio = typeof rawBio === 'string' ? sanitizeArticleHtml(rawBio) : ''
  const plainBio = htmlToPlainText(bio)
  // Boş <p></p> hâlâ HTML olarak dolu; sütuna boş bir kabuk yazmamak için düz metne bakılıyor.
  const storedBio = plainBio === '' ? null : bio

  // Sütun TEXT = 65.535 BAYT. Denetim TEMİZLENMİŞ dize üzerinde: veritabanına yazılacak olan o.
  // Alan hatası olarak dönüyor, fırlatmıyor — fırlatsaydı kullanıcı hata sayfası görür ve
  // yazdığı özgeçmişi geri alamazdı.
  if (storedBio !== null) {
    const bioLengthError = textColumnLengthError(storedBio, 'Özgeçmiş')
    if (bioLengthError !== null) return { ok: false, errors: { bio: [bioLengthError] } }
  }

  // spec §11: çakışma sessizce üzerine yazılmaz, kullanıcıya açıkça bildirilir.
  if (await isSlugTaken(parsed.data.slug, id ?? undefined)) {
    return { ok: false, errors: { slug: ['Bu adres başka bir kadro kaydında kullanılıyor.'] } }
  }

  if (parsed.data.isPublished) {
    // Avukat özgeçmişi reklam yasağının en hassas alanı; tarama burada da çalışıyor.
    const scanned = [
      parsed.data.fullName, parsed.data.title, parsed.data.university ?? '',
      parsed.data.languages ?? '', plainBio,
    ].join(' ')
    const matches = findBannedPhrases(scanned)
    const acknowledged = formData.get('adBanAcknowledged') === 'evet'
    if (matches.length > 0 && !acknowledged) {
      // Engel değil sürtünme: kayıt yapılmaz, kullanıcı bulguları konumuyla görür ve
      // sorumluluğu üstlenen kutuyu işaretleyip yeniden gönderirse yayın tamamlanır.
      return { ok: false, errors: {}, warnings: matches.map(formatBannedMatch) }
    }
  }

  // Fotoğrafın HÂLÂ var olduğu doğrulanıyor: photo_media_id kısıtı SET NULL, yani hedefi
  // gerçekten kaybolabiliyor. Denetimle yazma arasında dar bir pencere kalıyor; orada hata
  // yutulmuyor, yalnız sıklığı pratikte sıfıra iniyor (bkz. makaleler/actions.ts).
  if (photoMediaId !== null && (await getMediaById(photoMediaId)) === null) {
    return { ok: false, errors: { photoMediaId: ['Seçilen fotoğraf artık kitaplıkta yok; yeniden seçin.'] } }
  }

  const existing = id === null ? null : await getLawyerById(id)
  if (id !== null && existing === null) {
    return { ok: false, errors: {}, message: 'Kayıt bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  const values = {
    slug: parsed.data.slug,
    fullName: parsed.data.fullName,
    title: parsed.data.title,
    barAssociation: parsed.data.barAssociation,
    barRegistryNo: parsed.data.barRegistryNo,
    tbbRegistryNo: parsed.data.tbbRegistryNo,
    // mode: 'string' sütunu; "YYYY-MM-DD" hiç Date'e çevrilmeden yazılıyor, gün kayması yok.
    practiceStartDate: parsed.data.practiceStartDate,
    university: parsed.data.university,
    languages: parsed.data.languages,
    email: parsed.data.email,
    sortOrder: parsed.data.sortOrder,
    isPublished: parsed.data.isPublished,
    // Form fotoğraf alanını her gönderimde taşıyor (seçim yoksa boş dize), bu yüzden
    // güncellemede de açıkça yazılıyor: "Fotoğraf yok" seçmek gerçekten fotoğrafı kaldırmalı.
    photoMediaId,
    bio: storedBio,
  }

  let savedId: number
  if (existing === null) {
    const [result] = await db.insert(lawyers).values(values)
    savedId = result.insertId
  } else {
    await db.update(lawyers).set(values).where(eq(lawyers.id, existing.id))
    savedId = existing.id
  }

  // İki argümanlı biçim zorunlu: tek argümanlı çağrı Next 16.3'te kaldırıldı. Bu çağrılar
  // Plan 3 okuma tarafını 'use cache' + cacheTag ile bağlayana kadar ETKİSİZ — bilinçli.
  revalidateTag(TAGS.lawyers, 'max')
  revalidatePath('/panel/kadro')
  // Makale formundaki yazar seçicisi bu adlardan besleniyor.
  revalidatePath('/panel/makaleler')

  // Yeni kayıtta düzenleme sayfasına geçiliyor; yönlendirme useActionState durumunu
  // sıfırladığı için bildirim adres üzerinden taşınıyor (bkz. lib/panel-notice.ts).
  if (existing === null) redirect(`/panel/kadro/${savedId}?kaydedildi=${savedId}`)

  return { ok: true, errors: {}, message: 'Avukat kaydedildi.' }
}

export async function deleteLawyer(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccess('lawyers')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getLawyerById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Kayıt bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  try {
    await deleteLawyerRow(id)
  } catch (cause) {
    // articles.author_id kısıtı ON DELETE RESTRICT: yazarı olan makale sahipsiz kalmasın.
    // Yalnız bu kod çevriliyor, başka her hata yeniden fırlatılıyor.
    if (isForeignKeyRestriction(cause)) {
      return {
        ok: false,
        errors: {},
        message: 'Bu avukatın yazdığı makaleler var; önce o makalelerin yazarını değiştirin.',
      }
    }
    throw cause
  }

  revalidateTag(TAGS.lawyers, 'max')
  revalidatePath('/panel/kadro')
  revalidatePath('/panel/makaleler')

  // Başarı bildirimi kip pencerede basılamaz: silinen satır yeniden çizimle kalkıyor ve
  // pencereyi de beraberinde götürüyor, yani mesaj hiç görünmez, odak <body>'ye düşerdi.
  // Silinen kaydın kimliği adreste taşınıyor ki ardışık silmelerde adres her seferinde
  // değişsin ve bildirim yeniden kurulup duyurulsun (bkz. lib/panel-notice.ts).
  redirect(`/panel/kadro?silindi=${id}`)
}
