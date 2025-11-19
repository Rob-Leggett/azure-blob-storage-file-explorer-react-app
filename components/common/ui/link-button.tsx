'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/common/ui/ui-helper'

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  className?: string
  children: React.ReactNode
}

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, href, children, ...props }, ref) => {
    return (
      <Link
        href={href}
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          className,
        )}
        {...props}
      >
        {children}
      </Link>
    )
  },
)

LinkButton.displayName = 'LinkButton'

export { LinkButton }
