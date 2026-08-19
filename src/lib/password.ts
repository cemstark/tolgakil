import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'

// Parola özeti üreten her yer bu seçenekleri kullanır. Değerler argon2 paketinin bugünkü
// varsayılanlarıyla aynı ama açıkça yazılıyor: paket varsayılanı değişirse yeni özetler
// sessizce farklı parametre almasın.
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

// Kullanıcı bulunamadığında da doğrulama maliyetini ödemek için kullanılan sahte özet;
// "bu e-posta kayıtlı mı" sorusunun yanıt süresinden okunmasını zorlaştırır.
// ARGON2_OPTIONS'tan üretiliyor: elle yazılmış sabit bir dize, seçenekler değiştiği anda
// gerçek özetlerle aynı maliyeti taşımayı bırakır ve zamanlama farkı sessizce geri gelir.
// İlk ihtiyaçta bir kez üretilip önbelleğe alınıyor; parolası rastgele, kimse doğrulayamaz.
let dummyHashPromise: Promise<string> | undefined

export function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString('hex'))
  return dummyHashPromise
}
