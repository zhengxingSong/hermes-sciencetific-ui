import Router from '@koa/router'
import * as hermesCli from '../services/hermes-cli'

interface Correction {
  id: string
  session_id: string
  timestamp: number
  original: string
  corrected: string
  type: 'edit' | 'reject'
}

interface CorrectionsResponse {
  corrections: Correction[]
  stats: {
    total: number
    edits: number
    rejects: number
    recent_24h: number
  }
}

/**
 * Detect corrections in session messages
 * Looks for patterns where user content appears after assistant content
 * suggesting the user modified or rejected the AI response
 */
function detectCorrections(session: hermesCli.HermesSession): Correction[] {
  const corrections: Correction[] = []

  if (!session.messages || session.messages.length < 2) {
    return corrections
  }

  // Look for correction patterns:
  // 1. User message that contains "no", "wrong", "actually", etc. after assistant message
  // 2. User message with code changes following assistant code suggestion
  // 3. Multiple consecutive user messages (suggesting rejection/retry)

  const correctionKeywords = [
    'no', 'wrong', 'incorrect', 'actually', 'try again', 'not what',
    'fix', 'change', 'modify', 'update', 'replace', 'different',
    'error', 'bug', 'issue', 'problem', 'doesn\'t work', 'failed'
  ]

  let prevAssistantMsg: any = null

  for (let i = 0; i < session.messages.length; i++) {
    const msg = session.messages[i]

    if (msg.role === 'assistant') {
      prevAssistantMsg = msg
    } else if (msg.role === 'user' && prevAssistantMsg) {
      const userContent = String(msg.content || '').toLowerCase()
      const assistantContent = String(prevAssistantMsg.content || '')

      // Check for correction keywords
      const hasCorrectionKeyword = correctionKeywords.some(kw => userContent.includes(kw))

      // Check for short rejection messages (like "no", "wrong", etc.)
      const isShortRejection = userContent.length < 20 && hasCorrectionKeyword

      // Check for edit patterns (user providing alternative code/solution)
      const hasCodeEdit = userContent.includes('```') && assistantContent.includes('```')

      if (hasCorrectionKeyword || isShortRejection || hasCodeEdit) {
        // Determine correction type
        let type: 'edit' | 'reject' = 'edit'
        if (isShortRejection && !hasCodeEdit) {
          type = 'reject'
        }

        corrections.push({
          id: `${session.id}-${i}`,
          session_id: session.id,
          timestamp: msg.timestamp || session.started_at,
          original: assistantContent.slice(0, 500), // Truncate for display
          corrected: String(msg.content || '').slice(0, 500),
          type,
        })
      }

      prevAssistantMsg = null // Reset after processing
    }
  }

  return corrections
}

/**
 * Calculate correction statistics
 */
function calculateStats(corrections: Correction[]): CorrectionsResponse['stats'] {
  const now = Date.now() / 1000 // Unix timestamp
  const dayAgo = now - 24 * 60 * 60

  return {
    total: corrections.length,
    edits: corrections.filter(c => c.type === 'edit').length,
    rejects: corrections.filter(c => c.type === 'reject').length,
    recent_24h: corrections.filter(c => c.timestamp >= dayAgo).length,
  }
}

export const correctionsRoutes = new Router()

/**
 * GET /api/corrections - Return user corrections history
 */
correctionsRoutes.get('/api/corrections', async (ctx) => {
  const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 100

  try {
    // Fetch sessions
    const sessions = await hermesCli.listSessions()

    // Collect corrections from all sessions
    const allCorrections: Correction[] = []

    // Process sessions to find corrections
    for (const session of sessions.slice(0, Math.min(limit, 200))) {
      try {
        const fullSession = await hermesCli.getSession(session.id)
        if (fullSession && fullSession.messages) {
          const corrections = detectCorrections(fullSession)
          allCorrections.push(...corrections)
        }
      } catch {
        // Skip sessions that fail to load
      }
    }

    // Sort by timestamp (most recent first)
    allCorrections.sort((a, b) => b.timestamp - a.timestamp)

    // Apply limit
    const corrections = allCorrections.slice(0, limit)

    // Calculate stats
    const stats = calculateStats(allCorrections)

    const response: CorrectionsResponse = {
      corrections,
      stats,
    }

    ctx.body = response
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to fetch corrections' }
    console.error('[Corrections] Fetch failed:', err.message)
  }
})

/**
 * GET /api/corrections/stats - Return correction statistics only
 */
correctionsRoutes.get('/api/corrections/stats', async (ctx) => {
  try {
    const sessions = await hermesCli.listSessions()
    const allCorrections: Correction[] = []

    for (const session of sessions.slice(0, 100)) {
      try {
        const fullSession = await hermesCli.getSession(session.id)
        if (fullSession && fullSession.messages) {
          const corrections = detectCorrections(fullSession)
          allCorrections.push(...corrections)
        }
      } catch {
        // Skip
      }
    }

    const stats = calculateStats(allCorrections)
    ctx.body = { stats }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to fetch correction stats' }
    console.error('[Corrections] Stats failed:', err.message)
  }
})