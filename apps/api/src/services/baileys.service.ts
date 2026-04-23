import fs from 'fs/promises'
import { existsSync } from 'fs'
import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import { config } from '../config.js'
import { v4 as uuidv4 } from 'uuid'

type QRState = 'idle' | 'waiting' | 'scanned' | 'connected' | 'disconnected'

class BaileysService {
  private sock: WASocket | null = null
  private qrBuffer: Buffer | null = null
  private state: QRState = 'idle'
  private phone: string | null = null
  private credsPath: string

  constructor() {
    this.credsPath = `${config.authSessionPath}/creds.json`
  }

  async init() {
    if (existsSync(this.credsPath)) {
      console.log('[Baileys] Session found, reconnecting...')
      await this.reconnect()
    } else {
      console.log('[Baileys] No session, staying idle')
      this.state = 'idle'
    }
  }

  async startQRFlow() {
    try {
      await this.cleanSession()
      await fs.mkdir(config.authSessionPath, { recursive: true })

      const { state, saveCreds } = await useMultiFileAuthState(config.authSessionPath)

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Wolfim', 'Chrome', '1.0']
      })

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect: ld, qr } = update

        if (qr) {
          this.qrBuffer = await QRCode.toBuffer(qr, { type: 'png', width: 300 })
          this.state = 'waiting'
        }

        if (connection === 'open') {
          this.state = 'connected'
          this.phone = this.sock?.user?.id?.split(':')[0] || null
          this.qrBuffer = null
        }

        if (connection === 'close') {
          const code = (ld?.error as any)?.output?.statusCode
          if (code !== DisconnectReason.loggedOut) {
            console.log('[Baileys] Disconnected, reconnecting...')
            setTimeout(() => this.reconnect(), 3000)
          } else {
            this.state = 'disconnected'
          }
        }
      })

      this.sock.ev.on('creds.update', saveCreds)
    } catch (err) {
      console.error('[Baileys] startQRFlow error:', err)
      this.state = 'disconnected'
    }
  }

  async reconnect() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.authSessionPath)

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Wolfim', 'Chrome', '1.0']
      })

      this.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect: ld } = update
        if (connection === 'open') {
          this.state = 'connected'
          this.phone = this.sock?.user?.id?.split(':')[0] || null
        }
        if (connection === 'close') {
          const code = (ld?.error as any)?.output?.statusCode
          if (code !== DisconnectReason.loggedOut) {
            setTimeout(() => this.reconnect(), 3000)
          } else {
            this.state = 'disconnected'
          }
        }
      })

      this.sock.ev.on('creds.update', saveCreds)
      this.state = 'connected'
    } catch (err) {
      console.error('[Baileys] reconnect error:', err)
      this.state = 'disconnected'
    }
  }

  async disconnect() {
    try {
      if (this.sock) {
        await this.sock.logout()
        this.sock = null
      }
      await this.cleanSession()
      this.state = 'idle'
      this.phone = null
      this.qrBuffer = null
    } catch (err) {
      console.error('[Baileys] disconnect error:', err)
    }
  }

  private async cleanSession() {
    try {
      await fs.rm(config.authSessionPath, { recursive: true, force: true })
    } catch {}
  }

  getStatus() {
    return {
      status: this.state,
      phone: this.phone,
      qr_available: this.state === 'waiting' && this.qrBuffer !== null
    }
  }

  getQRPNGBuffer(): Buffer | null {
    return this.qrBuffer
  }

  async sendMessage(phone: string, text: string): Promise<string> {
    if (this.state !== 'connected' || !this.sock) {
      throw new Error('WhatsApp not connected')
    }
    const jid = `${phone}@s.whatsapp.net`
    const result = await this.sock.sendMessage(jid, { text })
    return result?.key?.id || uuidv4()
  }
}

const baileysService = new BaileysService()

export { baileysService }