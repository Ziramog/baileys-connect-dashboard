"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const db_service_js_1 = require("../services/db.service.js");
exports.settingsRouter = (0, express_1.Router)();
exports.settingsRouter.get('/', (_req, res) => {
    try {
        const settings = db_service_js_1.dbService.getSettings();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.settingsRouter.put('/', (req, res) => {
    try {
        const partial = req.body;
        const updated = db_service_js_1.dbService.updateSettings(partial);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=settings.js.map