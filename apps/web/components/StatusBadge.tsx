import type { QRStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: QRStatus | string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  idle: { label: 'Idle', color: 'bg-zinc-700 text-zinc-300' },
  waiting: { label: 'Esperando QR', color: 'bg-yellow-500/20 text-yellow-400' },
  scanned: { label: 'Escaneado', color: 'bg-blue-500/20 text-blue-400' },
  connected: { label: 'Conectado', color: 'bg-green-500/20 text-green-400' },
  disconnected: { label: 'Desconectado', color: 'bg-red-500/20 text-red-400' },
  // Outreach statuses
  pending: { label: 'Pendiente', color: 'bg-blue-500/20 text-blue-400' },
  enriched: { label: 'Enriquecido', color: 'bg-purple-500/20 text-purple-400' },
  outreach_sent: { label: 'Intro enviada', color: 'bg-green-500/20 text-green-400' },
  replied: { label: 'Respondió', color: 'bg-green-600/20 text-green-500' },
  qualified: { label: 'Calificado', color: 'bg-red-500/20 text-red-400' },
  rejected: { label: 'Rechazado', color: 'bg-zinc-700 text-zinc-500' },
  new: { label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400' },
  hot: { label: 'Hot', color: 'bg-red-500/20 text-red-400' },
  discarded: { label: 'Descartado', color: 'bg-zinc-700 text-zinc-500' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-zinc-700 text-zinc-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
