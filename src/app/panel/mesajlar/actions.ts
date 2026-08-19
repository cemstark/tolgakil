'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deleteMessage as deleteMessageRow, getMessageById, markMessageRead } from '@/db/queries/messages'
import { requireAccess } from '@/lib/auth-guards'
import { parseFormId } from '@/lib/form-id'
import type { FormState } from '@/lib/validation'

const INVALID_ID: FormState = {
  ok: false,
  errors: {},
  message: 'Mesaj kimliği okunamadı; sayfayı yenileyip tekrar deneyin.',
}

export async function markRead(_prev: FormState, formData: FormData): Promise<FormState> {
  // proxy.ts ilk savunma hattı, tek hattı değil (global kısıt).
  await requireAccess('messages')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getMessageById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Mesaj bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  await markMessageRead(id)

  revalidatePath('/panel/mesajlar')
  // Gösterge sayfasındaki "Okunmamış mesaj" sayacı da düşmeli.
  revalidatePath('/panel')

  // Yönlendirme: bildirim adres üzerinden taşınıyor ve okunan kaydın kimliği her işlemde
  // değiştiği için ardışık işaretlemelerde canlı bölge yeniden duyuruyor.
  redirect(`/panel/mesajlar?kaydedildi=${id}`)
}

export async function deleteMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccess('messages')

  const id = parseFormId(formData.get('id'))
  if (id === 'invalid' || id === null) return INVALID_ID

  const existing = await getMessageById(id)
  if (existing === null) {
    return { ok: false, errors: {}, message: 'Mesaj bulunamadı; başka bir oturumda silinmiş olabilir.' }
  }

  // messages'a işaret eden yabancı anahtar yok (schema.ts); kısıt yakalaması gereksiz.
  await deleteMessageRow(id)

  revalidatePath('/panel/mesajlar')
  revalidatePath('/panel')

  // Başarı bildirimi kip pencerede basılamaz: silinen satır yeniden çizimle kalkıyor ve
  // pencereyi de götürüyor (bkz. lib/panel-notice.ts).
  redirect(`/panel/mesajlar?silindi=${id}`)
}
