import Router from '@koa/router'
import * as hermesCli from '../services/hermes-cli'
import { validateSessionId, sanitizeInput } from '../utils/validation'

export const sessionRoutes = new Router()

sessionRoutes.get('/api/sessions', async (ctx) => {
  const source = (ctx.query.source as string) || undefined
  const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : undefined

  if (source) {
    const safeSource = sanitizeInput(source, 32)
    if (!safeSource) {
      ctx.status = 400
      ctx.body = { error: 'Invalid source parameter' }
      return
    }
  }

  try {
    const sessions = await hermesCli.listSessions(source, limit)
    ctx.body = { sessions }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to list sessions' }
    console.error('[Sessions] List failed:', err.message)
  }
})

sessionRoutes.get('/api/sessions/:id', async (ctx) => {
  const sessionId = ctx.params.id

  const validationError = validateSessionId(sessionId)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    const session = await hermesCli.getSession(sessionId)
    if (!session) {
      ctx.status = 404
      ctx.body = { error: 'Session not found' }
      return
    }
    ctx.body = { session }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get session' }
    console.error('[Sessions] Get failed:', err.message)
  }
})

sessionRoutes.delete('/api/sessions/:id', async (ctx) => {
  const sessionId = ctx.params.id

  const validationError = validateSessionId(sessionId)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    const ok = await hermesCli.deleteSession(sessionId)
    if (!ok) {
      ctx.status = 500
      ctx.body = { error: 'Failed to delete session' }
      return
    }
    ctx.body = { ok: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to delete session' }
    console.error('[Sessions] Delete failed:', err.message)
  }
})

sessionRoutes.post('/api/sessions/:id/rename', async (ctx) => {
  const sessionId = ctx.params.id
  const { title } = ctx.request.body as { title?: string }

  const validationError = validateSessionId(sessionId)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  if (!title || typeof title !== 'string') {
    ctx.status = 400
    ctx.body = { error: 'title is required' }
    return
  }

  const safeTitle = sanitizeInput(title.trim(), 100)

  try {
    const ok = await hermesCli.renameSession(sessionId, safeTitle)
    if (!ok) {
      ctx.status = 500
      ctx.body = { error: 'Failed to rename session' }
      return
    }
    ctx.body = { ok: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to rename session' }
    console.error('[Sessions] Rename failed:', err.message)
  }
})
