import type { DaemonStatus } from '../../../../packages/shared/types';
declare class DaemonService {
    private connect;
    getStatus(): Promise<DaemonStatus>;
    private getProcess;
    start(): Promise<{
        ok: boolean;
        pid?: number;
    }>;
    stop(): Promise<{
        ok: boolean;
    }>;
    restart(): Promise<{
        ok: boolean;
    }>;
    private launchDaemon;
    private stopProcess;
    private restartProcess;
    getLogs(lines?: number): Promise<{
        logs: string[];
        timestamp: string;
    }>;
}
declare const daemonService: DaemonService;
export { daemonService };
//# sourceMappingURL=daemon.service.d.ts.map