import { Router, Request, Response } from 'express'
import { daemonService } from '../services/daemon.service.js'

export const daemonRouter = Router()

daemonRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await daemonService.getStatus()
    res.json(status)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

daemonRouter.post('/start', async (_req: Request, res: Response) => {
  try {
    const result = await daemonService.start()
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

daemonRouter.post('/stop', async (_req: Request, res: Response) => {
  try {
    const result = await daemonService.stop()
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

daemonRouter.post('/restart', async (_req: Request, res: Response) => {
  try {
    const result = await daemonService.restart()
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

daemonRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const lines = parseInt(req.query.lines as string) || 50
    const result = await daemonService.getLogs(lines)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})