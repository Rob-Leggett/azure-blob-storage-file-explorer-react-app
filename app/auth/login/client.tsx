'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/common/ui/button'
import { Loader2 } from 'lucide-react'
import { mapError } from '@/lib/utils/common/auth/auth-helper'
import { SIGN_IN_AZURE, SIGN_IN_AUTHENTICATED, SIGN_IN_LOADING, SIGN_IN_UNAUTHENTICATED } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/ui/card'

export default function LoginPage({ initialError }: { initialError?: string }) {
  const { status } = useSession()
  const router = useRouter()
  const sp = useSearchParams()
  const callbackUrl = sp?.get('callbackUrl') || '/dashboard'
  const started = useRef(false)

  const [errorCode, setErrorCode] = useState<string | undefined>(initialError)
  const errorMessage = useMemo(() => mapError(errorCode), [errorCode])

  useEffect(() => {
    if (!errorMessage && status === SIGN_IN_AUTHENTICATED) {
      router.replace(callbackUrl)
    }
  }, [status, errorMessage, router, callbackUrl])

  useEffect(() => {
    if (!errorMessage && status === SIGN_IN_UNAUTHENTICATED && !started.current) {
      started.current = true
      // v5 client still accepts callbackUrl
      signIn(SIGN_IN_AZURE, { callbackUrl }).catch(console.error)
    }
  }, [status, errorMessage, callbackUrl])

  const retry = () => {
    setErrorCode(undefined)
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    router.replace(`${url.pathname}${url.searchParams.toString() ? `?${url.searchParams}` : ''}`)
    started.current = false
    signIn(SIGN_IN_AZURE, { callbackUrl }).catch(console.error)
  }

  const showManualButton = !!errorMessage || status === SIGN_IN_UNAUTHENTICATED

  return (
    <div className="flex flex-col gap-6 bg-white">
      {/* Thick red bar at top */}
      <div className="h-2 w-full bg-red-600 rounded-md" />

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="items-center space-y-3">
            <div
              aria-label="Random Incorporated"
              className="select-none rounded-full bg-red-600 px-4 py-1 text-sm font-semibold uppercase tracking-widest text-white"
            >
              Random Incorporated
            </div>

            <CardTitle className="text-center text-2xl">Automation Portal</CardTitle>
            <CardDescription className="text-center">
              Sign in with your Microsoft (Entra ID) work account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div role="alert" className="w-full rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                <div className="mb-1 font-medium">Sign-in error</div>
                <div className="mb-3">{errorMessage}</div>
                <div className="flex justify-center gap-2">
                  <Button variant="destructive" onClick={retry}>
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {!errorMessage && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {(status === SIGN_IN_LOADING || status === SIGN_IN_AUTHENTICATED) && (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>
                      {status === SIGN_IN_LOADING && 'Checking your session…'}
                      {status === SIGN_IN_AUTHENTICATED && 'Signing you in…'}
                    </span>
                  </>
                )}
                {status === SIGN_IN_UNAUTHENTICATED && (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Redirecting to Microsoft sign-in…</span>
                  </>
                )}
              </div>
            )}

            {showManualButton && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => signIn(SIGN_IN_AZURE, { callbackUrl: '/dashboard' }).catch(console.error)}
                >
                  Continue with Microsoft
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  By continuing, you agree to the Random Incorporated acceptable use policy.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
