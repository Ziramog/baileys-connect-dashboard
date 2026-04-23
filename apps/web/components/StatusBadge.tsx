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
  new: { label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400' },
  contacted: { label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400' },
  followup_1: { label: 'Seguimiento 1', color: 'bg-orange-500/20 text-orange-400' },
  followup_2: { label: 'Seguimiento 2', color: 'bg-orange-600/20 text-orange-500' },
  hot: { label: 'Hot', color: 'bg-red-500/20 text-red-400' },
  discarded: { label: 'Descartado', color: 'bg-zinc-700 text-zinc-500' }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-zinc-700 text-zinc-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}