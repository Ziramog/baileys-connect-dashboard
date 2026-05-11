'use client'

import { useEffect, useState } from 'react'
import { DaemonControl } from '@/components/DaemonControl'
import { StatsCard } from '@/components/StatsCard'
import { useWhatsApp } from '@/contexts/WhatsAppContext'
import type { Stats } from '@/lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const wa = useWhatsApp()

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetch('/api/proxy/stats').then(r => r.json())
        setStats(data)
      } catch {}
    }
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">
            WhatsApp
          </span>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            wa.status === 'connected'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              wa.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`} />
            {wa.status === 'connected' ? (wa.phone || 'Conectado') : 'Desconectado'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DaemonControl />
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Enviados hoy"
            value={stats.sent_today}
            icon={<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          />
          <StatsCard
            title="Leads pendientes"
            value={stats.pending}
            icon={<svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatsCard
            title="Hot leads"
            value={stats.hot_leads}
            icon={<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>}
          />
          <StatsCard
            title="Tasa respuesta"
            value={`${stats.response_rate}%`}
            subtitle={`${stats.sent_week} esta semana`}
          />
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-medium mb-4">Actividad reciente</h2>
        <div className="text-zinc-500 text-sm">
          {stats?.by_status?.length ? (
            <div className="space-y-2">
              {stats.by_status.map((s: { status: string; count: number }) => (
                <div key={s.status} className="flex justify-between items-center">
                  <span className="capitalize">{s.status.replace('_', ' ')}</span>
                  <span className="text-zinc-400">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Sin actividad aún</p>
          )}
        </div>
      </div>

      {stats?.by_vertical && stats.by_vertical.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
          <h2 className="font-medium mb-4">Por vertical</h2>
          <div className="space-y-2">
            {stats.by_vertical.map((v: { vertical: string; count: number }) => (
              <div key={v.vertical} className="flex justify-between items-center">
                <span className="capitalize text-zinc-300">{v.vertical}</span>
                <span className="text-zinc-400">{v.count} leads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}