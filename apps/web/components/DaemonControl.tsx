'use client'

import { useEffect, useState } from 'react'
import type { DaemonStatus } from '@/lib/types'

export function DaemonControl() {
  const [status, setStatus] = useState<DaemonStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStatus = async () => {
    try {
      const data = await fetch('/api/proxy/daemon/status').then(r => r.json())
      setStatus(data)
    } catch {}
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const control = async (action: string) => {
    setLoading(true)
    setError('')
    try {
      await fetch(`/api/proxy/daemon/${action}`, { method: 'POST' })
      await fetchStatus()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Daemon Outreach</h3>
        <div className={`w-2 h-2 rounded-full ${status?.running ? 'bg-green-400' : 'bg-zinc-600'}`} />
      </div>

      <div className="space-y-2 text-sm text-zinc-400 mb-4">
        <div className="flex justify-between">
          <span>Estado</span>
          <span className={status?.running ? 'text-green-400' : 'text-zinc-500'}>
            {status?.running ? 'Activo' : 'Detenido'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Uptime</span>
          <span>{formatUptime(status?.uptime)}</span>
        </div>
        <div className="flex justify-between">
          <span>Leads hoy</span>
          <span>{status?.leads_processed_today ?? 0}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {status?.running ? (
          <button
            onClick={() => control('stop')}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
          >
            Detener
          </button>
        ) : (
          <button
            onClick={() => control('start')}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
          >
            Iniciar
          </button>
        )}
        <button
          onClick={() => control('restart')}
          disabled={loading}
          className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 text-sm"
        >
          Reiniciar
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}