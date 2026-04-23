import { Router, Request, Response } from 'express'
import { dbService } from '../services/db.service.js'
import type { Settings } from '../../../../packages/shared/types'

export const settingsRouter = Router()

settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const settings = dbService.getSettings()
    res.json(settings)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const partial = req.body as Partial<Settings>
    const updated = dbService.updateSettings(partial)
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})