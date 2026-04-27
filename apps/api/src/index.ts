import { config } from './config.js'
import express from 'express'
import cors from 'cors'
import { authMiddleware } from './middleware/auth.js'
import { healthRouter } from './routes/health.js'
import { qrRouter } from './routes/qr.js'
import { daemonRouter } from './routes/daemon.js'
import { leadsRouter } from './routes/leads.js'
import { statsRouter } from './routes/stats.js'
import { settingsRouter } from './routes/settings.js'
import { webhookRouter } from './routes/webhook.js'
import { baileysService } from './services/baileys.service.js'
import { dbService } from './services/db.service.js'

const app = express()

app.use(cors({
  origin: config.allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-secret']
}))

app.use(express.json())

app.use('/health', healthRouter)

app.use('/api/qr', authMiddleware, qrRouter)
app.use('/api/daemon', authMiddleware, daemonRouter)
app.use('/api/leads', authMiddleware, leadsRouter)
app.use('/api/stats', authMiddleware, statsRouter)
app.use('/api/settings', authMiddleware, settingsRouter)
app.use('/api/webhook', webhookRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

async function start() {
  try {
    dbService.init()
    console.log('[DB] Initialized')

    await baileysService.init()
    console.log('[Baileys] Initialized, status:', baileysService.getStatus().status)

    app.listen(config.port, () => {
      console.log(`[Server] Running on port ${config.port}`)
    })
  } catch (err) {
    console.error('[Start] Failed:', err)
    process.exit(1)
  }
}

start()