'use client'

import { useEffect, useState } from 'react'
import type { QRStatus } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'

export default function ConnectPage() {
  const [status, setStatus] = useState<QRStatus>('idle')
  const [qrUrl, setQrUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/proxy/qr/status')
        const data = await res.json()
        setStatus(data.status)
        setPhone(data.phone || '')
        if (data.qr_available) {
          setQrUrl(`/api/proxy/qr/image?t=${Date.now()}`)
        } else {
          setQrUrl('')
        }
      } catch {}
    }, 2000)
    return () => clearInterval(poll)
  }, [])

  const startConnection = async () => {
    setLoading(true)
    try {
      await fetch('/api/proxy/qr/start', { method: 'POST' })
    } catch {}
    finally { setLoading(false) }
  }

  const disconnect = async () => {
    setLoading(true)
    try {
      await fetch('/api/proxy/qr/disconnect', { method: 'POST' })
      setStatus('idle')
      setQrUrl('')
      setPhone('')
    } catch {}
    finally { setLoading(false) }
  }

  const statusMessages: Record<QRStatus, string> = {
    idle: 'Inicia la conexión para generar el código QR',
    waiting: 'Escaneá desde WhatsApp → Dispositivos vinculados',
    scanned: 'QR escaneado, esperando confirmación...',
    connected: `Conectado como ${phone}`,
    disconnected: 'Sesión cerrada'
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Conectar WhatsApp</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-zinc-400">Estado</span>
          <StatusBadge status={status} />
        </div>

        <p className="text-center text-zinc-500 mb-6">{statusMessages[status]}</p>

        {status === 'idle' && (
          <button
            onClick={startConnection}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-500 text-zinc-950 font-semibold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Iniciando...' : 'Iniciar conexión'}
          </button>
        )}

        {status === 'waiting' && qrUrl && (
          <div className="flex flex-col items-center gap-4">
            <img src={qrUrl} alt="QR Code" className="border-4 border-zinc-800 rounded-xl" />
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-400">Esperando escaneo...</span>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Desconectar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}