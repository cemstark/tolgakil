import { describe, expect, it } from 'vitest'
import { wouldRemoveLastAdmin } from '@/lib/user-guard'

describe('wouldRemoveLastAdmin', () => {
  it('tek admin rolünü editor yaparsa engeller', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 7, nextRole: 'editor', nextIsActive: true }),
    ).toBe(true)
  })

  it('tek admin kendini pasifleştirirse engeller', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 7, nextRole: 'admin', nextIsActive: false }),
    ).toBe(true)
  })

  it('iki admin varsa biri düşürülebilir', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7, 9], targetId: 7, nextRole: 'editor', nextIsActive: true }),
    ).toBe(false)
  })

  it('admin olmayan kullanıcı serbestçe pasifleştirilir', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 12, nextRole: 'editor', nextIsActive: false }),
    ).toBe(false)
  })

  it('admin admin kalıyorsa engellemez', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 7, nextRole: 'admin', nextIsActive: true }),
    ).toBe(false)
  })

  // Pasif bir admin listede hiç bulunmaz (listActiveAdminIds yalnız etkin olanları döndürür),
  // yani onu yeniden admin yapmak son etkin admini eksiltmez. Bu durum brief'te yoktu ama
  // kullanıcı düzenleme formunda gerçek: pasifleştirilmiş bir yöneticiyi geri açan admin
  // "son yönetici" hatası almamalı.
  it('listede olmayan pasif admini yeniden etkinleştirmek engellenmez', () => {
    expect(
      wouldRemoveLastAdmin({ activeAdminIds: [7], targetId: 9, nextRole: 'admin', nextIsActive: true }),
    ).toBe(false)
  })
})
