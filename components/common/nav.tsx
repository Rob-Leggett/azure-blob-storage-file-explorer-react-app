'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Cloud,
  LayoutDashboard,
  FolderCog,
} from 'lucide-react'
import { cn } from '@/lib/utils/common/ui/ui-helper'
import { Button } from '@/components/common/ui/button'

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Azure',
    href: '/azure',
    icon: Cloud,
    children: [
      { title: 'File Explorer', href: '/azure/file-explorer', icon: FolderCog },
    ],
  }
]

export function Nav() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname && pathname.startsWith(href + '/'))

  return (
    <>
      {/* MOBILE: vertical icon rail (left) */}
      <aside className="md:hidden inset-y-0 left-0 z-40 w-14 border-r bg-sidebar-background">
        <nav className="flex h-full flex-col items-center gap-2 p-2">
          {navItems.map((item) => {
            const activeTop = isActive(item.href)
            const hasChildren = !!item.children?.length

            return (
              <div key={item.href} className="flex w-full flex-col items-center">
                {/* parent icon */}
                <Button
                  asChild
                  size="icon"
                  variant={activeTop ? 'secondary' : 'ghost'}
                  className={cn('h-11 w-11 rounded-lg', activeTop && 'bg-sidebar-accent text-primary-foreground')}
                  aria-label={item.title}
                  title={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                  </Link>
                </Button>

                {/* children icons (always visible, slightly indented) */}
                {hasChildren && (
                  <div className="mt-1 flex w-full flex-col items-center gap-1">
                    {item.children!.map((child) => {
                      const activeChild = isActive(child.href)

                      return (
                        <Button
                          key={child.href}
                          asChild
                          size="icon"
                          variant={activeChild ? 'secondary' : 'ghost'}
                          className={cn(
                            'h-9 w-9 rounded-lg',
                            activeChild && 'bg-sidebar-accent text-primary-foreground',
                          )}
                          aria-label={child.title}
                          title={child.title}
                        >
                          <Link href={child.href}>
                            <child.icon className="h-4 w-4" />
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* DESKTOP: fixed sidebar with labels (unchanged) */}
      <aside className="hidden md:flex group w-16 flex-col border-r bg-sidebar-background text-gray-700 dark:text-gray-200 transition-all hover:w-64 md:w-64">
        <nav className="grid gap-1 px-2 py-4">
          {navItems.map((item) => {
            const activeTop = isActive(item.href)

            return (
              <div key={item.href}>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    'flex h-10 items-center justify-start gap-3 rounded-lg px-3 whitespace-nowrap',
                    activeTop && 'bg-sidebar-accent font-medium text-primary-foreground',
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="hidden group-hover:inline-block md:inline-block truncate max-w-[14rem]">
                      {item.title}
                    </span>
                  </Link>
                </Button>

                {item.children && (
                  <div className="ml-8 mt-1 flex flex-col gap-1">
                    {item.children.map((child) => {
                      const activeChild = isActive(child.href)

                      return (
                        <Button
                          key={child.href}
                          asChild
                          variant="ghost"
                          className={cn(
                            'flex h-9 items-center justify-start gap-2 rounded-lg px-3 text-sm whitespace-nowrap',
                            activeChild && 'bg-sidebar-accent font-medium text-primary-foreground',
                          )}
                        >
                          <Link href={child.href}>
                            <child.icon className="h-4 w-4" />
                            <span className="hidden group-hover:inline-block md:inline-block truncate max-w-[14rem]">
                              {child.title}
                            </span>
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
