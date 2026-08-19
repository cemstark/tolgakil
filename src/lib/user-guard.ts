import type { UserRole } from '@/db/schema'

export type LastAdminCheck = {
  /** listActiveAdminIds() çıktısı: YALNIZ etkin admin satırları. */
  activeAdminIds: readonly number[]
  targetId: number
  nextRole: UserRole
  nextIsActive: boolean
}

// Son etkin admin'in rolü düşürülür veya pasifleştirilirse panele kimse giremez ve düzeltmenin
// tek yolu veritabanına elle müdahale olur. Karar saf tutuluyor ki testle sabitlenebilsin.
export function wouldRemoveLastAdmin(check: LastAdminCheck): boolean {
  const halaAdmin = check.nextRole === 'admin' && check.nextIsActive
  if (halaAdmin) return false
  // Hedef zaten etkin admin değilse bu değişiklik etkin admin sayısını eksiltmez.
  if (!check.activeAdminIds.includes(check.targetId)) return false
  return check.activeAdminIds.length <= 1
}
