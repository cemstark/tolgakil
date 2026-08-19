import { describe, expect, it } from 'vitest'
import { isForeignKeyRestriction } from '@/lib/db-errors'

describe('isForeignKeyRestriction', () => {
  it('kısıt hatasını tanır', () => {
    expect(isForeignKeyRestriction({ code: 'ER_ROW_IS_REFERENCED_2', errno: 1451 })).toBe(true)
    expect(isForeignKeyRestriction({ code: 'ER_ROW_IS_REFERENCED' })).toBe(true)
  })

  // Gerçek çağrı biçimi: drizzle sürücü hatasını DrizzleQueryError içine sarıyor ve
  // mysql2'nin nesnesini `cause` alanına koyuyor. Yalnız dış nesneye bakan bir denetim
  // kısıtı hiç görmüyor, kullanıcı da Türkçe mesaj yerine hata sayfası alıyordu (ölçüldü).
  it('drizzle sarmalayıcısının içindeki kodu bulur', () => {
    const sarmalanmis = Object.assign(new Error('Failed query: delete from `categories` ...'), {
      cause: Object.assign(new Error('Cannot delete or update a parent row'), {
        code: 'ER_ROW_IS_REFERENCED_2',
        errno: 1451,
      }),
    })
    expect(isForeignKeyRestriction(sarmalanmis)).toBe(true)
  })

  // Kendine dönen bir cause halkası sonsuz döngüye girmemeli.
  it('döngüsel cause zincirinde takılmaz', () => {
    const donguselHata: { code: string; cause?: unknown } = { code: 'ECONNREFUSED' }
    donguselHata.cause = donguselHata
    expect(isForeignKeyRestriction(donguselHata)).toBe(false)
  })

  // Kritik: başka her hata yeniden fırlatılmalı. Bu yüklem gevşetilirse bir bağlantı
  // arızası kullanıcıya "bu kategoriye bağlı makaleler var" diye görünür ve gerçek arıza
  // hiçbir yere düşmez.
  it('başka hataları kısıt hatası saymaz', () => {
    expect(isForeignKeyRestriction({ code: 'ECONNREFUSED' })).toBe(false)
    expect(isForeignKeyRestriction(new Error('Data too long'))).toBe(false)
    expect(isForeignKeyRestriction(null)).toBe(false)
    expect(isForeignKeyRestriction(undefined)).toBe(false)
    expect(isForeignKeyRestriction('ER_ROW_IS_REFERENCED_2')).toBe(false)
  })
})
