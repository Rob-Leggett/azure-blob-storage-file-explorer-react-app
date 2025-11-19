import React from 'react'
import type { Metadata } from 'next'
import { Toaster } from '@/components/common/ui/toaster'
import AuthApp from '@/lib/providers/common/auth/auth-provider'

import './globals.css'

export const metadata: Metadata = {
  title: 'React App',
  description: 'Azure Blob Storage File Explorer',
  generator: '',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthApp>
          {children}
          <Toaster />
        </AuthApp>
      </body>
    </html>
  )
}
