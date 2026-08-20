import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/auth.config'
import { authorizeCredentials } from '@/lib/authorize'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: authorizeCredentials,
    }),
  ],
})
