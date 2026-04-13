import { Context, Next } from 'koa'
import { config } from '../config'

const EXCLUDED_PATHS = ['/health', '/webhook']

function extractApiKey(ctx: Context): string | null {
  const authHeader = ctx.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  const queryKey = ctx.query.api_key as string
  if (queryKey) {
    return queryKey.trim()
  }

  const headerKey = ctx.get('x-api-key')
  if (headerKey) {
    return headerKey.trim()
  }

  return null
}

function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATHS.some(p => path === p || path.startsWith(p + '/'))
}

export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  if (isExcludedPath(ctx.path)) {
    await next()
    return
  }

  if (config.skipAuth) {
    await next()
    return
  }

  if (!config.apiKey) {
    ctx.status = 500
    ctx.body = { error: 'Authentication not configured. Set HERMES_WEB_API_KEY environment variable.' }
    return
  }

  const providedKey = extractApiKey(ctx)

  if (!providedKey) {
    ctx.status = 401
    ctx.body = { error: 'Authentication required. Provide API key via Authorization header, X-API-Key header, or api_key query parameter.' }
    return
  }

  if (providedKey !== config.apiKey) {
    ctx.status = 403
    ctx.body = { error: 'Invalid API key' }
    return
  }

  await next()
}

export function createAuthMiddleware(): (ctx: Context, next: Next) => Promise<void> {
  return authMiddleware
}