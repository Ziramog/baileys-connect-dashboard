'use client'

import type { Lead } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface LeadCardProps {
  lead: Lead
  onAction: (action: string) => void
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
        <div>
          <h4 className="font-medium text-zinc-100">{lead.name}</h4>
          <p className="text-sm text-zinc-500">{lead.phone}</p>
          <p className="text-xs text-zinc-600 mt-1">{lead.city}</p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        Creado: {new Date(lead.created_at).toLocaleDateString('es-AR')}
        {lead.last_contact && <span> · Última acción: {new Date(lead.last_contact).toLocaleDateString('es-AR')}</span>}
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