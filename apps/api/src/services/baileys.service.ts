/**
 * Baileys Service — reads WhatsApp connection state from shared status file
 *
 * The daemon (daemon.js) owns the WhatsApp connection via baileys-relay.js.
 * This service reads the shared status.json and qr.txt that daemon writes.
 * Dashboard API endpoints use this to show QR/connection status.
 */

import fs from 'fs/promises'
import { existsSync } from 'fs'
import { config } from '../config.js'
import QRCode from 'qrcode'

type QRState = 'idle' | 'connecting' | 'waiting' | 'connected' | 'disconnected' | 'reconnecting'

const STATUS_FILE = '/home/hermes/data/baileys-connect/status.json'
const QR_PATH = '/home/hermes/data/baileys-connect/qr.txt'
const QR_PNG_PATH = '/home/hermes/data/baileys-connect/qr.png'

interface StatusData {
  state: QRState
  phone: string | null
  qr_available: boolean
  updated_at?: string
}

class BaileysService {
  private qrBuffer: Buffer | null = null

  async init() {
    // Just read existing state — daemon owns the actual connection
    const existing = await this.readStatus()
    console.log('[Baileys] Service initialized, daemon owns connection')
    console.log('[Baileys] Current state:', existing?.state, '| phone:', existing?.phone)
  }

  private async readStatus(): Promise<StatusData | null> {
    try {
      if (!existsSync(STATUS_FILE)) return null
      const raw = await fs.readFile(STATUS_FILE, 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  async startQRFlow(): Promise<void> {
    // QR flow is started by the daemon — this is a no-op for the API
    // The dashboard should start the daemon which will trigger QR generation
    console.log('[Baileys] startQRFlow called on API — daemon must be running')
    throw new Error('Start the daemon first: node daemon.js start')
  }

  async reconnect(): Promise<void> {
    console.log('[Baileys] reconnect called on API — daemon must be running')
    throw new Error('Daemon owns the connection')
  }

  async disconnect(): Promise<void> {
    // Tell daemon to disconnect by touching a control file
    const controlFile = '/home/hermes/data/baileys-connect/control.json'
    await fs.writeFile(controlFile, JSON.stringify({ action: 'disconnect', at: new Date().toISOString() }))
    console.log('[Baileys] Disconnect signal sent to daemon')
  }

  getStatus() {
    // Synchronous read of current status
    try {
      if (!existsSync(STATUS_FILE)) {
        return { status: 'idle' as QRState, phone: null, qr_available: false }
      }
      const raw = require('fs').readFileSync(STATUS_FILE, 'utf8')
      const data: StatusData = JSON.parse(raw)
      return {
        status: data.state || 'idle',
        phone: data.phone || null,
        qr_available: data.qr_available || false
      }
    } catch {
      return { status: 'idle' as QRState, phone: null, qr_available: false }
    }
  }

  async getQRPNGBuffer(): Promise<Buffer | null> {
    // Try QR path (base64 data URL from daemon)
    try {
      if (existsSync(QR_PATH)) {
        const content = require('fs').readFileSync(QR_PATH, 'utf8').trim()
        if (content.startsWith('data:')) {
          const base64 = content.split(',')[1]
          return Buffer.from(base64, 'base64')
        }
      }
    } catch {}

    // Try PNG path
    try {
      if (existsSync(QR_PNG_PATH)) {
        return require('fs').readFileSync(QR_PNG_PATH)
      }
    } catch {}

    return null
  }

  async sendMessage(phone: string, text: string): Promise<string> {
    // Queue via daemon control file
    const queueFile = '/home/hermes/data/baileys-connect/send-queue.json'
    const payload = { phone, text, queued_at: new Date().toISOString() }
    require('fs').writeFileSync(queueFile, JSON.stringify(payload))
    console.log('[Baileys] Message queued via send-queue.json')
    return 'queued'
  }
}

const baileysService = new BaileysService()

export { baileysService }
export type { QRState }
