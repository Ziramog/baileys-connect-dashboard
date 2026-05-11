import { Router, Request, Response } from 'express'
import { dbService } from '../services/db.service.js'

const router = Router()

router.get('/ycloud', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.YCLOUD_WEBHOOK_TOKEN) {
    res.send(String(challenge))
    return
  }
  res.send('ERROR')
})

router.post('/ycloud', async (req: Request, res: Response) => {
  try {
    res.send('OK')

    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages
    if (!messages || !Array.isArray(messages)) return

    for (const msg of messages) {
      const from = msg.from
      const text = msg.text?.body || ''
      const msgId = msg.id
      const timestamp = msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString()

      if (!from || !text) continue

      const digits = from.replace(/\D/g, '')
      const allLeads = await dbService.getLeads({ limit: 1000 })
      const matchedLead = allLeads.leads.find(l =>
        l.telefono.replace(/\D/g, '').includes(digits) ||
        (l.whatsapp && l.whatsapp.replace(/\D/g, '').includes(digits))
      )

      const leadId = matchedLead?.id || null

      if (leadId) {
        await dbService.updateLeadStatus(leadId, 'replied')
      }

      console.log(`[Webhook] Inbound from ${from}: "${text.substring(0, 50)}" → lead ${leadId || 'unknown'}`)
    }
  } catch (err: any) {
    console.error('[Webhook] Error:', err.message)
  }
})

export const webhookRouter = router