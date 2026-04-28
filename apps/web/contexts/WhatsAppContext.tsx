'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { QRStatus } from '@/lib/types'

interface WhatsAppState {
  status: QRStatus
  phone: string
  qr_available: boolean
  qrUrl: string
}

interface WhatsAppContextValue extends WhatsAppState {
  refresh: () => Promise<void>
}

const WhatsAppContext = createContext<WhatsAppContextValue>({
  status: 'idle',
  phone: '',
  qr_available: false,
  qrUrl: '',
  refresh: async () => {}
})

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WhatsAppState>({
    status: 'idle',
    phone: '',
    qr_available: false,
    qrUrl: ''
  })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/qr/status')
      const data = await res.json()
      setState({
        status: data.status || 'idle',
        phone: data.phone || '',
        qr_available: data.qr_available || false,
        qrUrl: data.qr_available ? `/api/proxy/qr/image?t=${Date.now()}` : ''
      })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <WhatsAppContext.Provider value={{ ...state, refresh }}>
      {children}
    </WhatsAppContext.Provider>
  )
}

export function useWhatsApp() {
  return useContext(WhatsAppContext)
}
