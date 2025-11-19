import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/common/ui/ui-helper'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        passed: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        successful: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        failed: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        skipped: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        queued: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        started: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        not_started: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      },
    },
    defaultVariants: {
      variant: 'not_started',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
