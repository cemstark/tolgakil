import { NotFoundContent } from '@/components/NotFoundContent'

// Kabuğu grubun layout'u veriyor; bir (site) sayfasından notFound() çağrıldığında bu sınır
// devreye girer ve kabuk iki kez çizilmez. Eşleşmeyen adresler bu sınıra hiç ulaşmaz —
// onları kök not-found.tsx karşılar.
export default function SiteNotFound() {
  return <NotFoundContent />
}
