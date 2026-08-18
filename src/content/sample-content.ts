// Plan 2'de bu sabitler veritabanı sorgularıyla değiştirilecek; tipler aynı kalacak,
// bileşenler prop imzasını koruyacak şekilde tasarlandı.

export type PracticeArea = { slug: string; name: string; summary: string }
export type ArticleSummary = { slug: string; title: string; category: string; date: string }
export type LawyerSummary = { slug: string; name: string; title: string }

export const SAMPLE_PRACTICE_AREAS: PracticeArea[] = [
  { slug: 'aile-hukuku', name: 'Aile Hukuku', summary: 'Boşanma, velayet, nafaka ve mal rejimi süreçleri.' },
  { slug: 'is-hukuku', name: 'İş Hukuku', summary: 'İşçi ve işveren uyuşmazlıkları, alacak ve işe iade davaları.' },
  { slug: 'ticaret-hukuku', name: 'Ticaret Hukuku', summary: 'Şirketler, sözleşmeler ve ticari uyuşmazlıklar.' },
]

export const SAMPLE_ARTICLES: ArticleSummary[] = [
  { slug: 'kira-tespit-davasi', title: 'Kira tespit davasında güncel içtihat', category: 'Kira Hukuku', date: '2026-08-12' },
  { slug: 'ise-iade-suresi', title: 'İşe iade davasında süre koşulu', category: 'İş Hukuku', date: '2026-07-29' },
  { slug: 'anonim-sirkette-pay-devri', title: 'Anonim şirkette pay devrinin sınırları', category: 'Ticaret Hukuku', date: '2026-07-03' },
]

export const SAMPLE_LAWYERS: LawyerSummary[] = [
  { slug: 'tolga-akil', name: 'Tolga Akıl', title: 'Avukat' },
  { slug: 'ikinci-avukat', name: 'İkinci Avukat', title: 'Avukat' },
  { slug: 'ucuncu-avukat', name: 'Üçüncü Avukat', title: 'Avukat' },
]
