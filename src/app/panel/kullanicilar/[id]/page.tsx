import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUserById } from '@/db/queries/users'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { isRouteId } from '@/lib/form-id'
import { PanelHeading } from '@/components/PanelHeading'
import { UserForm } from '@/components/UserForm'
import { saveUser } from '../actions'

export const metadata: Metadata = {
  title: 'Kullanıcıyı düzenle',
  robots: { index: false, follow: false },
}

type EditUserPageProps = { params: Promise<{ id: string }> }

export default async function EditUserPage({ params }: EditUserPageProps) {
  await requireAccess('users')

  const { id } = await params
  // Adres kullanıcı verisi; biçim önce denetleniyor (bkz. makaleler/[id]/page.tsx).
  if (!isRouteId(id)) notFound()

  const user = await getUserById(Number(id))
  if (user === null) notFound()

  return (
    <>
      <PanelHeading
        title="Kullanıcıyı düzenle"
        description={
          user.lastLoginAt === null
            ? 'Bu hesapla henüz giriş yapılmadı.'
            : `Son giriş: ${formatDateTime(user.lastLoginAt)}`
        }
      />

      <UserForm
        action={saveUser}
        values={{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        }}
      />
    </>
  )
}
