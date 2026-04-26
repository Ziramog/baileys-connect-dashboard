import { Router, Request, Response } from 'express'
import { dbService } from '../services/db.service.js'

export const statsRouter = Router()

statsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const stats = await (dbService as any).getStats()
    res.json(stats)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})