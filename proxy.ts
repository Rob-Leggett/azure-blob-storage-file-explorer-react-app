import { auth } from './auth'
import { NextRequest } from 'next/server'

// Export a function named `proxy` (or default export) that is a Next middleware
export default auth(function proxy(req: NextRequest) {
  // Let preflights through if you need it
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  // Do nothing else; `authorized` above decides access + redirect
})
