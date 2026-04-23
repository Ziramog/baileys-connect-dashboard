'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/StatsCard'
import type { Stats } from '@/lib/types'

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/proxy/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Estadísticas</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Enviados hoy" value={stats.sent_today} />
        <StatsCard title="Enviados semana" value={stats.sent_week} />
        <StatsCard title="Pendientes" value={stats.pending} />
        <StatsCard title="Hot leads" value={stats.hot_leads} />
        <StatsCard title="Tasa respuesta" value={`${stats.response_rate}%`} />
        <StatsCard title="Tasa conversión" value={`${stats.conversion_rate}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-medium mb-4">Por ciudad</h3>
          {stats.by_city.length === 0 ? (
            <p className="text-zinc-500 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {stats.by_city.map(c => {
                const max = Math.max(...stats.by_city.map(x => x.count))
                return (
                  <div key={c.city}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{c.city}</span>
                      <span className="text-zinc-400">{c.count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${(c.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-medium mb-4">Por estado</h3>
          {stats.by_status.length === 0 ? (
            <p className="text-zinc-500 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {stats.by_status.map(s => {
                const total = stats.by_status.reduce((acc, x) => acc + x.count, 0)
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                return (
                  <div key={s.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{s.status.replace('_', ' ')}</span>
                      <span className="text-zinc-400">{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}