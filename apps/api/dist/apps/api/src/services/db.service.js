"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_js_1 = require("../config.js");
const uuid_1 = require("uuid");
// Mapping from Supabase column names to Lead interface
function mapRow(row) {
    return {
        id: row.id,
        vertical: row.vertical || 'inmobiliarias',
        nombre: row.nombre || row.name || '',
        telefono: row.telefono || row.phone || '',
        whatsapp: row.whatsapp || null,
        email: row.email || null,
        direccion: row.direccion || row.direccion || null,
        zona: row.zona || null,
        ciudad: row.ciudad || row.city || 'Córdoba',
        provincia: row.provincia || row.provincia || 'Córdoba',
        fuente: row.fuente || row.fuente || 'google_maps',
        website: row.website || null,
        google_maps_url: row.google_maps_url || null,
        productos_servicios: row.productos_servicios || null,
        instagram: row.instagram || null,
        facebook: row.facebook || null,
        scraped_at: row.scraped_at || row.created_at || new Date().toISOString(),
        enriched_at: row.enriched_at || null,
        outreach_status: row.outreach_status || row.status || 'pending',
        outreach_sent_at: row.outreach_sent_at || null,
        outreach_response: row.outreach_response || null,
        actions_history: []
    };
}
class DbService {
    supabase = null;
    init() {
        if (!config_js_1.config.supabaseUrl || !config_js_1.config.supabaseServiceKey) {
            console.warn('[DbService] SUPABASE_URL or SUPABASE_SERVICE_KEY not set, using no-op mode');
            return;
        }
        this.supabase = (0, supabase_js_1.createClient)(config_js_1.config.supabaseUrl, config_js_1.config.supabaseServiceKey);
        console.log('[DbService] Connected to Supabase:', config_js_1.config.supabaseUrl);
    }
    getClient() {
        if (!this.supabase)
            throw new Error('Supabase not initialized');
        return this.supabase;
    }
    async getLeads(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const offset = (page - 1) * limit;
        let query = this.getClient()
            .from('leads')
            .select('*', { count: 'exact' });
        if (filters.status) {
            query = query.eq('outreach_status', filters.status);
        }
        if (filters.city) {
            query = query.eq('ciudad', filters.city);
        }
        if (filters.vertical) {
            query = query.eq('vertical', filters.vertical);
        }
        const { data, error, count } = await query
            .order('scraped_at', { ascending: false })
            .range(offset, offset + limit - 1)
            .throwOnError();
        if (error)
            throw error;
        return {
            leads: (data || []).map(mapRow),
            total: count || 0,
            page
        };
    }
    async getLeadById(id) {
        const { data, error } = await this.getClient()
            .from('leads')
            .select('*')
            .eq('id', id)
            .single()
            .throwOnError();
        if (error || !data)
            return null;
        return mapRow(data);
    }
    async insertLead(lead) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const { data, error } = await this.getClient()
            .from('leads')
            .insert({
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
        })
            .select()
            .single()
            .throwOnError();
        if (error)
            throw error;
        return mapRow(data);
    }
    async importLeads(leads) {
        let imported = 0;
        let skipped = 0;
        const now = new Date().toISOString();
        for (const lead of leads) {
            // Check if exists
            const { data: existing } = await this.getClient()
                .from('leads')
                .select('id')
                .eq('telefono', lead.telefono)
                .eq('vertical', lead.vertical || 'inmobiliarias')
                .maybeSingle();
            if (existing) {
                skipped++;
                continue;
            }
            const id = (0, uuid_1.v4)();
            const { error } = await this.getClient()
                .from('leads')
                .insert({
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
            });
            if (error) {
                console.error('[DbService] Insert error:', error.message);
                skipped++;
            }
            else {
                imported++;
            }
        }
        return { imported, skipped };
    }
    async updateLeadStatus(id, status) {
        const update = { outreach_status: status };
        if (status === 'outreach_sent') {
            update.outreach_sent_at = new Date().toISOString();
        }
        const { data, error } = await this.getClient()
            .from('leads')
            .update(update)
            .eq('id', id)
            .select()
            .single()
            .throwOnError();
        if (error)
            throw error;
        return mapRow(data);
    }
    async updateLead(id, updates) {
        const { data, error } = await this.getClient()
            .from('leads')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
            .throwOnError();
        if (error)
            throw error;
        return mapRow(data);
    }
    async getStats() {
        const client = this.getClient();
        const today = new Date().toISOString().split('T')[0];
        const { count: totalLeads } = await client
            .from('leads')
            .select('*', { count: 'exact', head: true });
        const { count: pending } = await client
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('outreach_status', 'pending');
        const { count: hotLeads } = await client
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('outreach_status', 'qualified');
        const { count: outreachSent } = await client
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('outreach_status', 'outreach_sent');
        const { count: replied } = await client
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('outreach_status', 'replied');
        const { data: byStatusData } = await client
            .from('leads')
            .select('outreach_status');
        const statusCounts = {};
        for (const row of byStatusData || []) {
            const s = row.outreach_status || 'pending';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        }
        const by_status = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
        const { data: byVerticalData } = await client
            .from('leads')
            .select('vertical');
        const verticalCounts = {};
        for (const row of byVerticalData || []) {
            const v = row.vertical || 'inmobiliarias';
            verticalCounts[v] = (verticalCounts[v] || 0) + 1;
        }
        const by_city = Object.entries(verticalCounts).map(([city, count]) => ({ city, count }));
        const sentToday = outreachSent || 0;
        const responseRate = outreachSent ? Math.round(((replied || 0) / outreachSent) * 100) : 0;
        return {
            sent_today: sentToday,
            sent_week: sentToday,
            pending: pending || 0,
            hot_leads: hotLeads || 0,
            response_rate: responseRate,
            conversion_rate: responseRate,
            by_city,
            by_status
        };
    }
    // Settings are still kept in SQLite for simplicity
    // (not critical for the lead machine)
    getSettings() {
        return {
            business_hours: { start: '08:00', end: '17:00', timezone: 'America/Argentina/Cordoba', days: [1, 2, 3, 4, 5] },
            cities: [],
            message_templates: { intro: '', followup_1: '', followup_2: '' },
            cooldown_minutes: 30,
            daily_limit: 100
        };
    }
    updateSettings(partial) {
        return partial;
    }
}
const dbService = new DbService();
exports.dbService = dbService;
//# sourceMappingURL=db.service.js.map