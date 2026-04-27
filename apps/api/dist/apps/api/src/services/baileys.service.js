"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baileysService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const baileys_1 = require("@whiskeysockets/baileys");
const qrcode_1 = __importDefault(require("qrcode"));
const config_js_1 = require("../config.js");
const uuid_1 = require("uuid");
class BaileysService {
    sock = null;
    qrBuffer = null;
    state = 'idle';
    phone = null;
    credsPath;
    constructor() {
        this.credsPath = `${config_js_1.config.authSessionPath}/creds.json`;
    }
    async init() {
        if ((0, fs_1.existsSync)(this.credsPath)) {
            console.log('[Baileys] Session found, reconnecting...');
            await this.reconnect();
        }
        else {
            console.log('[Baileys] No session, staying idle');
            this.state = 'idle';
        }
    }
    async startQRFlow() {
        try {
            await this.cleanSession();
            await promises_1.default.mkdir(config_js_1.config.authSessionPath, { recursive: true });
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(config_js_1.config.authSessionPath);
            this.sock = (0, baileys_1.makeWASocket)({
                auth: state,
                printQRInTerminal: false,
                browser: ['Wolfim', 'Chrome', '1.0']
            });
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect: ld, qr } = update;
                if (qr) {
                    this.qrBuffer = await qrcode_1.default.toBuffer(qr, { type: 'png', width: 300 });
                    this.state = 'waiting';
                }
                if (connection === 'open') {
                    this.state = 'connected';
                    this.phone = this.sock?.user?.id?.split(':')[0] || null;
                    this.qrBuffer = null;
                }
                if (connection === 'close') {
                    const code = ld?.error?.output?.statusCode;
                    if (code !== baileys_1.DisconnectReason.loggedOut) {
                        console.log('[Baileys] Disconnected, reconnecting...');
                        setTimeout(() => this.reconnect(), 3000);
                    }
                    else {
                        this.state = 'disconnected';
                    }
                }
            });
            this.sock.ev.on('creds.update', saveCreds);
        }
        catch (err) {
            console.error('[Baileys] startQRFlow error:', err);
            this.state = 'disconnected';
        }
    }
    async reconnect() {
        try {
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(config_js_1.config.authSessionPath);
            this.sock = (0, baileys_1.makeWASocket)({
                auth: state,
                printQRInTerminal: false,
                browser: ['Wolfim', 'Chrome', '1.0']
            });
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect: ld } = update;
                if (connection === 'open') {
                    this.state = 'connected';
                    this.phone = this.sock?.user?.id?.split(':')[0] || null;
                }
                if (connection === 'close') {
                    const code = ld?.error?.output?.statusCode;
                    if (code !== baileys_1.DisconnectReason.loggedOut) {
                        setTimeout(() => this.reconnect(), 3000);
                    }
                    else {
                        this.state = 'disconnected';
                    }
                }
            });
            this.sock.ev.on('creds.update', saveCreds);
            this.state = 'connected';
        }
        catch (err) {
            console.error('[Baileys] reconnect error:', err);
            this.state = 'disconnected';
        }
    }
    async disconnect() {
        try {
            if (this.sock) {
                await this.sock.logout();
                this.sock = null;
            }
            await this.cleanSession();
            this.state = 'idle';
            this.phone = null;
            this.qrBuffer = null;
        }
        catch (err) {
            console.error('[Baileys] disconnect error:', err);
        }
    }
    async cleanSession() {
        try {
            await promises_1.default.rm(config_js_1.config.authSessionPath, { recursive: true, force: true });
        }
        catch { }
    }
    getStatus() {
        return {
            status: this.state,
            phone: this.phone,
            qr_available: this.state === 'waiting' && this.qrBuffer !== null
        };
    }
    getQRPNGBuffer() {
        return this.qrBuffer;
    }
    async sendMessage(phone, text) {
        if (this.state !== 'connected' || !this.sock) {
            throw new Error('WhatsApp not connected');
        }
        const jid = `${phone}@s.whatsapp.net`;
        const result = await this.sock.sendMessage(jid, { text });
        return result?.key?.id || (0, uuid_1.v4)();
    }
}
const baileysService = new BaileysService();
exports.baileysService = baileysService;
//# sourceMappingURL=baileys.service.js.map