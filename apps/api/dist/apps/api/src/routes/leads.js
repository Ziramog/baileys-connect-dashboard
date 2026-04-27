"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRouter = void 0;
const express_1 = require("express");
const db_service_js_1 = require("../services/db.service.js");
const baileys_service_js_1 = require("../services/baileys.service.js");
exports.leadsRouter = (0, express_1.Router)();
exports.leadsRouter.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            city: req.query.city,
            vertical: req.query.vertical,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };
        const result = await db_service_js_1.dbService.getLeads(filters);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.leadsRouter.get('/:id', async (req, res) => {
    try {
        const lead = await db_service_js_1.dbService.getLeadById(req.params.id);
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.leadsRouter.post('/:id/action', async (req, res) => {
    try {
        const { action } = req.body;
        const lead = await db_service_js_1.dbService.getLeadById(req.params.id);
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        const validActions = ['send_intro', 'send_followup', 'mark_hot', 'discard', 'reset', 'enrich'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }
        let messageSent;
        if (action === 'send_intro' || action === 'send_followup') {
            const settings = db_service_js_1.dbService.getSettings();
            const templateKey = action === 'send_intro' ? 'intro' : 'followup_1';
            const text = settings.message_templates[templateKey]
                .replace('{name}', lead.nombre)
                .replace('{city}', lead.ciudad);
            const phoneNormalized = String(lead.telefono).replace(/\D/g, '');
            await baileys_service_js_1.baileysService.sendMessage(phoneNormalized, text);
            messageSent = text;
        }
        if (action === 'send_intro') {
            await db_service_js_1.dbService.updateLeadStatus(req.params.id, 'outreach_sent');
        }
        else if (action === 'send_followup') {
            await db_service_js_1.dbService.updateLeadStatus(req.params.id, 'outreach_sent');
        }
        else if (action === 'mark_hot') {
            await db_service_js_1.dbService.updateLeadStatus(req.params.id, 'qualified');
        }
        else if (action === 'discard') {
            await db_service_js_1.dbService.updateLeadStatus(req.params.id, 'rejected');
        }
        else if (action === 'reset') {
            await db_service_js_1.dbService.updateLeadStatus(req.params.id, 'pending');
        }
        const updated = await db_service_js_1.dbService.getLeadById(req.params.id);
        res.json({ ok: true, lead: updated, message_sent: messageSent });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.leadsRouter.post('/import', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads)) {
            return res.status(400).json({ error: 'leads must be an array' });
        }
        const result = await db_service_js_1.dbService.importLeads(leads);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=leads.js.map