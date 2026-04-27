"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("./config.js");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_js_1 = require("./middleware/auth.js");
const health_js_1 = require("./routes/health.js");
const qr_js_1 = require("./routes/qr.js");
const daemon_js_1 = require("./routes/daemon.js");
const leads_js_1 = require("./routes/leads.js");
const stats_js_1 = require("./routes/stats.js");
const settings_js_1 = require("./routes/settings.js");
const webhook_js_1 = require("./routes/webhook.js");
const baileys_service_js_1 = require("./services/baileys.service.js");
const db_service_js_1 = require("./services/db.service.js");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: config_js_1.config.allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-secret']
}));
app.use(express_1.default.json());
app.use('/health', health_js_1.healthRouter);
app.use('/api/qr', auth_js_1.authMiddleware, qr_js_1.qrRouter);
app.use('/api/daemon', auth_js_1.authMiddleware, daemon_js_1.daemonRouter);
app.use('/api/leads', auth_js_1.authMiddleware, leads_js_1.leadsRouter);
app.use('/api/stats', auth_js_1.authMiddleware, stats_js_1.statsRouter);
app.use('/api/settings', auth_js_1.authMiddleware, settings_js_1.settingsRouter);
app.use('/api/webhook', webhook_js_1.webhookRouter);
app.use((err, _req, res, _next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
async function start() {
    try {
        db_service_js_1.dbService.init();
        console.log('[DB] Initialized');
        await baileys_service_js_1.baileysService.init();
        console.log('[Baileys] Initialized, status:', baileys_service_js_1.baileysService.getStatus().status);
        app.listen(config_js_1.config.port, () => {
            console.log(`[Server] Running on port ${config_js_1.config.port}`);
        });
    }
    catch (err) {
        console.error('[Start] Failed:', err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map