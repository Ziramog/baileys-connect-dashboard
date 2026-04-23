import type { Lead, DaemonStatus, Stats, Settings, QRStatus } from '../../../packages/shared/types'

export type { Lead, DaemonStatus, Stats, Settings, QRStatus }

export interface ApiResponse<T> {
  data?: T
  error?: string
  ok?: boolean
  message?: string
}