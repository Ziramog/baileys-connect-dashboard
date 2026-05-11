/**
 * Baileys Service — reads WhatsApp connection state from shared status file
 *
 * The daemon (daemon.js) owns the WhatsApp connection via baileys-relay.js.
 * This service reads the shared status.json and qr.txt that daemon writes.
 * Dashboard API endpoints use this to show QR/connection status.
 */

import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

type QRState = 'idle' | 'connecting' | 'waiting' | 'connected' | 'disconnected' | 'reconnecting'

const STATUS_FILE = '/home/hermes/data/baileys-connect/status.json'
const QR_PATH = '/home/hermes/data/baileys-connect/qr.txt'
const DAEMON_AUTH_DIR = '/home/hermes/data/baileys-connect'
const API_AUTH_DIR = '/data/auth-session'
const DAEMON_PM2_NAME = 'outreach-daemon'
const API_PM2_NAME = 'wolfim-api'

interface StatusData {
  state: QRState
  phone: string | null
  qr_available: boolean
  updated_at?: string
}

function clearSession(dir: string) {
  try {
    const fs = require('fs')
    if (!fs.existsSync(dir)) return
    for (const file of fs.readdirSync(dir)) {
      if (file === 'creds.json' || file === 'session-*.json' || file.startsWith('pre-key-') || file.startsWith('app-state')) {
        try { fs.unlinkSync(`${dir}/${file}`) } catch {}
      }
    }
  } catch {}
}

function clearAllSessions() {
  clearSession(DAEMON_AUTH_DIR)
  clearSession(API_AUTH_DIR)
}

class BaileysService {
  async init() {
    console.log('[Baileys] Service initialized — daemon owns connection')
  }

  async startQRFlow(): Promise<void> {
    console.log('[Baileys] startQRFlow called on API — daemon must be running')
    throw new Error('Start the daemon first: pm2 start outreach-daemon')
  }

  async reconnect(): Promise<void> {
    console.log('[Baileys] reconnect called on API — daemon must be running')
    throw new Error('Daemon owns the connection')
  }

  async disconnect(): Promise<void> {
    const controlFile = '/home/hermes/data/baileys-connect/control.json'
    writeFileSync(controlFile, JSON.stringify({ action: 'disconnect', at: new Date().toISOString() }))
    console.log('[Baileys] Disconnect signal sent to daemon')
  }

  /**
   * Full reset: stop daemon + API, clear all WhatsApp sessions,
   * restart both to force new QR scan
   */
  async fullReset(): Promise<{ ok: boolean; message: string }> {
    try {
      console.log('[Baileys] Full reset — stopping services and clearing sessions')

      // Stop both PM2 processes
      execSync('pm2 stop outreach-daemon 2>/dev/null; pm2 stop wolfim-api 2>/dev/null', { encoding: 'utf8' })

      // Clear all session files
      clearAllSessions()

      // Remove status and QR files
      try { unlinkSync(STATUS_FILE) } catch {}
      try { unlinkSync(QR_PATH) } catch {}

      // Small delay
      await new Promise(r => setTimeout(r, 1000))

      // Restart daemon first (owns WhatsApp connection)
      execSync('pm2 start outreach-daemon 2>/dev/null', { encoding: 'utf8' })
      await new Promise(r => setTimeout(r, 2000))

      // Start wolfim-api
      execSync('pm2 start wolfim-api 2>/dev/null', { encoding: 'utf8' })
      await new Promise(r => setTimeout(r, 1000))

      const newStatus = this.getStatus()
      return {
        ok: true,
        message: `Reset complete. Status: ${newStatus.status}`
      }
    } catch (err: any) {
      return { ok: false, message: err.message }
    }
  }

  getStatus() {
    try {
      if (!existsSync(STATUS_FILE)) {
        return { status: 'idle' as QRState, phone: null, qr_available: false }
      }
      const fs = require('fs')
      const raw = fs.readFileSync(STATUS_FILE, 'utf8')
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

  getQRPNGBuffer(): Buffer | null {
    try {
      if (!existsSync(QR_PATH)) return null
      const fs = require('fs')
      const buf = fs.readFileSync(QR_PATH)
      // Raw PNG file
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        return buf
      }
      // Base64 data URL
      const str = buf.toString('utf8').trim()
      if (str.startsWith('data:')) {
        return Buffer.from(str.split(',')[1], 'base64')
      }
    } catch {}
    return null
  }

  async sendMessage(phone: string, text: string): Promise<string> {
    const fs = require('fs')
    const queueFile = '/home/hermes/data/baileys-connect/send-queue.json'
    const payload = { phone, text, queued_at: new Date().toISOString() }
    fs.writeFileSync(queueFile, JSON.stringify(payload))
    console.log('[Baileys] Message queued via send-queue.json')
    return 'queued'
  }
}

const baileysService = new BaileysService()

export { baileysService }
export type { QRState }