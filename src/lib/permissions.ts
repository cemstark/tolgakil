import type { UserRole } from '@/db/schema'

export type PanelResource =
  | 'articles' | 'media' | 'lawyers' | 'practiceAreas'
  | 'categories' | 'settings' | 'messages' | 'users' | 'pages'

// Spec §3: editor yalnız yayın üretir; büroyu tanıtan veriler ve kullanıcı yönetimi admin'de.
const EDITOR_RESOURCES: ReadonlySet<PanelResource> = new Set(['articles', 'media'])

export function canAccess(role: UserRole, resource: PanelResource): boolean {
  return role === 'admin' || EDITOR_RESOURCES.has(resource)
}
