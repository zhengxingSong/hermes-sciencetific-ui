import Router from '@koa/router'
import * as hermesCli from '../services/hermes-cli'

interface HourlyActivity {
  hour: number
  count: number
}

interface SimilarTask {
  pattern: string
  sessions: number
  examples: string[]
}

interface ToolSequence {
  sequence: string[]
  count: number
}

interface PromptFrequency {
  prompt: string
  count: number
}

interface PatternsData {
  hourly_activity: HourlyActivity[]
  similar_tasks: SimilarTask[]
  tool_sequences: ToolSequence[]
  prompt_frequency: PromptFrequency[]
}

/**
 * Extract hour from Unix timestamp
 */
function getHour(timestamp: number): number {
  return new Date(timestamp * 1000).getHours()
}

/**
 * Normalize text for pattern matching (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim()
}

/**
 * Find similar session titles using simple word overlap
 */
function findSimilarTasks(sessions: hermesCli.HermesSession[]): SimilarTask[] {
  const titleGroups: Record<string, { count: number; examples: string[] }> = {}

  for (const session of sessions) {
    const title = session.title || 'Untitled'
    const normalized = normalizeText(title)

    // Skip very short titles
    if (normalized.length < 5) continue

    // Extract key words (first few meaningful words)
    const words = normalized.split(/\s+/).filter(w => w.length > 3).slice(0, 3)
    const patternKey = words.join(' ')

    if (!titleGroups[patternKey]) {
      titleGroups[patternKey] = { count: 0, examples: [] }
    }
    titleGroups[patternKey].count++
    if (titleGroups[patternKey].examples.length < 3) {
      titleGroups[patternKey].examples.push(title)
    }
  }

  // Convert to array and sort by count
  return Object.entries(titleGroups)
    .filter(([_, data]) => data.count >= 2) // Only patterns with at least 2 sessions
    .map(([pattern, data]) => ({
      pattern,
      sessions: data.count,
      examples: data.examples,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10) // Top 10 patterns
}

/**
 * Extract tool sequences from session messages
 */
function extractToolSequences(sessions: hermesCli.HermesSession[]): ToolSequence[] {
  const sequenceCounts: Record<string, number> = {}

  for (const session of sessions) {
    if (!session.messages || session.messages.length === 0) continue

    // Extract tool names in order
    const toolSequence: string[] = []
    for (const msg of session.messages) {
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          if (toolCall.function?.name) {
            toolSequence.push(toolCall.function.name)
          }
        }
      }
    }

    // Record sequences of length 2-5
    for (let len = 2; len <= Math.min(5, toolSequence.length); len++) {
      for (let i = 0; i <= toolSequence.length - len; i++) {
        const seq = toolSequence.slice(i, i + len).join(' -> ')
        sequenceCounts[seq] = (sequenceCounts[seq] || 0) + 1
      }
    }
  }

  // Convert to array and sort by count
  return Object.entries(sequenceCounts)
    .filter(([_, count]) => count >= 2) // Only sequences appearing at least twice
    .map(([sequence, count]) => ({
      sequence: sequence.split(' -> '),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15) // Top 15 sequences
}

/**
 * Extract common user prompts
 */
function extractPromptFrequency(sessions: hermesCli.HermesSession[]): PromptFrequency[] {
  const promptCounts: Record<string, number> = {}

  for (const session of sessions) {
    if (!session.messages || session.messages.length === 0) continue

    // Find first user message
    for (const msg of session.messages) {
      if (msg.role === 'user' && msg.content) {
        const content = String(msg.content)
        // Normalize and truncate for grouping
        const normalized = normalizeText(content).slice(0, 50)
        if (normalized.length >= 5) {
          promptCounts[normalized] = (promptCounts[normalized] || 0) + 1
        }
        break // Only first user message per session
      }
    }
  }

  // Convert to array and sort by count
  return Object.entries(promptCounts)
    .filter(([_, count]) => count >= 2) // Only prompts appearing at least twice
    .map(([prompt, count]) => ({ prompt, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // Top 20 prompts
}

/**
 * Calculate hourly activity distribution
 */
function calculateHourlyActivity(sessions: hermesCli.HermesSession[]): HourlyActivity[] {
  const hourCounts: Record<number, number> = {}

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    hourCounts[h] = 0
  }

  // Count sessions per hour
  for (const session of sessions) {
    const hour = getHour(session.started_at)
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  // Convert to array
  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => a.hour - b.hour)
}

export const patternsRoutes = new Router()

/**
 * GET /api/patterns - Return pattern analysis from session data
 */
patternsRoutes.get('/api/patterns', async (ctx) => {
  try {
    // Fetch all sessions (without limit to get full analysis)
    const sessions = await hermesCli.listSessions()

    // Fetch detailed session data for tool sequence analysis
    const sessionsWithMessages: hermesCli.HermesSession[] = []
    for (const session of sessions.slice(0, 50)) { // Limit to 50 for performance
      try {
        const fullSession = await hermesCli.getSession(session.id)
        if (fullSession && fullSession.messages) {
          sessionsWithMessages.push(fullSession)
        }
      } catch {
        // Skip sessions that fail to load
      }
    }

    // Calculate patterns
    const hourly_activity = calculateHourlyActivity(sessions)
    const similar_tasks = findSimilarTasks(sessions)
    const tool_sequences = extractToolSequences(sessionsWithMessages)
    const prompt_frequency = extractPromptFrequency(sessionsWithMessages)

    const response: PatternsData = {
      hourly_activity,
      similar_tasks,
      tool_sequences,
      prompt_frequency,
    }

    ctx.body = response
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to analyze patterns' }
    console.error('[Patterns] Analysis failed:', err.message)
  }
})