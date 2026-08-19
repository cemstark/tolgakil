import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canAccess, type PanelResource } from '@/lib/permissions'
import type { UserRole } from '@/db/schema'

export type PanelUser = { id: number; email: string; name: string; role: UserRole }

export async function requireUser(): Promise<PanelUser> {
  const session = await auth()
  if (!session?.user) redirect('/panel/giris')
  return {
    id: Number(session.user.id),
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }
}

// Yetkisiz erişimde notFound(): kaynağın varlığını ele vermez ve gerçek bir HTTP durumu
// döndürür. forbidden() elendi — Next 16.3'te experimental.authInterrupts bayrağı gerekiyor,
// deneysel bayrak açmamak için bu yol seçildi.
export async function requireAccess(resource: PanelResource): Promise<PanelUser> {
  const user = await requireUser()
  if (!canAccess(user.role, resource)) notFound()
  return user
}
