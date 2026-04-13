import { Context, Next } from 'koa'
import { config } from '../config'

const MASKED_ERROR = 'An internal error occurred'

interface ErrorResponse {
  error: string
  details?: string
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function sanitizeErrorMessage(message: string): string {
  if (isProduction()) {
    return MASKED_ERROR
  }

  const sanitized = message
    .replace(/\/[\w/.-]+/g, '[path]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')
    .replace(/password|token|secret|key|credential/gi, '[redacted]')

  return sanitized.slice(0, 200)
}

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next()
  } catch (err: any) {
    const status = err.status || err.statusCode || 500

    const response: ErrorResponse = {
      error: sanitizeErrorMessage(err.message || MASKED_ERROR)
    }

    if (!isProduction() && err.stack) {
      response.details = err.stack.slice(0, 500)
    }

    ctx.status = status
    ctx.body = response

    console.error(`[Error] ${ctx.method} ${ctx.path}: ${err.message}`)
  }
}

export function createErrorHandler(): (ctx: Context, next: Next) => Promise<void> {
  return errorHandler
}