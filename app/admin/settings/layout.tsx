import type { ReactNode } from 'react'

import { Nav } from '@/components/common/nav'
import { Header } from '@/components/common/header'

interface AdminSettingsLayoutProps {
  children: ReactNode
}

export default function AdminSettingsLayout({ children }: AdminSettingsLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Nav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
