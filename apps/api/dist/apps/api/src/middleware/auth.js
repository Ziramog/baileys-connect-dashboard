"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const config_js_1 = require("../config.js");
function authMiddleware(req, res, next) {
    const secret = req.headers['x-api-secret'];
    if (!secret || secret !== config_js_1.config.apiSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
//# sourceMappingURL=auth.js.map