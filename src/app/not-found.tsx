import { SiteShell } from '@/components/SiteShell'
import { NotFoundContent } from '@/components/NotFoundContent'
import { getPublicSiteIdentity } from '@/db/queries/public/site-identity'

// Hiçbir rotayla eşleşmeyen adresler kök layout'u kullanır, (site) grubunun layout'unu
// almaz; kabuk bu yüzden burada elle sarılıyor ve kimlik verisi de burada okunuyor.
export default async function NotFoundPage() {
  const identity = await getPublicSiteIdentity()
  return (
    <SiteShell identity={identity}>
      <NotFoundContent />
    </SiteShell>
  )
}
