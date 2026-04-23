import { Router, Request, Response } from 'express'
import { dbService } from '../services/db.service.js'
import { baileysService } from '../services/baileys.service.js'
import type { RawLead } from '../../../../packages/shared/types'

export const leadsRouter = Router()

leadsRouter.get('/', (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      city: req.query.city as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    }
    const result = dbService.getLeads(filters)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const lead = dbService.getLeadById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    res.json(lead)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const { action } = req.body
    const lead = dbService.getLeadById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })

    const validActions = ['send_intro', 'send_followup', 'mark_hot', 'discard', 'reset']
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' })
    }

    let messageSent: string | undefined

    if (action === 'send_intro' || action === 'send_followup') {
      const settings = dbService.getSettings()
      const templateKey = action === 'send_intro' ? 'intro' : 'followup_1'
      const text = settings.message_templates[templateKey as keyof typeof settings.message_templates]
        .replace('{name}', lead.name)
        .replace('{city}', lead.city)

      await baileysService.sendMessage(lead.phone, text)
      messageSent = text
    }

    switch (action) {
      case 'send_intro':
        dbService.updateLeadStatus(req.params.id, 'contacted')
        break
      case 'send_followup':
        dbService.updateLeadStatus(req.params.id, 'followup_1')
        break
      case 'mark_hot':
        dbService.updateLeadStatus(req.params.id, 'hot')
        break
      case 'discard':
        dbService.updateLeadStatus(req.params.id, 'discarded')
        break
      case 'reset':
        dbService.updateLeadStatus(req.params.id, 'new')
        break
    }

    dbService.insertAction(req.params.id, action, messageSent)
    const updated = dbService.getLeadById(req.params.id)

    res.json({ ok: true, lead: updated, message_sent: messageSent })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leadsRouter.post('/import', (req: Request, res: Response) => {
  try {
    const { leads } = req.body as { leads: RawLead[] }
    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads must be an array' })
    }
    const result = dbService.importLeads(leads)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})