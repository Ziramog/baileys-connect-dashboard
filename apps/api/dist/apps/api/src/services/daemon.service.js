"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.daemonService = void 0;
const pm2_1 = __importDefault(require("pm2"));
const config_js_1 = require("../config.js");
class DaemonService {
    async connect() {
        return new Promise((resolve, reject) => {
            pm2_1.default.connect((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async getStatus() {
        try {
            await this.connect();
            const proc = await this.getProcess();
            if (!proc) {
                return { running: false, leads_processed_today: 0 };
            }
            const meta = proc.pm2_env;
            const now = Date.now();
            const startedAt = meta.pm_uptime ? meta.pm_uptime : now;
            return {
                running: proc.pm2_env?.status === 'online',
                pid: meta.pid,
                uptime: Math.floor((now - startedAt) / 1000),
                leads_processed_today: meta.leads_processed_today || 0,
                next_run: meta.cron_restart || undefined,
                last_run: meta.last_restart || undefined
            };
        }
        catch (err) {
            console.error('[Daemon] getStatus error:', err);
            return { running: false, leads_processed_today: 0 };
        }
        finally {
            pm2_1.default.disconnect();
        }
    }
    async getProcess() {
        return new Promise((resolve) => {
            pm2_1.default.list((err, list) => {
                if (err || !list)
                    return resolve(null);
                const daemon = list.find((p) => p.name === 'wolfim-daemon');
                resolve(daemon || null);
            });
        });
    }
    async start() {
        try {
            await this.connect();
            await this.launchDaemon();
            return { ok: true, pid: 0 };
        }
        catch (err) {
            console.error('[Daemon] start error:', err);
            return { ok: false };
        }
        finally {
            pm2_1.default.disconnect();
        }
    }
    async stop() {
        try {
            await this.connect();
            await this.stopProcess();
            return { ok: true };
        }
        catch (err) {
            console.error('[Daemon] stop error:', err);
            return { ok: false };
        }
        finally {
            pm2_1.default.disconnect();
        }
    }
    async restart() {
        try {
            await this.connect();
            await this.restartProcess();
            return { ok: true };
        }
        catch (err) {
            console.error('[Daemon] restart error:', err);
            return { ok: false };
        }
        finally {
            pm2_1.default.disconnect();
        }
    }
    launchDaemon() {
        return new Promise((resolve, reject) => {
            pm2_1.default.start({
                script: config_js_1.config.daemonScript,
                name: 'wolfim-daemon',
                instances: 1,
                autorestart: false
            }, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    stopProcess() {
        return new Promise((resolve, reject) => {
            pm2_1.default.stop('wolfim-daemon', (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    restartProcess() {
        return new Promise((resolve, reject) => {
            pm2_1.default.restart('wolfim-daemon', (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async getLogs(lines = 50) {
        try {
            await this.connect();
            return new Promise((resolve) => {
                pm2_1.default.list((err, list) => {
                    if (err || !list)
                        return resolve({ logs: [], timestamp: new Date().toISOString() });
                    const daemon = list.find((p) => p.name === 'wolfim-daemon');
                    if (!daemon)
                        return resolve({ logs: [], timestamp: new Date().toISOString() });
                    const out = daemon.pm2_env?.pm_out_logs?.toString() || '';
                    const errLog = daemon.pm2_env?.pm_err_logs?.toString() || '';
                    const combined = (out + '\n' + errLog).split('\n').filter(Boolean).slice(-lines);
                    resolve({ logs: combined, timestamp: new Date().toISOString() });
                });
            });
        }
        catch {
            return { logs: [], timestamp: new Date().toISOString() };
        }
        finally {
            pm2_1.default.disconnect();
        }
    }
}
const daemonService = new DaemonService();
exports.daemonService = daemonService;
//# sourceMappingURL=daemon.service.js.map