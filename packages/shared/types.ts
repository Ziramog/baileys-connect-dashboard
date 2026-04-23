export type QRStatus = 'idle' | 'waiting' | 'scanned' | 'connected' | 'disconnected'

export type LeadStatus = 'new' | 'contacted' | 'followup_1' | 'followup_2' | 'hot' | 'discarded'

export interface LeadAction {
  action: string
  timestamp: string
  message_sent?: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  city: string
  status: LeadStatus
  created_at: string
  last_contact?: string
  notes?: string
  actions_history: LeadAction[]
}

export interface RawLead {
  name: string
  phone: string
  city: string
}

export interface DaemonStatus {
  running: boolean
  pid?: number
  uptime?: number
  leads_processed_today: number
  next_run?: string
  last_run?: string
}

export interface Stats {
  sent_today: number
  sent_week: number
  pending: number
  hot_leads: number
  response_rate: number
  conversion_rate: number
  by_city: { city: string; count: number }[]
  by_status: { status: string; count: number }[]
}

export interface Settings {
  business_hours: {
    start: string
    end: string
    timezone: string
    days: number[]
  }
  cities: string[]
  message_templates: {
    intro: string
    followup_1: string
    followup_2: string
  }
  cooldown_minutes: number
  daily_limit: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  ok?: boolean
  message?: string
}