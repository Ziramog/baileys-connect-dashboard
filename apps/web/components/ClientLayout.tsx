'use client'

import { WhatsAppProvider } from '@/contexts/WhatsAppContext'
import { Sidebar } from '@/components/Sidebar'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <WhatsAppProvider>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">{children}</main>
      </div>
    </WhatsAppProvider>
  )
}
