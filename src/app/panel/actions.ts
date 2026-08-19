'use server'

import { signOut } from '@/auth'

// PanelNav bir istemci bileşeni; çıkış işlemi çerez yazdığı için sunucuda koşmak zorunda.
// Ayrı dosyada tutuluyor ki istemci paketine `@/auth` (mysql2 + argon2) sızmasın.
export async function signOutAction() {
  await signOut({ redirectTo: '/panel/giris' })
}
