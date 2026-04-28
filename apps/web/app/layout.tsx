import type { Metadata } from 'next'
import './globals.css'
import { ClientLayout } from '@/components/ClientLayout'

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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}