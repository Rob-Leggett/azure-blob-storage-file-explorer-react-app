import LoginPage from '@/app/auth/login/client'

export const dynamic = 'force-dynamic' // auth flow depends on runtime state

export default async function LoginSSRPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : undefined

  return <LoginPage initialError={error} />
}
