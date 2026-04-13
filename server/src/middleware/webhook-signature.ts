import { Context, Next } from 'koa'
import { config } from '../config'
import { createHmac } from 'crypto'

const SIGNATURE_HEADER = 'x-hermes-signature'
const SIGNATURE_ALGORITHM = 'sha256'

function extractSignature(ctx: Context): string | null {
  return ctx.get(SIGNATURE_HEADER) || null
}

function computeSignature(payload: string, secret: string): string {
  return createHmac(SIGNATURE_ALGORITHM, secret)
    .update(payload)
    .digest('hex')
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = computeSignature(payload, secret)

  if (signature.length !== expected.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }

  return result === 0
}

export async function webhookSignatureMiddleware(ctx: Context, next: Next): Promise<void> {
  if (!config.webhookSecret) {
    await next()
    return
  }

  const signature = extractSignature(ctx)

  if (!signature) {
    ctx.status = 401
    ctx.body = { error: 'Missing webhook signature' }
    return
  }

  const payload = (ctx.request as any).rawBody || JSON.stringify(ctx.request.body)

  if (!verifySignature(payload, signature, config.webhookSecret)) {
    ctx.status = 403
    ctx.body = { error: 'Invalid webhook signature' }
    return
  }

  await next()
}

export function createWebhookSignatureMiddleware(): (ctx: Context, next: Next) => Promise<void> {
  return webhookSignatureMiddleware
}