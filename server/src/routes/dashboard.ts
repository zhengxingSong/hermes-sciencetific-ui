import Router from '@koa/router'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { homedir } from 'os'
import YAML from 'js-yaml'
import * as hermesCli from '../services/hermes-cli'

const configPath = resolve(homedir(), '.hermes/config.yaml')

interface DashboardOverview {
  sessions_count: number
  messages_count: number
  tool_calls_count: number
  total_tokens: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  reasoning_tokens: number
}

interface CurrentConfig {
  model: string
  provider: string
}

interface ModelUsage {
  model: string
  sessions: number
  tokens: number
}

interface DailyTrend {
  date: string
  sessions: number
  messages: number
}

interface TopTool {
  tool: string
  count: number
}

interface DashboardResponse {
  overview: DashboardOverview
  current_config: CurrentConfig
  model_usage: ModelUsage[]
  daily_trend: DailyTrend[]
  top_tools: TopTool[]
}

/**
 * Read the Hermes config file to get current model and provider
 */
async function readCurrentConfig(): Promise<CurrentConfig> {
  try {
    const raw = await readFile(configPath, 'utf-8')
    const config = (YAML.load(raw) as Record<string, any>) || {}

    const model = config.model?.name || config.model?.model || 'unknown'
    const provider = config.model?.provider || config.providers?.default || 'unknown'

    return { model, provider }
  } catch {
    return { model: 'unknown', provider: 'unknown' }
  }
}

/**
 * Get date string from timestamp (YYYY-MM-DD format)
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000) // Convert from Unix timestamp
  return date.toISOString().split('T')[0]
}

/**
 * Get the date N days ago as YYYY-MM-DD string
 */
function getDateNDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate dashboard statistics from sessions
 */
function calculateDashboardStats(sessions: hermesCli.HermesSession[]): {
  overview: DashboardOverview
  model_usage: ModelUsage[]
  daily_trend: DailyTrend[]
  top_tools: TopTool[]
} {
  // Initialize overview counters
  const overview: DashboardOverview = {
    sessions_count: sessions.length,
    messages_count: 0,
    tool_calls_count: 0,
    total_tokens: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    reasoning_tokens: 0,
  }

  // Model usage tracking
  const modelMap: Record<string, { sessions: number; tokens: number }> = {}

  // Daily trend tracking (last 7 days)
  const dailyMap: Record<string, { sessions: number; messages: number }> = {}
  const sevenDaysAgo = getDateNDaysAgo(7)

  // Initialize all 7 days with zero values
  for (let i = 0; i < 7; i++) {
    const dateStr = getDateNDaysAgo(6 - i)
    dailyMap[dateStr] = { sessions: 0, messages: 0 }
  }

  // Process each session
  for (const session of sessions) {
    // Accumulate overview stats
    overview.messages_count += session.message_count || 0
    overview.tool_calls_count += session.tool_call_count || 0
    overview.input_tokens += session.input_tokens || 0
    overview.output_tokens += session.output_tokens || 0

    // Model usage
    const model = session.model || 'unknown'
    const tokens = (session.input_tokens || 0) + (session.output_tokens || 0)
    if (!modelMap[model]) {
      modelMap[model] = { sessions: 0, tokens: 0 }
    }
    modelMap[model].sessions += 1
    modelMap[model].tokens += tokens

    // Daily trend (only sessions within last 7 days)
    const sessionDate = formatDate(session.started_at)
    if (sessionDate >= sevenDaysAgo && dailyMap[sessionDate]) {
      dailyMap[sessionDate].sessions += 1
      dailyMap[sessionDate].messages += session.message_count || 0
    }
  }

  // Calculate total tokens
  overview.total_tokens = overview.input_tokens + overview.output_tokens

  // Convert model map to sorted array
  const model_usage: ModelUsage[] = Object.entries(modelMap)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10) // Top 10 models

  // Convert daily map to sorted array (most recent first)
  const daily_trend: DailyTrend[] = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date))

  // Note: top_tools cannot be calculated from basic session data
  // Would require parsing messages for tool call details
  const top_tools: TopTool[] = []

  return { overview, model_usage, daily_trend, top_tools }
}

export const dashboardRoutes = new Router()

/**
 * GET /api/dashboard - Return consolidated dashboard overview data
 */
dashboardRoutes.get('/api/dashboard', async (ctx) => {
  try {
    // Fetch sessions data from Hermes CLI
    const sessions = await hermesCli.listSessions()

    // Read current config
    const current_config = await readCurrentConfig()

    // Calculate statistics
    const stats = calculateDashboardStats(sessions)

    // Build response
    const response: DashboardResponse = {
      overview: stats.overview,
      current_config,
      model_usage: stats.model_usage,
      daily_trend: stats.daily_trend,
      top_tools: stats.top_tools,
    }

    ctx.body = response
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to generate dashboard data' }
    console.error('[Dashboard] Generate failed:', err.message)
  }
})

/**
 * GET /api/dashboard/sessions/recent - Get recent sessions for dashboard widget
 */
dashboardRoutes.get('/api/dashboard/sessions/recent', async (ctx) => {
  const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 10

  try {
    const sessions = await hermesCli.listSessions(undefined, limit)

    // Return simplified session data for dashboard display
    const recentSessions = sessions.map(s => ({
      id: s.id,
      title: s.title || 'Untitled',
      model: s.model,
      source: s.source,
      started_at: s.started_at,
      message_count: s.message_count,
      tool_call_count: s.tool_call_count,
      tokens: s.input_tokens + s.output_tokens,
    }))

    ctx.body = { sessions: recentSessions }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get recent sessions' }
    console.error('[Dashboard] Recent sessions failed:', err.message)
  }
})

/**
 * GET /api/dashboard/stats/daily - Get daily statistics for a specific date range
 */
dashboardRoutes.get('/api/dashboard/stats/daily', async (ctx) => {
  const days = ctx.query.days ? parseInt(ctx.query.days as string, 10) : 7

  // Validate days parameter
  if (days < 1 || days > 90) {
    ctx.status = 400
    ctx.body = { error: 'days parameter must be between 1 and 90' }
    return
  }

  try {
    const sessions = await hermesCli.listSessions()

    // Initialize daily map
    const dailyMap: Record<string, {
      sessions: number
      messages: number
      tokens: number
      tool_calls: number
    }> = {}

    const startDate = getDateNDaysAgo(days)

    // Initialize all days with zero values
    for (let i = 0; i < days; i++) {
      const dateStr = getDateNDaysAgo(days - 1 - i)
      dailyMap[dateStr] = { sessions: 0, messages: 0, tokens: 0, tool_calls: 0 }
    }

    // Process sessions
    for (const session of sessions) {
      const sessionDate = formatDate(session.started_at)
      if (sessionDate >= startDate && dailyMap[sessionDate]) {
        dailyMap[sessionDate].sessions += 1
        dailyMap[sessionDate].messages += session.message_count || 0
        dailyMap[sessionDate].tokens += (session.input_tokens || 0) + (session.output_tokens || 0)
        dailyMap[sessionDate].tool_calls += session.tool_call_count || 0
      }
    }

    // Convert to sorted array (most recent first)
    const dailyStats = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date))

    ctx.body = { daily_stats: dailyStats }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get daily statistics' }
    console.error('[Dashboard] Daily stats failed:', err.message)
  }
})

/**
 * GET /api/dashboard/models - Get model usage breakdown
 */
dashboardRoutes.get('/api/dashboard/models', async (ctx) => {
  try {
    const sessions = await hermesCli.listSessions()

    const modelMap: Record<string, {
      sessions: number
      messages: number
      tokens: number
      input_tokens: number
      output_tokens: number
      tool_calls: number
      estimated_cost: number
    }> = {}

    for (const session of sessions) {
      const model = session.model || 'unknown'
      if (!modelMap[model]) {
        modelMap[model] = {
          sessions: 0,
          messages: 0,
          tokens: 0,
          input_tokens: 0,
          output_tokens: 0,
          tool_calls: 0,
          estimated_cost: 0,
        }
      }

      modelMap[model].sessions += 1
      modelMap[model].messages += session.message_count || 0
      modelMap[model].input_tokens += session.input_tokens || 0
      modelMap[model].output_tokens += session.output_tokens || 0
      modelMap[model].tokens += (session.input_tokens || 0) + (session.output_tokens || 0)
      modelMap[model].tool_calls += session.tool_call_count || 0
      modelMap[model].estimated_cost += session.estimated_cost_usd || 0
    }

    // Convert to sorted array by sessions count
    const modelStats = Object.entries(modelMap)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.sessions - a.sessions)

    ctx.body = { models: modelStats }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get model statistics' }
    console.error('[Dashboard] Model stats failed:', err.message)
  }
})