import type { Metadata } from 'next'
import Link from 'next/link'
import { listUsers } from '@/db/queries/users'
import { requireAccess } from '@/lib/auth-guards'
import { formatDateTime } from '@/lib/date'
import { PanelActionLink, PanelEmptyState } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PanelTable, panelTableStyles as table } from '@/components/PanelTable'

export const metadata: Metadata = {
  title: 'Kullanıcılar',
  robots: { index: false, follow: false },
}

const ROLE_LABELS = { admin: 'Yönetici', editor: 'Editör' } as const

export default async function UserListPage() {
  await requireAccess('users')
  const users = await listUsers()

  return (
    <>
      <PanelHeading
        title="Kullanıcılar"
        description="Panele giren hesaplar. Kullanıcı silinmez, pasifleştirilir."
        action={<PanelActionLink href="/panel/kullanicilar/yeni">Yeni kullanıcı</PanelActionLink>}
      />

      {users.length === 0 ? (
        // Pratikte erişilemez: bu sayfayı görebilmek için etkin bir yöneticiyle giriş
        // yapmış olmak gerekiyor. Yine de çiziliyor — boş bir tablo iskeleti bırakmak,
        // beklenmedik bir durumda kullanıcıyı sessiz bir ekranla baş başa bırakırdı.
        <PanelEmptyState>Kayıtlı kullanıcı yok.</PanelEmptyState>
      ) : (
        <PanelTable
          label="Kullanıcı listesi"
          caption="Ada göre dizili panel kullanıcıları"
          columns={['Ad soyad', 'Kullanıcı adı', 'Rol', 'Durum', 'Son giriş', 'İşlem']}
        >
          {users.map((user) => (
            <tr key={user.id}>
              <th scope="row" className={table.nameCell}>
                {user.name}
              </th>
              <td>{user.username}</td>
              <td>{ROLE_LABELS[user.role]}</td>
              <td>
                {/* Durum yalnız renkle değil metinle de ayrışıyor (WCAG 1.4.1). */}
                <span className={user.isActive ? table.on : table.off}>
                  {user.isActive ? 'Etkin' : 'Pasif'}
                </span>
              </td>
              {/* Veritabanı oturumu UTC; @/lib/date timeZone'u açıkça veriyor. */}
              <td>{user.lastLoginAt === null ? 'Hiç giriş yapmadı' : formatDateTime(user.lastLoginAt)}</td>
              <td>
                {/* Silme düğmesi BİLİNÇLİ olarak yok: kullanıcı pasifleştirilir, böylece
                    yüklediği medyanın uploaded_by bağı ve last_login_at izi korunur. */}
                <Link href={`/panel/kullanicilar/${user.id}`} className={table.nameLink}>
                  Düzenle
                </Link>
              </td>
            </tr>
          ))}
        </PanelTable>
      )}
    </>
  )
}
