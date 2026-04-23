import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Wolfim Dashboard',
  description: 'WhatsApp Outreach Dashboard'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 ml-64">{children}</main>
        </div>
      </body>
    </html>
  )
}