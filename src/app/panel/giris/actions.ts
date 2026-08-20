'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { loginGate, loginRateLimitMessage } from '@/lib/login-rate-limit'
import { loginSchema, toFormState, type FormState } from '@/lib/validation'

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur ve kullanıcı "Giriş yap"a
  // basıp hiçbir şey olmadığını görür (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // check sayaca dokunmuyor: sayım authorize içinde işletiliyor, burada yalnız okunuyor.
  // Amaç kullanıcıya "parola hatalı" yerine doğru Türkçe mesajı gösterebilmek; sınırın
  // kendisi burada durmuyor, çünkü bu action tek giriş yolu değil.
  //
  // Küresel tavan da burada okunuyor: aksi hâlde tavana takılan kullanıcı authorize'dan
  // null alır ve kendi parolasını yanlış girdiğini sanırdı.
  const limitMessage = loginRateLimitMessage(loginGate.check(parsed.data.email))
  if (limitMessage !== null) {
    return { ok: false, errors: {}, message: limitMessage }
  }

  try {
    await signIn('credentials', { ...parsed.data, redirectTo: '/panel' })
  } catch (error) {
    // signIn başarılı olduğunda redirect() fırlatıyor; onu yutmak girişi sessizce bozar.
    if (error instanceof AuthError) {
      return { ok: false, errors: {}, message: 'E-posta veya parola hatalı.' }
    }
    throw error
  }
  return { ok: true, errors: {} }
}
