import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    expiresAt?: number
    user?: {
      email?: string | null
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    expiresAt?: number
    email?: string

    // if you set these in callbacks, you can type them too:
    groups?: string[]
    roles?: string[]
    scopes?: string
  }
}
