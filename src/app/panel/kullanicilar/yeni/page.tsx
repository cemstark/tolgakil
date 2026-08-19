import type { Metadata } from 'next'
import { requireAccess } from '@/lib/auth-guards'
import { PanelHeading } from '@/components/PanelHeading'
import { UserForm } from '@/components/UserForm'
import { saveUser } from '../actions'

export const metadata: Metadata = {
  title: 'Yeni kullanıcı',
  robots: { index: false, follow: false },
}

export default async function NewUserPage() {
  await requireAccess('users')

  return (
    <>
      <PanelHeading
        title="Yeni kullanıcı"
        description="Hesap anında etkinleşir; parolayı kullanıcıya ayrı bir kanaldan iletin."
      />
      <UserForm action={saveUser} />
    </>
  )
}
