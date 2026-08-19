import { and, asc, eq, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { users, type User, type UserRole } from '@/db/schema'

export type UserListItem = {
  id: number
  email: string
  name: string
  role: UserRole
  isActive: boolean
  lastLoginAt: Date | null
}

// Hata yakalanmıyor: veritabanı erişilemezse çağıran (sunucu bileşeni) hata sınırına düşsün.
// Parola özeti SEÇİLMİYOR: listeye girmesi gerekmiyor, RSC yükünde dolaşması hiç gerekmiyor.
export async function listUsers(): Promise<UserListItem[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(asc(users.name))
}

export async function getUserById(id: number): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id))
  return row ?? null
}

// Yalnız ETKİN admin'ler sayılıyor: pasifleştirilmiş bir admin panele giremediği için
// "son yönetici" korumasında yedek sayılamaz (bkz. lib/user-guard.ts).
export async function listActiveAdminIds(): Promise<number[]> {
  const satirlar = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
  return satirlar.map((s) => s.id)
}

// users.email UNIQUE; kısıt hatası kullanıcıya 500 olarak dönmesin diye önceden bakılıyor.
// exceptId düzenleme yolu için ayrıldı — bugün e-posta düzenlemede değiştirilemiyor ama
// çağıranın kendi satırını çakışma sayması, ileride o alan açıldığında sessiz bir hata olurdu.
export async function isEmailTaken(email: string, exceptId?: number): Promise<boolean> {
  const predicate =
    exceptId === undefined ? eq(users.email, email) : and(eq(users.email, email), ne(users.id, exceptId))

  const [row] = await db.select({ id: users.id }).from(users).where(predicate).limit(1)
  return row !== undefined
}
