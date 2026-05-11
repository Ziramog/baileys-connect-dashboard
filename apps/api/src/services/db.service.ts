import { config } from '../config.js'
import { v4 as uuidv4 } from 'uuid'
import type { Lead, RawLead, Stats, Settings } from '../../../../packages/shared/types'

class DbService {
  private supabaseUrl = ''
  private supabaseKey = ''
  private headers: Record<string, string> = {}

  init() {
    this.supabaseUrl = config.supabaseUrl
    this.supabaseKey = config.supabaseServiceKey
    this.headers = {
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.supabaseKey}`,
      'Content-Type': 'application/json'
    }
    console.log('[DB] Supabase REST client initialized')
  }

  private async supabaseGet(table: string, params: string = ''): Promise<any[]> {
    const url = `${this.supabaseUrl}/rest/v1/${table}${params ? '?' + params : ''}`
    const res = await fetch(url, { headers: this.headers })
    const json = await res.json()
    const data = Array.isArray(json) ? json : []
    return data
  }

  private async supabasePost(table: string, body: any): Promise<any> {
    const url = `${this.supabaseUrl}/rest/v1/${table}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  private async supabasePatch(table: string, params: string, body: any): Promise<any> {
    const url = `${this.supabaseUrl}/rest/v1/${table}${params ? '?' + params : ''}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  private async supabaseCount(table: string, params: string = ''): Promise<number> {
    const url = `${this.supabaseUrl}/rest/v1/${table}${params ? '?' + params : ''}`
    const res = await fetch(url, {
      headers: { ...this.headers, 'Prefer': 'count=exact' }
    })
    const count = res.headers.get('content-range')?.split('/')[1] || '0'
    return parseInt(count)
  }

  private mapLead(row: any): Lead {
    return {
      id: row.id,
      vertical: row.vertical || 'inmobiliarias',
      nombre: row.nombre || '',
      telefono: row.telefono || row.whatsapp || '',
      whatsapp: row.whatsapp || null,
      email: row.email || null,
      direccion: row.direccion || null,
      zona: row.zona || null,
      ciudad: row.ciudad || 'Córdoba',
      provincia: row.provincia || 'Córdoba',
      fuente: row.fuente || 'google_maps',
      website: row.website || null,
      google_maps_url: row.google_maps_url || null,
      productos_servicios: row.productos_servicios || null,
      instagram: row.instagram || null,
      facebook: row.facebook || null,
      scraped_at: row.scraped_at || new Date().toISOString(),
      enriched_at: row.enriched_at || null,
      outreach_status: row.outreach_status || 'pending',
      outreach_sent_at: row.outreach_sent_at || null,
      outreach_response: row.outreach_response || null,
      actions_history: []
    }
  }

  async getLeads(filters: { status?: string; city?: string; vertical?: string; page?: number; limit?: number }) {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const offset = (page - 1) * limit

    const params = new URLSearchParams()
    params.append('select', '*')
    params.append('order', 'scraped_at.desc')
    params.append('offset', String(offset))
    params.append('limit', String(limit))

    if (filters.status) {
      params.append('outreach_status', `eq.${filters.status}`)
    }
    if (filters.city) {
      params.append('ciudad', `eq.${filters.city}`)
    }
    if (filters.vertical) {
      params.append('vertical', `eq.${filters.vertical}`)
    }

    const totalParams = new URLSearchParams()
    if (filters.status) totalParams.append('outreach_status', `eq.${filters.status}`)
    if (filters.city) totalParams.append('ciudad', `eq.${filters.city}`)
    if (filters.vertical) totalParams.append('vertical', `eq.${filters.vertical}`)

    const data = await this.supabaseGet('leads', params.toString())
    const total = await this.supabaseCount('leads', totalParams.toString())

    return {
      leads: (data || []).map((l: any) => this.mapLead(l)),
      total,
      page
    }
  }

  async getLeadById(id: string): Promise<Lead | null> {
    const data = await this.supabaseGet(`leads?id=eq.${id}&limit=1`)
    if (!data || data.length === 0) return null
    return this.mapLead(data[0])
  }

  async insertLead(lead: RawLead): Promise<Lead> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const body = {
      id,
      vertical: lead.vertical || 'inmobiliarias',
      nombre: lead.nombre,
      telefono: lead.telefono,
      whatsapp: lead.whatsapp || null,
      email: lead.email || null,
      direccion: lead.direccion || null,
      zona: lead.zona || null,
      ciudad: lead.ciudad || 'Córdoba',
      provincia: lead.provincia || 'Córdoba',
      fuente: lead.fuente || 'google_maps',
      website: lead.website || null,
      google_maps_url: lead.google_maps_url || null,
      scraped_at: now,
      outreach_status: 'pending'
    }

    await this.supabasePost('leads', body)
    return this.mapLead({ ...body, scraped_at: now })
  }

  async importLeads(leads: RawLead[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0
    let skipped = 0

    for (const lead of leads) {
      const existing = await this.supabaseGet(`leads?telefono=eq.${encodeURIComponent(lead.telefono)}&vertical=eq.${lead.vertical || 'inmobiliarias'}&select=id&limit=1`)
      if (existing && existing.length > 0) {
        skipped++
        continue
      }

      const id = uuidv4()
      await this.supabasePost('leads', {
        id,
        vertical: lead.vertical || 'inmobiliarias',
        nombre: lead.nombre,
        telefono: lead.telefono,
        whatsapp: lead.whatsapp || null,
        email: lead.email || null,
        direccion: lead.direccion || null,
        zona: lead.zona || null,
        ciudad: lead.ciudad || 'Córdoba',
        provincia: lead.provincia || 'Córdoba',
        fuente: lead.fuente || 'google_maps',
        website: lead.website || null,
        google_maps_url: lead.google_maps_url || null,
        scraped_at: new Date().toISOString(),
        outreach_status: 'pending'
      })
      imported++
    }

    return { imported, skipped }
  }

  async updateLeadStatus(id: string, status: string) {
    const updateData: any = { outreach_status: status }
    if (status === 'outreach_sent') {
      updateData.outreach_sent_at = new Date().toISOString()
    }

    await this.supabasePatch(`leads?id=eq.${id}`, '', updateData)
    return this.mapLead({ id, ...updateData })
  }

  async insertAction(leadId: string, action: string, messageSent?: string): Promise<void> {
    if (action === 'send_intro') {
      await this.updateLeadStatus(leadId, 'outreach_sent')
    } else if (action === 'send_followup') {
      await this.updateLeadStatus(leadId, 'followup_1')
    } else if (action === 'mark_hot') {
      await this.updateLeadStatus(leadId, 'qualified')
    } else if (action === 'discard') {
      await this.updateLeadStatus(leadId, 'rejected')
    }
  }

  async getStats(): Promise<Stats> {
    const todayDate = new Date().toISOString().split('T')[0]
    const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const allLeads = await this.supabaseGet('leads?select=outreach_status,ciudad,vertical')
    const total = allLeads?.length || 0

    const pending = allLeads?.filter((l: any) => l.outreach_status === 'pending').length || 0
    const hotLeads = allLeads?.filter((l: any) => l.outreach_status === 'qualified').length || 0

    const sentTodayData = await this.supabaseGet(`leads?outreach_status=eq.outreach_sent&outreach_sent_at=gte.${todayDate}T00:00:00`)
    const sentToday = sentTodayData?.length || 0

    const sentWeekData = await this.supabaseGet(`leads?outreach_status=eq.outreach_sent&outreach_sent_at=gte.${weekAgoDate}`)
    const sentWeek = sentWeekData?.length || 0

    const cityCounts: Record<string, number> = {}
    for (const row of allLeads || []) {
      if (row.ciudad) {
        cityCounts[row.ciudad] = (cityCounts[row.ciudad] || 0) + 1
      }
    }

    const statusCounts: Record<string, number> = {}
    for (const row of allLeads || []) {
      if (row.outreach_status) {
        statusCounts[row.outreach_status] = (statusCounts[row.outreach_status] || 0) + 1
      }
    }

    const verticalCounts: Record<string, number> = {}
    for (const row of allLeads || []) {
      const v = row.vertical || 'inmobiliarias'
      verticalCounts[v] = (verticalCounts[v] || 0) + 1
    }

    const contactedLeads = total - pending - (statusCounts['rejected'] || 0)
    const responseRate = total > 0 ? Math.round((contactedLeads / total) * 100) : 0

    return {
      sent_today: sentToday,
      sent_week: sentWeek,
      pending,
      hot_leads: hotLeads,
      response_rate: responseRate,
      conversion_rate: responseRate,
      by_city: Object.entries(cityCounts).map(([city, count]) => ({ city, count })),
      by_status: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      by_vertical: Object.entries(verticalCounts).map(([vertical, count]) => ({ vertical, count }))
    }
  }

  getSettings(): Settings {
    return {
      business_hours: { start: '08:00', end: '17:00', timezone: 'America/Argentina/Cordoba', days: [1, 2, 3, 4, 5] },
      cities: [],
      message_templates: { intro: '', followup_1: '', followup_2: '' },
      cooldown_minutes: 30,
      daily_limit: 100
    }
  }

  updateSettings(partial: Partial<Settings>): Settings {
    return { ...this.getSettings(), ...partial }
  }
}

const dbService = new DbService()

export { dbService }