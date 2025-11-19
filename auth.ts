import NextAuth, { type NextAuthConfig } from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import { decodeJwtPayloadClient } from '@/lib/utils/common/auth/auth-helper'
import { NextResponse } from 'next/server'

const tenant = process.env.AZURE_TENANT_ID!
const azureScopeBase = process.env.AZURE_SCOPE_BASE!

const CLIENT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_ID!
const CLIENT_SECRET = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!
const ISSUER = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? `https://login.microsoftonline.com/${tenant}/v2.0/`

const PUBLIC_PATHS = ['/auth/login', '/api/auth', '/favicon.ico', '/_next', '/images']

const config = {
  providers: [
    MicrosoftEntraID({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      issuer: ISSUER,
      // If you need extra API scopes beyond the default:
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            `${azureScopeBase}/Config.Read`,
            `${azureScopeBase}/Runs.Write`,
            `${azureScopeBase}/Runs.Read`,
          ].join(' '),
        },
      },
      // If you prefer POST client auth (optional):
      client: { token_endpoint_auth_method: 'client_secret_post' },
      checks: ['pkce', 'state'],
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: process.env.AZURE_LOGIN_REDIRECT_URI || '/auth/login',
  },

  callbacks: {
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname, origin, href } = request.nextUrl

      // Public paths are allowed through
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true

      // Not logged in → redirect manually
      if (!isLoggedIn) {
        const loginUrl = new URL('/auth/login', origin)
        loginUrl.searchParams.set('callbackUrl', href)
        return NextResponse.redirect(loginUrl)
      }

      // Otherwise allow
      return true
    },

    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token as string | undefined
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined

        if (!('email' in token) && profile && 'email' in profile) {
          token.email = (profile as { email?: string }).email
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token as any).email ?? session.user.email
      }
      ;(session as any).token = {
        groups: (token as any)?.groups,
        roles: (token as any)?.roles,
        scopes: (token as any)?.scopes,
      }

      session.accessToken = token.accessToken as string | undefined
      session.expiresAt = token.expiresAt as number | undefined

      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      const fallbackReturn = process.env.AZURE_LOGOUT_REDIRECT_URI || baseUrl
      return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
        fallbackReturn,
      )}`
    },
  },
} satisfies NextAuthConfig

export const {
  auth,
  handlers: { GET, POST },
} = NextAuth(config)
