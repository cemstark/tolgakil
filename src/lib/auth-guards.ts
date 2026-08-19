import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db/client'
import { users, type UserRole } from '@/db/schema'
import { canAccess, type PanelResource } from '@/lib/permissions'

export type PanelUser = { id: number; email: string; name: string; role: UserRole }

// Oturum çerezi 8 saat geçerli ve rol ile isActive o çerezde donuyor. Görev 7 kullanıcı
// pasifleştirmeyi getirecek; pasifleştirilen kişinin 8 saat daha panelde çalışmaya devam
// etmesi o özelliği işlevsiz kılardı. Bu yüzden satır her panel isteğinde okunuyor —
// panel hacmi düşük, tek satırlık birincil anahtar sorgusunun maliyeti önemsiz.
export async function getPanelUser(): Promise<PanelUser | null> {
  const session = await auth()
  if (!session?.user) return null

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))

  // Silinmiş veya pasifleştirilmiş kullanıcının çerezi hâlâ geçerli olabilir; oturum burada
  // geçersiz sayılıyor. Çerez temizlenmiyor: signOut çerez yazdığı için sunucu bileşeninden
  // çağrılamaz. Kullanıcı giriş sayfasına düşer, yeniden giriş yapınca taze token alır.
  if (!row || !row.isActive) return null

  return { id: row.id, email: row.email, name: row.name, role: row.role }
}

// Giriş sayfası da aynı yüklemi kullanmak zorunda: "oturum var" ile "panele girebilir"
// ayrışırsa, pasifleştirilmiş kullanıcı /panel ile /panel/giris arasında sonsuz döngüye girer.
export async function requireUser(): Promise<PanelUser> {
  const user = await getPanelUser()
  if (!user) redirect('/panel/giris')
  return user
}

// Yetkisiz erişimde notFound(): kaynağın varlığını ele vermez ve gerçek bir HTTP durumu
// döndürür. forbidden() elendi — Next 16.3'te experimental.authInterrupts bayrağı gerekiyor,
// deneysel bayrak açmamak için bu yol seçildi.
export async function requireAccess(resource: PanelResource): Promise<PanelUser> {
  const user = await requireUser()
  if (!canAccess(user.role, resource)) notFound()
  return user
}
