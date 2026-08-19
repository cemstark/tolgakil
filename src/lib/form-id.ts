/**
 * Gizli alandan veya adres çubuğundan gelen kayıt kimliğini çözer.
 *
 * Kimlik de kullanıcı verisi: boşsa yeni kayıt, doluysa pozitif tam sayı olmak zorunda.
 * `Number` doğrudan kullanılamaz — `Number('3e2')` sessizce 300, `Number('-5')` negatif bir
 * kimlik üretir ve ikisi de `Number.isInteger`'dan geçer. Kimlikler autoincrement olduğu
 * için yalnız pozitif tam sayı olabilir; aksi hâlde var olmayan satıra referans verilip
 * kullanıcıya 500 dönerdi.
 *
 * @returns Sayı, "alan yok" için `null`, biçimi bozuksa `'invalid'`.
 */
export function parseFormId(value: FormDataEntryValue | null): number | null | 'invalid' {
  if (typeof value !== 'string' || value.trim() === '') return null
  return /^[1-9]\d*$/.test(value.trim()) ? Number(value.trim()) : 'invalid'
}

/** Rota parametresi için aynı yüklem; biçim bozuksa çağıran notFound() çağırır. */
export function isRouteId(value: string): boolean {
  return /^[1-9]\d*$/.test(value)
}
