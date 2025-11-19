'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, Settings, LogOut } from 'lucide-react'
import { Logo } from '@/components/common/logo'
import { Avatar, AvatarFallback } from '@/components/common/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/ui/dropdown-menu'
import { Button } from '@/components/common/ui/button'
import { LinkButton } from '@/components/common/ui/link-button'
import { SIGN_IN_AUTHENTICATED } from '@/lib/constants'

export function Header() {
  const { status, data } = useSession()

  const fullName = data?.user?.name || data?.user?.email || ''
  const initial = (fullName?.charAt(0) || 'U').toUpperCase()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center justify-between w-full px-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {status === SIGN_IN_AUTHENTICATED ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block">{fullName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Use onSelect for shadcn DropdownMenuItem clicks */}
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    // No args required; NextAuth will federate-logout via the redirect callback
                    signOut().catch(console.error)
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LinkButton href="/auth/login">Log In</LinkButton>
          )}
        </div>
      </div>
    </header>
  )
}
