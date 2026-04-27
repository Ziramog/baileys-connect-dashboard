import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

const authDir = '/tmp/test-auth-' + Date.now()
fs.rmSync(authDir, { recursive: true, force: true })
fs.mkdirSync(authDir, { recursive: true })

console.log('Auth dir:', authDir)

const { state, saveCreds } = await useMultiFileAuthState(authDir)

const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Wolfim', 'Chrome', '1.0']
})

console.log('Socket created, waiting for events...')

sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update
    if (qr) {
        console.log('>>> QR RECEIVED!')
        const buf = QRCode.toBufferSync(qr, { type: 'png', width: 300 })
        fs.writeFileSync('/tmp/test-qr.png', buf)
        console.log('QR saved, size:', buf.length)
    }
    if (connection) {
        console.log('>>> Connection:', connection)
    }
    if (lastDisconnect) {
        console.log('>>> Disconnected:', JSON.stringify(lastDisconnect).substring(0, 100))
    }
})

sock.ev.on('creds.update', saveCreds)

setTimeout(() => {
    console.log('Timeout reached')
    process.exit(0)
}, 20000)
