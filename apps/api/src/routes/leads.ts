import { Router, Request, Response } from 'express'
import { dbService } from '../services/db.service.js'
import { baileysService } from '../services/baileys.service.js'
import type { RawLead } from '../../../../packages/shared/types'

export const leadsRouter = Router()

leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      city: req.query.city as string | undefined,
      vertical: req.query.vertical as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    }
    const result = await dbService.getLeads(filters)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.get('/cities', async (req: Request, res: Response) => {
  try {
    const cities = await dbService.getDistinctCities()
    res.json({ cities })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.get('/verticals', async (req: Request, res: Response) => {
  try {
    const verticals = await dbService.getDistinctVerticals()
    res.json({ verticals })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await dbService.getLeadById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    res.json(lead)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const { action } = req.body
    const lead = await dbService.getLeadById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })

    const validActions = ['send_intro', 'send_followup', 'mark_hot', 'discard', 'reset', 'enrich']
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' })
    }

    let messageSent: string | undefined

    if (action === 'send_intro' || action === 'send_followup') {
      const settings = dbService.getSettings()
      const templateKey = action === 'send_intro' ? 'intro' : 'followup_1'
      const text = settings.message_templates[templateKey as keyof typeof settings.message_templates]
        .replace('{name}', lead.nombre)
        .replace('{city}', lead.ciudad)

      const phoneNormalized = String(lead.telefono).replace(/\D/g, '')
      await baileysService.sendMessage(phoneNormalized, text)
      messageSent = text
    }

    if (action === 'send_intro') {
      await dbService.updateLeadStatus(req.params.id, 'outreach_sent')
    } else if (action === 'send_followup') {
      await dbService.updateLeadStatus(req.params.id, 'outreach_sent')
    } else if (action === 'mark_hot') {
      await dbService.updateLeadStatus(req.params.id, 'qualified')
    } else if (action === 'discard') {
      await dbService.updateLeadStatus(req.params.id, 'rejected')
    } else if (action === 'reset') {
      await dbService.updateLeadStatus(req.params.id, 'pending')
    }

    const updated = await dbService.getLeadById(req.params.id)

    res.json({ ok: true, lead: updated, message_sent: messageSent })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { leads } = req.body as { leads: RawLead[] }
    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads must be an array' })
    }
    const result = await dbService.importLeads(leads)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})