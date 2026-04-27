"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrRouter = void 0;
const express_1 = require("express");
const baileys_service_js_1 = require("../services/baileys.service.js");
exports.qrRouter = (0, express_1.Router)();
exports.qrRouter.get('/status', (_req, res) => {
    const status = baileys_service_js_1.baileysService.getStatus();
    res.json(status);
});
exports.qrRouter.get('/image', (_req, res) => {
    const buffer = baileys_service_js_1.baileysService.getQRPNGBuffer();
    if (!buffer) {
        return res.status(404).json({ error: 'No QR available' });
    }
    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
});
exports.qrRouter.post('/start', async (_req, res) => {
    try {
        await baileys_service_js_1.baileysService.startQRFlow();
        res.json({ ok: true, message: 'QR generation started' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.qrRouter.post('/disconnect', async (_req, res) => {
    try {
        await baileys_service_js_1.baileysService.disconnect();
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=qr.js.map