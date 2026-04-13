import Router from '@koa/router'
import * as hermesCli from '../services/hermes-cli'
import { validateLogName } from '../utils/validation'

export const logRoutes = new Router()

logRoutes.get('/api/logs', async (ctx) => {
  const files = await hermesCli.listLogFiles()
  ctx.body = { files }
})

interface LogEntry {
  timestamp: string
  level: string
  logger: string
  message: string
  raw: string
}

function parseLine(line: string): LogEntry | null {
  const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(\S+?):\s(.*)$/)
  if (match) {
    return {
      timestamp: match[1],
      level: match[2],
      logger: match[3],
      message: match[4],
      raw: line,
    }
  }
  return null
}

logRoutes.get('/api/logs/:name', async (ctx) => {
  const logName = ctx.params.name

  const validationError = validateLogName(logName)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  const lines = ctx.query.lines ? parseInt(ctx.query.lines as string, 10) : 100
  const level = (ctx.query.level as string) || undefined
  const session = (ctx.query.session as string) || undefined
  const since = (ctx.query.since as string) || undefined

  try {
    const content = await hermesCli.readLogs(logName, lines, level, session, since)
    const rawLines = content.split('\n')

    const entries: (LogEntry | null)[] = []
    for (const line of rawLines) {
      if (line.startsWith('---') || line.trim() === '') continue
      entries.push(parseLine(line))
    }

    ctx.body = { entries }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to read logs' }
    console.error('[Logs] Read failed:', err.message)
  }
})
