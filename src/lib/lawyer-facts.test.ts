import { describe, expect, it } from 'vitest'
import { lawyerFacts, IZINLI_ETIKETLER } from '@/lib/lawyer-facts'
import type { PublicLawyerDetail } from '@/db/queries/public/lawyers'

function avukat(ustuneYaz: Partial<PublicLawyerDetail> = {}): PublicLawyerDetail {
  return {
    slug: 'deneme-avukat',
    fullName: 'Deneme Avukat',
    title: 'Avukat',
    photoPath: null,
    photoAlt: null,
    barAssociation: null,
    barRegistryNo: null,
    tbbRegistryNo: null,
    practiceStartDate: null,
    university: null,
    languages: null,
    email: null,
    bio: null,
    ...ustuneYaz,
  }
}

describe('lawyerFacts', () => {
  it('boş, null ve yalnız boşluk taşıyan alanları listeye koymaz', () => {
    const facts = lawyerFacts(avukat({ barAssociation: '', university: '   ', languages: null }))
    expect(facts).toEqual([])
  })

  // TZ=America/New_York altında koşuyor: tarih Date'e çevrilip yerel yöntemlerle
  // okunursa 14 Mart çıkar. Sütun mode:'string' ve buradan da dize olarak geçiyor.
  it('mesleğe başlama tarihini gün kaydırmadan Türkçe basar', () => {
    const facts = lawyerFacts(avukat({ practiceStartDate: '2010-03-15' }))
    expect(facts).toEqual([{ label: 'Mesleğe başlama', value: '15 Mart 2010' }])
  })

  it('e-postayı mailto bağlantısıyla verir', () => {
    const facts = lawyerFacts(avukat({ email: 'avukat@ornek.test' }))
    expect(facts).toEqual([
      { label: 'E-posta', value: 'avukat@ornek.test', href: 'mailto:avukat@ornek.test' },
    ])
  })

  // TBB Reklam Yasağı Yönetmeliği'nin saydığı alanlar dışında hiçbir şey basılmamalı
  // (spec §2.1). Liste büyürse bu test kırmızıya döner ve değişiklik görünür olur.
  it('yalnız mevzuatın saydığı etiketleri, sabit sırayla döndürür', () => {
    const facts = lawyerFacts(avukat({
      barAssociation: 'İstanbul Barosu',
      barRegistryNo: '12345',
      tbbRegistryNo: '67890',
      practiceStartDate: '2010-03-15',
      university: 'İstanbul Üniversitesi Hukuk Fakültesi',
      languages: 'Türkçe, İngilizce',
      email: 'avukat@ornek.test',
    }))
    expect(facts.map((f) => f.label)).toEqual([...IZINLI_ETIKETLER])
  })
})
