import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-api-secret']

  if (!secret || secret !== config.apiSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}