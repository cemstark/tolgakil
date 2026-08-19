import type { ArticleStatus } from '@/db/schema'

// Kaydetme bildirimi iki ayrı yerden çiziliyor ve metin tek yerde tutuluyor:
// düzenlemede server action'ın FormState'i, yeni kayıtta yönlendirmeden SONRA sayfanın
// kendisi — yönlendirme useActionState durumunu sıfırladığı için mesaj adreste taşınıyor.
// Bu dosya 'use server' taşımıyor: 'use server' modüllerinden yalnız async fonksiyon
// dışa aktarılabilir, sabit dışa aktarmak derlemeyi kırar.
export const SAVE_MESSAGES: Record<ArticleStatus, string> = {
  draft: 'Makale taslak olarak kaydedildi.',
  published: 'Makale yayımlandı.',
}

// Adres çubuğundan gelen değer kullanıcı tarafından yazılabilir; tanınmayan değer sessizce
// yok sayılır, uydurma bir mesaj basılmaz.
export function saveMessageFor(value: string | undefined): string | undefined {
  return value === 'draft' || value === 'published' ? SAVE_MESSAGES[value] : undefined
}
