"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', (_req, res) => {
    res.json({ ok: true, version: '1.0.0', uptime: process.uptime() });
});
//# sourceMappingURL=health.js.map