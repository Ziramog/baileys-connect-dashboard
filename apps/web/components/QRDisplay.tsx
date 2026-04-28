'use client'

import { useEffect, useState } from 'react'
import type { QRStatus } from '@/lib/types'
import { useWhatsApp } from '@/contexts/WhatsAppContext'

interface QRDisplayProps {
  onConnected?: () => void
}

export function QRDisplay({ onConnected }: QRDisplayProps) {
  const ctx = useWhatsApp()
  const [status, setStatus] = useState<QRStatus>(ctx.status || 'idle')
  const [phone, setPhone] = useState(ctx.phone || '')
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync with context
  useEffect(() => {
    setStatus(ctx.status)
    setPhone(ctx.phone)
    if (ctx.qr_available && ctx.qrUrl) {
      setQrUrl(ctx.qrUrl)
    } else {
      setQrUrl('')
    }
  }, [ctx])

  // Watch for connected
  useEffect(() => {
    if (status === 'connected') {
      onConnected?.()
    }
  }, [status, onConnected])

  const startConnection = async () => {
    setLoading(true)
    setError('')
    try {
      await fetch('/api/proxy/qr/start', { method: 'POST' })
      await ctx.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    setLoading(true)
    try {
      await fetch('/api/proxy/qr/disconnect', { method: 'POST' })
      await ctx.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statusMessages: Record<QRStatus, string> = {
    idle: 'Iniciá la conexión para generar el código QR',
    waiting: 'Escaneá desde WhatsApp → Dispositivos vinculados',
    scanned: 'QR escaneado, esperando confirmación...',
    connected: phone ? `Conectado como ${phone}` : 'Conectado',
    disconnected: 'Sesión cerrada'
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {status === 'connected' ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-400 font-medium text-center">{statusMessages.connected}</p>
          <button
            onClick={disconnect}
            disabled={loading}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <>
          {(status === 'idle' || status === 'disconnected') && !qrUrl && (
            <button
              onClick={startConnection}
              disabled={loading}
              className="px-6 py-3 bg-green-500 text-zinc-950 font-semibold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : 'Iniciar conexión'}
            </button>
          )}

          {status === 'waiting' && qrUrl && (
            <div className="flex flex-col items-center gap-4">
              <img src={qrUrl} alt="QR Code" className="border-4 border-zinc-800 rounded-xl" />
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-400">{statusMessages.waiting}</span>
              </div>
            </div>
          )}

          {(status === 'scanned' || (status === 'waiting' && !qrUrl)) && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-yellow-400">Procesando...</span>
            </div>
          )}
        </>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {status === 'disconnected' && !error && (
        <p className="text-zinc-500 text-sm">{statusMessages.disconnected}</p>
      )}
    </div>
  )
}
