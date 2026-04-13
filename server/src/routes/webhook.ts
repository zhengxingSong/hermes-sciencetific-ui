import Router from '@koa/router'
import { webhookSignatureMiddleware } from '../middleware/webhook-signature'
import { emitWebhook } from '../services/hermes'

export const webhookRoutes = new Router()

webhookRoutes.post('/webhook', webhookSignatureMiddleware, async (ctx) => {
  const payload = ctx.request.body

  if (!payload || !payload.event) {
    ctx.status = 400
    ctx.body = { error: 'Missing event field' }
    return
  }

  emitWebhook(payload)

  ctx.body = { ok: true }
})
