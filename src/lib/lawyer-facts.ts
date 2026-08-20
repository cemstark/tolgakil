import type { PublicLawyerDetail } from '@/db/queries/public/lawyers'
import { formatDate } from '@/lib/date'

export type LawyerFact = { label: string; value: string; href?: string }

// TBB Reklam Yasağı Yönetmeliği'nin (son değişiklik 9 Ağustos 2024) saydığı alanlar —
// spec §2.1. Sıra da burada: gösterim sırası bileşende değil, tek kaynakta dursun.
// Bu listeye yeni bir etiket eklemek mevzuat kararıdır, tasarım kararı değildir.
export const IZINLI_ETIKETLER = [
  'Baro',
  'Baro sicil no',
  'TBB sicil no',
  'Mesleğe başlama',
  'Üniversite',
  'Yabancı diller',
  'E-posta',
] as const

function dolu(value: string | null): value is string {
  return value !== null && value.trim() !== ''
}

export function lawyerFacts(lawyer: PublicLawyerDetail): LawyerFact[] {
  const facts: LawyerFact[] = []

  if (dolu(lawyer.barAssociation)) facts.push({ label: 'Baro', value: lawyer.barAssociation })
  if (dolu(lawyer.barRegistryNo)) facts.push({ label: 'Baro sicil no', value: lawyer.barRegistryNo })
  if (dolu(lawyer.tbbRegistryNo)) facts.push({ label: 'TBB sicil no', value: lawyer.tbbRegistryNo })
  // practiceStartDate 'YYYY-MM-DD' dizesi (şema mode:'string'); formatDate de UTC'ye
  // sabitli, yani hiçbir adımda Date nesnesine dönüp gün kaydırmıyor.
  if (dolu(lawyer.practiceStartDate)) {
    facts.push({ label: 'Mesleğe başlama', value: formatDate(lawyer.practiceStartDate) })
  }
  if (dolu(lawyer.university)) facts.push({ label: 'Üniversite', value: lawyer.university })
  if (dolu(lawyer.languages)) facts.push({ label: 'Yabancı diller', value: lawyer.languages })
  if (dolu(lawyer.email)) {
    facts.push({ label: 'E-posta', value: lawyer.email, href: `mailto:${lawyer.email}` })
  }

  return facts
}
