import { Router, Request, Response } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ ok: true, version: '1.0.0', uptime: process.uptime() })
})