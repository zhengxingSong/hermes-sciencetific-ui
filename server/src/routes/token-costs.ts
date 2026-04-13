import Router from '@koa/router'
import * as hermesCli from '../services/hermes-cli'

/**
 * Model pricing table (USD per 1M tokens)
 * Prices are in format: { input: number, output: number }
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude models
  'claude-opus-4.6': { input: 15, output: 75 },
  'claude-sonnet-4.6': { input: 3, output: 15 },
  'claude-haiku-3.5': { input: 0.80, output: 4 },
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-3.5-haiku': { input: 0.80, output: 4 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },

  // OpenAI GPT models
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-32k': { input: 60, output: 120 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 1.10, output: 4.40 },
  'o1-preview': { input: 15, output: 60 },
  'o3-mini': { input: 1.10, output: 4.40 },

  // DeepSeek models
  'deepseek-v3': { input: 0.27, output: 1.10 },
  'deepseek-chat': { input: 0.27, output: 1.10 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'deepseek-coder': { input: 0.14, output: 0.28 },

  // Kimi models
  'kimi-k2.5': { input: 0.50, output: 2 },
  'kimi-chat': { input: 0.50, output: 2 },
  'moonshot-v1-8k': { input: 0.50, output: 2 },
  'moonshot-v1-32k': { input: 1, output: 4 },
  'moonshot-v1-128k': { input: 2, output: 8 },

  // Google Gemini models
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.5-pro': { input: 1.25, output: 5 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },

  // Anthropic models (alternative naming)
  'claude-2': { input: 8, output: 24 },
  'claude-2.1': { input: 8, output: 24 },
  'claude-instant-1': { input: 0.80, output: 2.40 },

  // Meta Llama models
  'llama-3.1-405b': { input: 2.70, output: 2.70 },
  'llama-3.1-70b': { input: 0.64, output: 0.64 },
  'llama-3.1-8b': { input: 0.056, output: 0.056 },
  'llama-3.2-90b': { input: 0.35, output: 0.40 },
  'llama-3.2-11b': { input: 0.03, output: 0.05 },

  // Mistral models
  'mistral-large': { input: 2, output: 6 },
  'mistral-medium': { input: 0.70, output: 2.10 },
  'mistral-small': { input: 0.20, output: 0.60 },
  'codestral': { input: 0.30, output: 0.90 },
  'mixtral-8x7b': { input: 0.60, output: 0.60 },
  'mixtral-8x22b': { input: 0.65, output: 0.65 },

  // Cohere models
  'command-r-plus': { input: 2.50, output: 10 },
  'command-r': { input: 0.50, output: 1.50 },

  // Perplexity models
  'llama-3.1-sonar-small': { input: 0.20, output: 0.20 },
  'llama-3.1-sonar-large': { input: 1, output: 1 },
  'llama-3.1-sonar-huge': { input: 5, output: 5 },

  // AI21 models
  'jamba-1-5-mini': { input: 0.20, output: 0.40 },
  'jamba-1-5-large': { input: 2, output: 8 },

  // xAI models
  'grok-beta': { input: 5, output: 15 },
  'grok-2': { input: 2, output: 10 },
  'grok-2-mini': { input: 0.20, output: 0.10 },

  // Amazon Bedrock (Claude on Bedrock)
  'bedrock-claude-3-opus': { input: 15, output: 75 },
  'bedrock-claude-3-sonnet': { input: 3, output: 15 },
  'bedrock-claude-3-haiku': { input: 0.25, output: 1.25 },

  // Azure OpenAI models
  'azure-gpt-4o': { input: 2.5, output: 10 },
  'azure-gpt-4o-mini': { input: 0.15, output: 0.60 },
  'azure-gpt-4-turbo': { input: 10, output: 30 },
  'azure-gpt-35-turbo': { input: 0.50, output: 1.50 },

  // Qwen models
  'qwen-turbo': { input: 0.20, output: 0.60 },
  'qwen-plus': { input: 0.40, output: 1.20 },
  'qwen-max': { input: 2.40, output: 9.60 },
  'qwen-2.5-72b': { input: 0.35, output: 0.35 },
  'qwen-2.5-32b': { input: 0.12, output: 0.12 },

  // Zhipu AI models
  'glm-4': { input: 0.70, output: 0.70 },
  'glm-4-flash': { input: 0.01, output: 0.01 },
  'glm-4-plus': { input: 2.80, output: 2.80 },

  // Default fallback pricing (for unknown models)
  'default': { input: 1, output: 3 },
}

/**
 * Get pricing for a model, with fallback to default
 */
function getModelPricing(model: string): { input: number; output: number } {
  if (!model) return MODEL_PRICING['default']

  // Normalize model name for matching
  const normalizedModel = model.toLowerCase().trim()

  // Direct match
  if (MODEL_PRICING[normalizedModel]) {
    return MODEL_PRICING[normalizedModel]
  }

  // Try partial matching for model families
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (key === 'default') continue
    if (normalizedModel.includes(key) || key.includes(normalizedModel)) {
      return pricing
    }
  }

  // Family-based matching
  if (normalizedModel.includes('claude')) {
    if (normalizedModel.includes('opus') || normalizedModel.includes('4.6-opus') || normalizedModel.includes('4-opus')) {
      return MODEL_PRICING['claude-opus-4.6']
    }
    if (normalizedModel.includes('sonnet')) {
      return MODEL_PRICING['claude-sonnet-4.6']
    }
    if (normalizedModel.includes('haiku')) {
      return MODEL_PRICING['claude-haiku-3.5']
    }
  }

  if (normalizedModel.includes('gpt-4o') && !normalizedModel.includes('mini')) {
    return MODEL_PRICING['gpt-4o']
  }
  if (normalizedModel.includes('gpt-4o-mini') || normalizedModel.includes('gpt-4o-mini')) {
    return MODEL_PRICING['gpt-4o-mini']
  }
  if (normalizedModel.includes('gpt-4-turbo') || normalizedModel.includes('gpt-4-1106') || normalizedModel.includes('gpt-4-0125')) {
    return MODEL_PRICING['gpt-4-turbo']
  }
  if (normalizedModel.includes('gpt-4')) {
    return MODEL_PRICING['gpt-4']
  }
  if (normalizedModel.includes('gpt-3.5')) {
    return MODEL_PRICING['gpt-3.5-turbo']
  }

  if (normalizedModel.includes('deepseek')) {
    if (normalizedModel.includes('reasoner') || normalizedModel.includes('r1')) {
      return MODEL_PRICING['deepseek-reasoner']
    }
    if (normalizedModel.includes('coder')) {
      return MODEL_PRICING['deepseek-coder']
    }
    return MODEL_PRICING['deepseek-v3']
  }

  if (normalizedModel.includes('gemini')) {
    if (normalizedModel.includes('2.5-pro') || normalizedModel.includes('2.5-pro')) {
      return MODEL_PRICING['gemini-2.5-pro']
    }
    if (normalizedModel.includes('2.5-flash') || normalizedModel.includes('2.0-flash')) {
      return MODEL_PRICING['gemini-2.5-flash']
    }
    if (normalizedModel.includes('1.5-pro')) {
      return MODEL_PRICING['gemini-1.5-pro']
    }
    return MODEL_PRICING['gemini-1.5-flash']
  }

  if (normalizedModel.includes('kimi') || normalizedModel.includes('moonshot')) {
    return MODEL_PRICING['kimi-k2.5']
  }

  if (normalizedModel.includes('llama')) {
    if (normalizedModel.includes('405b')) {
      return MODEL_PRICING['llama-3.1-405b']
    }
    if (normalizedModel.includes('70b')) {
      return MODEL_PRICING['llama-3.1-70b']
    }
    return MODEL_PRICING['llama-3.1-8b']
  }

  if (normalizedModel.includes('mistral') || normalizedModel.includes('mixtral')) {
    if (normalizedModel.includes('large')) {
      return MODEL_PRICING['mistral-large']
    }
    if (normalizedModel.includes('medium')) {
      return MODEL_PRICING['mistral-medium']
    }
    return MODEL_PRICING['mistral-small']
  }

  if (normalizedModel.includes('qwen')) {
    if (normalizedModel.includes('max')) {
      return MODEL_PRICING['qwen-max']
    }
    if (normalizedModel.includes('plus')) {
      return MODEL_PRICING['qwen-plus']
    }
    return MODEL_PRICING['qwen-turbo']
  }

  if (normalizedModel.includes('o1')) {
    if (normalizedModel.includes('mini')) {
      return MODEL_PRICING['o1-mini']
    }
    return MODEL_PRICING['o1']
  }

  if (normalizedModel.includes('o3') && normalizedModel.includes('mini')) {
    return MODEL_PRICING['o3-mini']
  }

  if (normalizedModel.includes('grok')) {
    if (normalizedModel.includes('mini')) {
      return MODEL_PRICING['grok-2-mini']
    }
    return MODEL_PRICING['grok-2']
  }

  return MODEL_PRICING['default']
}

/**
 * Calculate cost for a session
 */
function calculateSessionCost(session: hermesCli.HermesSession): number {
  const pricing = getModelPricing(session.model)
  const inputCost = (session.input_tokens / 1_000_000) * pricing.input
  const outputCost = (session.output_tokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toISOString().split('T')[0]
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Type definitions for response
interface ModelStats {
  model: string
  sessions: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

interface DailyStats {
  date: string
  cost: number
  tokens: number
}

interface TokenCostsResponse {
  today: {
    date: string
    session_count: number
    tokens: number
    cost_usd: number
  }
  all_time: {
    session_count: number
    total_tokens: number
    cost_usd: number
  }
  by_model: ModelStats[]
  daily_trend: DailyStats[]
  pricing_table: Record<string, { input: number; output: number }>
}

export const tokenCostsRoutes = new Router()

// GET /api/token-costs — Get token costs statistics
tokenCostsRoutes.get('/api/token-costs', async (ctx) => {
  try {
    // Fetch all sessions
    const sessions = await hermesCli.listSessions()

    if (!sessions || sessions.length === 0) {
      const emptyResponse: TokenCostsResponse = {
        today: {
          date: getTodayDate(),
          session_count: 0,
          tokens: 0,
          cost_usd: 0,
        },
        all_time: {
          session_count: 0,
          total_tokens: 0,
          cost_usd: 0,
        },
        by_model: [],
        daily_trend: [],
        pricing_table: MODEL_PRICING,
      }
      ctx.body = emptyResponse
      return
    }

    const today = getTodayDate()
    const modelStats: Record<string, ModelStats> = {}
    const dailyStats: Record<string, DailyStats> = {}

    // Initialize today's stats
    let todayStats = {
      session_count: 0,
      tokens: 0,
      cost_usd: 0,
    }

    let allTimeStats = {
      session_count: 0,
      total_tokens: 0,
      cost_usd: 0,
    }

    // Process each session
    for (const session of sessions) {
      const sessionCost = calculateSessionCost(session)
      const totalTokens = session.input_tokens + session.output_tokens
      const sessionDate = formatDate(session.started_at)

      // Update all-time stats
      allTimeStats.session_count++
      allTimeStats.total_tokens += totalTokens
      allTimeStats.cost_usd += sessionCost

      // Update today's stats
      if (sessionDate === today) {
        todayStats.session_count++
        todayStats.tokens += totalTokens
        todayStats.cost_usd += sessionCost
      }

      // Update model stats
      const modelKey = session.model || 'unknown'
      if (!modelStats[modelKey]) {
        modelStats[modelKey] = {
          model: modelKey,
          sessions: 0,
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
        }
      }
      modelStats[modelKey].sessions++
      modelStats[modelKey].input_tokens += session.input_tokens
      modelStats[modelKey].output_tokens += session.output_tokens
      modelStats[modelKey].cost_usd += sessionCost

      // Update daily stats
      if (!dailyStats[sessionDate]) {
        dailyStats[sessionDate] = {
          date: sessionDate,
          cost: 0,
          tokens: 0,
        }
      }
      dailyStats[sessionDate].cost += sessionCost
      dailyStats[sessionDate].tokens += totalTokens
    }

    // Convert to arrays and sort
    const byModel = Object.values(modelStats).sort((a, b) => b.cost_usd - a.cost_usd)
    const dailyTrend = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))

    // Round costs to 6 decimal places for cleaner output
    const roundCost = (cost: number) => Math.round(cost * 1_000_000) / 1_000_000

    const response: TokenCostsResponse = {
      today: {
        date: today,
        session_count: todayStats.session_count,
        tokens: todayStats.tokens,
        cost_usd: roundCost(todayStats.cost_usd),
      },
      all_time: {
        session_count: allTimeStats.session_count,
        total_tokens: allTimeStats.total_tokens,
        cost_usd: roundCost(allTimeStats.cost_usd),
      },
      by_model: byModel.map(m => ({
        ...m,
        cost_usd: roundCost(m.cost_usd),
      })),
      daily_trend: dailyTrend.map(d => ({
        ...d,
        cost: roundCost(d.cost),
      })),
      pricing_table: MODEL_PRICING,
    }

    ctx.body = response
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to calculate token costs' }
    console.error('[TokenCosts] Calculation failed:', err.message)
  }
})

// GET /api/token-costs/models — Get pricing table only
tokenCostsRoutes.get('/api/token-costs/models', async (ctx) => {
  ctx.body = {
    pricing_table: MODEL_PRICING,
    model_count: Object.keys(MODEL_PRICING).length - 1, // Exclude 'default'
  }
})

// GET /api/token-costs/estimate — Estimate cost for given tokens
tokenCostsRoutes.get('/api/token-costs/estimate', async (ctx) => {
  const model = (ctx.query.model as string) || ''
  const inputTokens = parseInt(ctx.query.input_tokens as string, 10) || 0
  const outputTokens = parseInt(ctx.query.output_tokens as string, 10) || 0

  if (!model) {
    ctx.status = 400
    ctx.body = { error: 'model parameter is required' }
    return
  }

  const pricing = getModelPricing(model)
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const totalCost = inputCost + outputCost

  ctx.body = {
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    pricing_per_million: pricing,
    breakdown: {
      input_cost_usd: Math.round(inputCost * 1_000_000) / 1_000_000,
      output_cost_usd: Math.round(outputCost * 1_000_000) / 1_000_000,
    },
    total_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000,
  }
})