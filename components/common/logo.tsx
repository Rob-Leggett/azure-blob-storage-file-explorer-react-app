import Image from 'next/image'
import { cn } from '@/lib/utils/common/ui/ui-helper'

interface LogoProps {
  className?: string
  variant?: 'default' | 'white'
  height?: number
}

export function Logo({ className, variant = 'default', height = 30 }: LogoProps) {
  return (
    <div className={cn('logo flex items-center', className)}>
      <Image
        src="/images/logo.png"
        alt="Random Incorporated"
        width={202}
        height={height}
        className={cn('h-auto w-full max-w-[170px]', variant === 'white' && 'brightness-0 invert')}
        priority
      />
    </div>
  )
}
