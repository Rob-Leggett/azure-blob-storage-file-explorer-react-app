import { Session } from 'next-auth'
import { toStrArray } from '@/lib/utils/common/string-helper'

export function mapError(code?: string): string {
  switch (code) {
    case 'OAuthSignin':
      return 'Could not start Microsoft sign-in. Please try again.'
    case 'OAuthCallback':
      return 'We couldn’t complete Microsoft sign-in. This can happen if the redirect URL or tenant config doesn’t match.'
    case 'OAuthCreateAccount':
      return 'Your Microsoft account is not allowed to sign in.'
    case 'AccessDenied':
      return 'Access denied. You might not have permission to use this app.'
    case 'Configuration':
      return 'Sign-in is misconfigured. Please contact support.'
    case 'Verification':
      return 'The verification link is invalid or has expired.'
    case 'SessionRequired':
      return 'Please sign in to continue.'
    case 'CredentialsSignin':
      return 'Invalid credentials.'
    default:
      return code ? `Sign-in failed: ${code}` : ''
  }
}

/** Pull “roles” from common places the NextAuth session might expose them */
export function extractRoles(session: Session | null): string[] {
  const any = session as any
  const fromUser = toStrArray(any?.user?.roles)
  const fromSession = toStrArray(any?.roles)
  const fromToken = toStrArray(any?.token?.roles) || toStrArray(any?.accessToken?.roles)
  const fromAppRoles = toStrArray(any?.user?.appRoles) || toStrArray(any?.appRoles)
  const merged = [...fromUser, ...fromSession, ...fromToken, ...fromAppRoles]

  return Array.from(new Set(merged))
}

/** Pull “groups” from common places the NextAuth session might expose them */
export function extractGroups(session: Session | null): string[] {
  const any = session as any
  const fromUser = toStrArray(any?.user?.groups)
  const fromSession = toStrArray(any?.groups)
  const fromToken = toStrArray(any?.token?.groups) || toStrArray(any?.accessToken?.groups)
  const merged = [...fromUser, ...fromSession, ...fromToken]

  return Array.from(new Set(merged))
}

export function extractScopes(session: any): string[] {
  // Preferred: from server-exposed session.token.scopes
  const fromSession = toStrArray(session?.token?.scopes)
  if (fromSession.length) return Array.from(new Set(fromSession))

  // Fallback: decode accessToken on the client and read 'scp'
  const payload = decodeJwtPayloadClient<{ scp?: string }>(session?.accessToken)
  if (payload?.scp) {
    return payload.scp
      .split(/[ \t\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return []
}

export function decodeJwtPayloadClient<T = any>(jwt?: string): T | null {
  if (!jwt) return null
  const [, payload] = jwt.split('.')
  if (!payload) return null
  try {
    // base64url → base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json =
      typeof window === 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf8')
        : decodeURIComponent(escape(window.atob(base64)))

    return JSON.parse(json) as T
  } catch {
    return null
  }
}
