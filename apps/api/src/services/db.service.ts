import Database from 'better-sqlite3'
import { config } from '../config.js'
import { v4 as uuidv4 } from 'uuid'
import type { Lead, LeadStatus, RawLead, Stats, Settings } from '../../../../packages/shared/types'

class DbService {
  private db: Database.Database | null = null

  init() {
    this.db = new Database(config.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.createTables()
  }

  private createTables() {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL,
        last_contact TEXT,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
      CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

      CREATE TABLE IF NOT EXISTS actions_history (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        message_sent TEXT,
        FOREIGN KEY (lead_id) REFERENCES leads(id)
      );
      CREATE INDEX IF NOT EXISTS idx_actions_lead_id ON actions_history(lead_id);

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stats_daily (
        date TEXT PRIMARY KEY,
        sent_count INTEGER DEFAULT 0
      );
    `)

    const row = this.db!.prepare('SELECT data FROM settings WHERE id = 1').get()
    if (!row) {
      const defaultSettings: Settings = {
        business_hours: { start: '08:00', end: '17:00', timezone: 'America/Argentina/Cordoba', days: [1, 2, 3, 4, 5] },
        cities: [],
        message_templates: { intro: '', followup_1: '', followup_2: '' },
        cooldown_minutes: 30,
        daily_limit: 100
      }
      this.db!.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(defaultSettings))
    }
  }

  getLeads(filters: { status?: string; city?: string; page?: number; limit?: number }) {
    const page = filters.page || 1
    const limit = filters.limit || 50
    const offset = (page - 1) * limit

    let where = '1=1'
    const params: any[] = []

    if (filters.status) {
      where += ' AND status = ?'
      params.push(filters.status)
    }
    if (filters.city) {
      where += ' AND city = ?'
      params.push(filters.city)
    }

    const total = this.db!.prepare(`SELECT COUNT(*) as c FROM leads WHERE ${where}`).get(...params as any[]) as { c: number }

    const leads = this.db!.prepare(`SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params as any[], limit, offset) as any[]

    return {
      leads: leads.map(l => this.enrichLead(l)),
      total: total.c,
      page
    }
  }

  getLeadById(id: string): Lead | null {
    const row = this.db!.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any
    return row ? this.enrichLead(row) : null
  }

  private enrichLead(row: any): Lead {
    const actions = this.db!.prepare('SELECT * FROM actions_history WHERE lead_id = ? ORDER BY timestamp DESC').all(row.id) as any[]
    return {
      ...row,
      actions_history: actions
    }
  }

  insertLead(lead: RawLead): Lead {
    const id = uuidv4()
    const created_at = new Date().toISOString()
    this.db!.prepare('INSERT INTO leads (id, name, phone, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, lead.name, lead.phone, lead.city, 'new', created_at)

    const today = new Date().toISOString().split('T')[0]
    this.db!.prepare('INSERT INTO stats_daily (date, sent_count) VALUES (?, 0) ON CONFLICT(date) DO NOTHING').run(today)

    return this.getLeadById(id)!
  }

  importLeads(leads: RawLead[]): { imported: number; skipped: number } {
    let imported = 0
    let skipped = 0
    const insert = this.db!.prepare('INSERT INTO leads (id, name, phone, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')

    for (const lead of leads) {
      const existing = this.db!.prepare('SELECT id FROM leads WHERE phone = ?').get(lead.phone)
      if (existing) {
        skipped++
        continue
      }
      const id = uuidv4()
      const created_at = new Date().toISOString()
      insert.run(id, lead.name, lead.phone, lead.city, 'new', created_at)
      imported++
    }

    return { imported, skipped }
  }

  updateLeadStatus(id: string, status: LeadStatus) {
    this.db!.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id)
    return this.getLeadById(id)
  }

  insertAction(leadId: string, action: string, messageSent?: string): void {
    const id = uuidv4()
    const timestamp = new Date().toISOString()
    this.db!.prepare('INSERT INTO actions_history (id, lead_id, action, timestamp, message_sent) VALUES (?, ?, ?, ?, ?)')
      .run(id, leadId, action, timestamp, messageSent || null)

    if (action === 'send_intro' || action === 'send_followup') {
      this.db!.prepare('UPDATE leads SET last_contact = ? WHERE id = ?').run(timestamp, leadId)
      const today = new Date().toISOString().split('T')[0]
      this.db!.prepare('INSERT INTO stats_daily (date, sent_count) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET sent_count = sent_count + 1').run(today)
    }
  }

  getStats(): Stats {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const sentToday = (this.db!.prepare('SELECT sent_count FROM stats_daily WHERE date = ?').get(today) as any)?.sent_count || 0

    const sentWeekResult = this.db!.prepare('SELECT SUM(sent_count) as total FROM stats_daily WHERE date >= ?').get(weekAgo) as any
    const sentWeek = sentWeekResult?.total || 0

    const pending = (this.db!.prepare('SELECT COUNT(*) as c FROM leads WHERE status = ?').get('new') as any)?.c || 0
    const hotLeads = (this.db!.prepare('SELECT COUNT(*) as c FROM leads WHERE status = ?').get('hot') as any)?.c || 0

    const totalLeads = (this.db!.prepare('SELECT COUNT(*) as c FROM leads').get() as any)?.c || 0
    const contactedLeads = (this.db!.prepare('SELECT COUNT(*) as c FROM leads WHERE status NOT IN (?, ?)').get('new', 'discarded') as any)?.c || 0
    const responseRate = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0

    const byCityRows = this.db!.prepare('SELECT city, COUNT(*) as count FROM leads GROUP BY city').all() as any[]
    const byStatusRows = this.db!.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all() as any[]

    return {
      sent_today: sentToday,
      sent_week: sentWeek,
      pending,
      hot_leads: hotLeads,
      response_rate: responseRate,
      conversion_rate: responseRate,
      by_city: byCityRows.map(r => ({ city: r.city, count: r.count })),
      by_status: byStatusRows.map(r => ({ status: r.status, count: r.count }))
    }
  }

  getSettings(): Settings {
    const row = this.db!.prepare('SELECT data FROM settings WHERE id = 1').get() as any
    return JSON.parse(row?.data || '{}')
  }

  updateSettings(partial: Partial<Settings>): Settings {
    const current = this.getSettings()
    const updated = { ...current, ...partial }
    this.db!.prepare('UPDATE settings SET data = ? WHERE id = 1').run(JSON.stringify(updated))
    return updated
  }
}

const dbService = new DbService()

export { dbService }