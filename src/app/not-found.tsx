import { SiteShell } from '@/components/SiteShell'
import { NotFoundContent } from '@/components/NotFoundContent'

// Hiçbir rotayla eşleşmeyen adresler kök layout'u kullanır, (site) grubunun layout'unu
// almaz; kabuk bu yüzden burada elle sarılıyor.
export default function NotFoundPage() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  )
}
