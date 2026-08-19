'use server'

import { headers } from 'next/headers'
import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { loginSchema, toFormState, type FormState } from '@/lib/validation'

const limiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 })

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  // toFieldErrors DEĞİL: path taşımayan hatalar orada kaybolur ve kullanıcı "Giriş yap"a
  // basıp hiçbir şey olmadığını görür (Görev 1-2 sözleşmesi).
  if (!parsed.success) return toFormState(parsed.error)

  // x-forwarded-for yoksa e-postaya düşüyoruz: sabit bir anahtar kullanmak tek bir saldırganın
  // herkesin girişini kilitlemesine yol açardı.
  const forwarded = (await headers()).get('x-forwarded-for')
  const key = forwarded?.split(',')[0]?.trim() || `email:${parsed.data.email}`
  const limit = limiter.check(key)
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
