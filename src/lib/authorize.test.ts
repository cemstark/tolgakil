import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import argon2 from 'argon2'
import { inArray } from 'drizzle-orm'
import { authorizeCredentials } from '@/lib/authorize'
import { closeDb, db } from '@/db/client'
import { users } from '@/db/schema'
import { hashPassword } from '@/lib/password'

// Kullanıcı adları bu dosyaya özel: tohum hesaplarıyla çakışan bir ad, hız sınırı kovasını
// e2e süitiyle paylaşır ve iki taraf da diğerini yanlış kırmızıya düşürebilirdi.
const ETKIN = 'auth-test-etkin'
const PASIF = 'auth-test-pasif'
const YOK = 'auth-test-olmayan-hesap'
const PAROLA = 'auth-test-parolasi-yeterince-uzun'

beforeAll(async () => {
  await db.delete(users).where(inArray(users.username, [ETKIN, PASIF]))
  const passwordHash = await hashPassword(PAROLA)
  await db.insert(users).values([
    { username: ETKIN, name: 'Etkin Hesap', role: 'editor', isActive: true, passwordHash },
    { username: PASIF, name: 'Pasif Hesap', role: 'editor', isActive: false, passwordHash },
  ])
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  await db.delete(users).where(inArray(users.username, [ETKIN, PASIF]))
  await closeDb()
})

it('doğru kullanıcı adı ve parolada kimliği döndürür', async () => {
  const sonuc = await authorizeCredentials({ username: ETKIN, password: PAROLA })
  expect(sonuc).toMatchObject({ name: 'Etkin Hesap', role: 'editor' })
  // Parola özeti oturuma sızmamalı; oturumda taşınan alanlar auth.config.ts'te sayılı.
  expect(sonuc).not.toHaveProperty('passwordHash')
})

it('yanlış parolayı reddeder', async () => {
  expect(await authorizeCredentials({ username: ETKIN, password: 'yanlis-parola' })).toBeNull()
})

it('pasifleştirilmiş hesabı doğru parolada da reddeder', async () => {
  expect(await authorizeCredentials({ username: PASIF, password: PAROLA })).toBeNull()
})

// ZAMANLAMA SIZINTISI SÖZLEŞMESİ.
//
// Var olmayan bir kullanıcı adında da argon2 doğrulaması KOŞMAK zorunda: `dummyPasswordHash`
// tam olarak bunun için var. Kısa devre yapılsaydı yanıt gözle görülür ölçüde hızlanır ve
// saldırgan hangi kullanıcı adlarının kayıtlı olduğunu tek tek çıkarabilirdi.
//
// Duvar saati ÖLÇÜLMÜYOR: eşik tabanlı bir zaman iddiası paylaşımlı koşucuda kararsızdır ve
// yanlış kırmızı verir. Bunun yerine maliyetin gerçekten ödendiği doğrudan sınanıyor —
// argon2.verify her iki yolda da tam bir kez çağrılıyor.
it('olmayan kullanıcı adında da argon2 doğrulaması koşar', async () => {
  const casus = vi.spyOn(argon2, 'verify')

  expect(await authorizeCredentials({ username: YOK, password: PAROLA })).toBeNull()
  expect(casus).toHaveBeenCalledTimes(1)

  casus.mockClear()
  expect(await authorizeCredentials({ username: ETKIN, password: 'yanlis-parola' })).toBeNull()
  expect(casus).toHaveBeenCalledTimes(1)
})

it('e-posta biçimli bir kimlikle giriş yapılamaz', async () => {
  // Eski giriş kimlikleri e-posta biçimindeydi ve migration onları oldukları gibi taşıdı.
  // '@' kullanıcı adı kümesinde yok: bu değerler şemada duruyor, veritabanına hiç gitmiyor.
  expect(await authorizeCredentials({ username: 'admin@ornek.test', password: PAROLA })).toBeNull()
})
