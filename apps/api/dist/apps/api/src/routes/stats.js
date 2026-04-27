"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const db_service_js_1 = require("../services/db.service.js");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.get('/', async (_req, res) => {
    try {
        const stats = await db_service_js_1.dbService.getStats();
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//# sourceMappingURL=stats.js.map