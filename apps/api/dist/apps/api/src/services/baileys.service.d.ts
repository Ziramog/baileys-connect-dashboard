type QRState = 'idle' | 'waiting' | 'scanned' | 'connected' | 'disconnected';
declare class BaileysService {
    private sock;
    private qrBuffer;
    private state;
    private phone;
    private credsPath;
    constructor();
    init(): Promise<void>;
    startQRFlow(): Promise<void>;
    reconnect(): Promise<void>;
    disconnect(): Promise<void>;
    private cleanSession;
    getStatus(): {
        status: QRState;
        phone: string | null;
        qr_available: boolean;
    };
    getQRPNGBuffer(): Buffer | null;
    sendMessage(phone: string, text: string): Promise<string>;
}
declare const baileysService: BaileysService;
export { baileysService };
//# sourceMappingURL=baileys.service.d.ts.map