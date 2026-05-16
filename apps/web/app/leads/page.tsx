'use client'

import { useEffect, useState } from 'react'
import type { Lead } from '@/lib/types'
import { LeadCard } from '@/components/LeadCard'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [verticalFilter, setVerticalFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [verticals, setVerticals] = useState<{ vertical: string; count: number }[]>([])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (cityFilter) params.set('city', cityFilter)
      if (verticalFilter) params.set('vertical', verticalFilter)
      const data = await fetch(`/api/proxy/leads?${params}`).then(r => r.json())
      setLeads(data.leads)
      setTotal(data.total)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/leads/cities').then(r => r.json()),
      fetch('/api/proxy/leads/verticals').then(r => r.json())
    ]).then(([cityData, verticalData]) => {
      setCities(cityData.cities || [])
      setVerticals(verticalData.verticals || [])
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchLeads() }, [page, statusFilter, cityFilter, verticalFilter])

  const handleAction = async (leadId: string, action: string) => {
    try {
      await fetch(`/api/proxy/leads/${leadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      await fetchLeads()
    } catch {}
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="text-sm text-zinc-500">{total} total</div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <select
          value={verticalFilter}
          onChange={e => { setVerticalFilter(e.target.value); setPage(1) }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="">Todas ({total})</option>
          {verticals.map(v => (
            <option key={v.vertical} value={v.vertical}>
              {v.vertical} ({v.count})
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="outreach_sent">Enviado</option>
          <option value="replied">Respondido</option>
          <option value="qualified">Hot</option>
          <option value="rejected">Descartado</option>
        </select>

        <select
          value={cityFilter}
          onChange={e => { setCityFilter(e.target.value); setPage(1) }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
        >
          <option value="">Todas las ciudades</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No hay leads</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onAction={action => handleAction(lead.id, action)} />
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-zinc-500">Página {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={leads.length < 20}
              className="px-4 py-2 bg-zinc-800 rounded-lg text-sm disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  )
}