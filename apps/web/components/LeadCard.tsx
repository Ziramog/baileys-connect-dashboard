'use client'

import type { Lead } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface LeadCardProps {
  lead: Lead
  onAction: (action: string) => void
}

function formatPhone(phone: string) {
  if (!phone) return ''
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('549')) return `+${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)} ${clean.slice(10)}`
  if (clean.startsWith('54')) return `+${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 9)} ${clean.slice(9)}`
  if (clean.startsWith('0')) return `+54 ${clean.slice(1, 4)} ${clean.slice(4, 8)} ${clean.slice(8)}`
  return phone
}

export function LeadCard({ lead, onAction }: LeadCardProps) {
  const actions: Record<string, { label: string; color: string }> = {
    send_intro: { label: 'Enviar intro', color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' },
    send_followup: { label: 'Seguimiento', color: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' },
    mark_hot: { label: 'Marcar hot', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30' },
    discard: { label: 'Descartar', color: 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600' }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-zinc-100 truncate">{lead.nombre}</h4>
          <p className="text-sm text-zinc-400">{formatPhone(lead.telefono)}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-500">{lead.ciudad}{lead.zona ? ` · ${lead.zona}` : ''}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{lead.fuente}</span>
          </div>
        </div>
        <StatusBadge status={lead.outreach_status} />
      </div>

      {/* Website & Social */}
      <div className="space-y-1 mb-3">
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 truncate">
            <span className="text-zinc-600">🌐</span>
            <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {lead.instagram && (
          <a href={`https://${lead.instagram}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 truncate">
            <span className="text-zinc-600">📸</span>
            <span className="truncate">{lead.instagram.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
            <span className="text-zinc-600">✉️</span>
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.direccion && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate">
            <span className="text-zinc-600">📍</span>
            <span className="truncate">{lead.direccion}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600 mb-3">
        <span>Creado: {new Date(lead.scraped_at).toLocaleDateString('es-AR')}</span>
        {lead.outreach_sent_at && (
          <span>Enviado: {new Date(lead.outreach_sent_at).toLocaleDateString('es-AR')}</span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(actions).map(([action, config]) => (
          <button
            key={action}
            onClick={() => onAction(action)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${config.color}`}
          >
            {config.label}
          </button>
        ))}
      </div>
    </div>
  )
}
