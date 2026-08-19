import type { NextAuthConfig } from 'next-auth'

// Veritabanı ve argon2 içermeyen ortak yapılandırma. proxy.ts Next 16'da Node çalışma
// zamanında koşsa da ayrı bir paket olarak derleniyor; argon2 yerel ikili, mysql2 ise
// bağlantı havuzu taşıdığı için ikisi de o pakete girmemeli.
export const authConfig = {
  pages: { signIn: '/panel/giris' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
    jwt({ token, user }) {
      // user yalnız giriş anında dolu gelir; sonraki isteklerde token olduğu gibi taşınır.
      if (user) {
        token.uid = Number(user.id)
        token.role = user.role
        token.name = user.name
      }
      return token
    },
    session({ session, token }) {
      session.user.id = String(token.uid)
      session.user.role = token.role
      return session
    },
  },
} satisfies NextAuthConfig
