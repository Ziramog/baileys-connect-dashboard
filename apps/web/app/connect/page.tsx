'use client'

import { useState } from 'react'
import { QRDisplay } from '@/components/QRDisplay'
import { LogTerminal } from '@/components/LogTerminal'
import { useWhatsApp } from '@/contexts/WhatsAppContext'
import { StatusBadge } from '@/components/StatusBadge'
import type { DaemonStatus } from '@/lib/types'

export default function ConnectPage() {
  const wa = useWhatsApp()
  const [daemon, setDaemon] = useState<DaemonStatus | null>(null)
  const [loadingDaemon, setLoadingDaemon] = useState(false)

  const fetchDaemon = async () => {
    setLoadingDaemon(true)
    try {
      const res = await fetch('/api/proxy/daemon/status')
      const data = await res.json()
      setDaemon(data)
    } catch {}
    finally { setLoadingDaemon(false) }
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">WhatsApp</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* QR Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-medium">Conexión</h2>
            <StatusBadge status={wa.status} />
          </div>

          {wa.phone && (
            <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-medium">{wa.phone}</p>
              <p className="text-green-400/70 text-xs mt-1">WhatsApp conectado</p>
            </div>
          )}

          <div className="flex justify-center">
            <QRDisplay />
          </div>
        </div>

        {/* Daemon Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-medium">Daemon</h2>
            <button
              onClick={fetchDaemon}
              disabled={loadingDaemon}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded bg-zinc-800 disabled:opacity-50"
            >
              {loadingDaemon ? '...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Estado</span>
              <div className={`flex items-center gap-2 ${daemon?.running ? 'text-green-400' : 'text-zinc-500'}`}>
                <div className={`w-2 h-2 rounded-full ${daemon?.running ? 'bg-green-400' : 'bg-zinc-600'}`} />
                {daemon?.running ? 'Online' : 'Offline'}
              </div>
            </div>

            {daemon?.running && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Uptime</span>
                  <span className="text-zinc-200 font-mono">{formatUptime(daemon.uptime || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Leads procesados hoy</span>
                  <span className="text-zinc-200">{daemon.leads_processed_today || 0}</span>
                </div>
                {daemon.next_run && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Próximo ciclo</span>
                    <span className="text-zinc-400 text-xs">{daemon.next_run}</span>
                  </div>
                )}
              </>
            )}

            {!daemon && !loadingDaemon && (
              <p className="text-zinc-600 text-sm">Sin datos. Click refresh.</p>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      <LogTerminal maxLines={60} />
    </div>
  )
}
