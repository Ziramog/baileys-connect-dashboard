"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daemonRouter = void 0;
const express_1 = require("express");
const daemon_service_js_1 = require("../services/daemon.service.js");
exports.daemonRouter = (0, express_1.Router)();
exports.daemonRouter.get('/status', async (_req, res) => {
    try {
        const status = await daemon_service_js_1.daemonService.getStatus();
        res.json(status);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.daemonRouter.post('/start', async (_req, res) => {
    try {
        const result = await daemon_service_js_1.daemonService.start();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.daemonRouter.post('/stop', async (_req, res) => {
    try {
        const result = await daemon_service_js_1.daemonService.stop();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.daemonRouter.post('/restart', async (_req, res) => {
    try {
        const result = await daemon_service_js_1.daemonService.restart();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.daemonRouter.get('/logs', async (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 50;
        const result = await daemon_service_js_1.daemonService.getLogs(lines);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=daemon.js.map