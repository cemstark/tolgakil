'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { loginRateLimiter, loginRateLimitKey } from '@/lib/login-rate-limit'
import { loginSchema, toFormState, type FormState } from '@/lib/validation'

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur ve kullanıcı "Giriş yap"a
  // basıp hiçbir şey olmadığını görür (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // peek: sayaç authorize içinde işletiliyor, burada yalnız okunuyor. Amaç kullanıcıya
  // "parola hatalı" yerine doğru Türkçe mesajı gösterebilmek; sınırın kendisi burada
  // durmuyor, çünkü bu action tek giriş yolu değil.
  const limit = loginRateLimiter.peek(loginRateLimitKey(parsed.data.email))
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterMs / 60_000)
    return { ok: false, errors: {}, message: `Çok fazla deneme yapıldı. ${minutes} dakika sonra tekrar deneyin.` }
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
