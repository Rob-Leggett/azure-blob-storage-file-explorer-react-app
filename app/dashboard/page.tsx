import DashboardPage from './client'
import { auth } from '@/auth'
import { unstable_noStore as noStore } from 'next/cache'

// Force this route to be dynamic (it uses headers/cookies via NextAuth)
export const dynamic = 'force-dynamic'

export const revalidate = 0

export default async function DashboardSSRPage() {
  // Explicitly opt out of any implicit caching for this request
  noStore()

  // Resolve the user session for this request
  await auth()

  return <DashboardPage />
}
