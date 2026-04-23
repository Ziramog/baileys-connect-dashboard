import { Router, Request, Response } from 'express'
import { dbService } from '../services/db.service.js'

export const statsRouter = Router()

statsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const stats = dbService.getStats()
    res.json(stats)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})