import Router from '@koa/router'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { validateAgentName, validateProfileName, sanitizeInput } from '../utils/validation'

const execFileAsync = promisify(execFile)
const hermesDir = resolve(homedir(), '.hermes')

export const agentRoutes = new Router()

async function runHermes(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('hermes', args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  })
}

agentRoutes.get('/api/agents', async (ctx) => {
  try {
    const { stdout } = await runHermes(['profile', 'list'])

    const lines = stdout.trim().split('\n')
    const agents: Array<{
      name: string
      model: string
      gateway: string
      alias: string
      isActive: boolean
    }> = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('Profile') || trimmed.startsWith('─')) {
        continue
      }

      const match = trimmed.match(/^(.)\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)?/)
      if (match) {
        const [, indicator, name, model, gateway, alias] = match
        const safeName = sanitizeInput(name.trim(), 64)
        const safeModel = sanitizeInput(model.trim(), 128)
        agents.push({
          name: safeName,
          model: safeModel,
          gateway: sanitizeInput(gateway.trim(), 64),
          alias: sanitizeInput(alias?.trim() || '', 32),
          isActive: indicator === '◆',
        })
      }
    }

    ctx.body = { agents }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to list agents' }
    console.error('[Agents] List failed:', err.message)
  }
})

agentRoutes.get('/api/agents/:name', async (ctx) => {
  const { name } = ctx.params

  const validationError = validateProfileName(name)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    const { stdout } = await runHermes(['profile', 'show', name])

    const profile: Record<string, string> = {}
    const lines = stdout.trim().split('\n')
    for (const line of lines) {
      const match = line.match(/^(.+?):\s*(.+)$/)
      if (match) {
        profile[match[1].trim().toLowerCase().replace(/\s+/g, '_')] = sanitizeInput(match[2].trim(), 256)
      }
    }

    const profileDir = name === 'default' ? hermesDir : join(hermesDir, 'profiles', name)
    const soulPath = join(profileDir, 'SOUL.md')
    const configPath = join(profileDir, 'config.yaml')

    let soul = ''
    let config = ''

    try {
      soul = await readFile(soulPath, 'utf-8')
    } catch {
    }

    try {
      config = await readFile(configPath, 'utf-8')
    } catch {
    }

    ctx.body = {
      profile,
      soul,
      config,
    }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get agent details' }
    console.error('[Agents] Get failed:', err.message)
  }
})

agentRoutes.post('/api/agents', async (ctx) => {
  const { name, cloneFrom } = ctx.request.body as { name: string; cloneFrom?: string }

  const validationError = validateAgentName(name)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  if (cloneFrom) {
    const cloneError = validateProfileName(cloneFrom)
    if (cloneError) {
      ctx.status = 400
      ctx.body = { error: `Invalid clone source: ${cloneError}` }
      return
    }
  }

  try {
    const args = ['profile', 'create', name]
    if (cloneFrom) {
      args.push('--clone-from', cloneFrom)
    } else {
      args.push('--clone')
    }

    await runHermes(args)
    ctx.body = { success: true, name: sanitizeInput(name, 64) }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to create agent' }
    console.error('[Agents] Create failed:', err.message)
  }
})

agentRoutes.put('/api/agents/:name', async (ctx) => {
  const { name } = ctx.params
  const { soul, config, model, provider } = ctx.request.body as {
    soul?: string
    config?: string
    model?: string
    provider?: string
  }

  const validationError = validateProfileName(name)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    const profileDir = name === 'default' ? hermesDir : join(hermesDir, 'profiles', name)

    if (soul !== undefined) {
      const soulPath = join(profileDir, 'SOUL.md')
      await writeFile(soulPath, soul, 'utf-8')
    }

    if (config !== undefined) {
      const configPath = join(profileDir, 'config.yaml')
      await writeFile(configPath, config, 'utf-8')
    }

    if (model) {
      const safeModel = sanitizeInput(model, 128)
      const args = ['-p', name, 'config', 'set', 'model.default', safeModel]
      if (provider) {
        const safeProvider = sanitizeInput(provider, 64)
        await runHermes(['-p', name, 'config', 'set', 'model.provider', safeProvider])
      }
      await runHermes(args)
    }

    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to update agent' }
    console.error('[Agents] Update failed:', err.message)
  }
})

agentRoutes.delete('/api/agents/:name', async (ctx) => {
  const { name } = ctx.params

  if (name === 'default') {
    ctx.status = 400
    ctx.body = { error: 'Cannot delete default profile' }
    return
  }

  const validationError = validateAgentName(name)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    await runHermes(['profile', 'delete', name])
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to delete agent' }
    console.error('[Agents] Delete failed:', err.message)
  }
})

agentRoutes.post('/api/agents/:name/switch', async (ctx) => {
  const { name } = ctx.params

  const validationError = validateProfileName(name)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    await runHermes(['profile', 'use', name])
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to switch agent' }
    console.error('[Agents] Switch failed:', err.message)
  }
})

agentRoutes.get('/api/agents/:name/config', async (ctx) => {
  const { name } = ctx.params

  const validationError = validateProfileName(name)
  if (validationError) {
    ctx.status = 400
    ctx.body = { error: validationError }
    return
  }

  try {
    const profileDir = name === 'default' ? hermesDir : join(hermesDir, 'profiles', name)
    const configPath = join(profileDir, 'config.yaml')

    let config = ''
    try {
      config = await readFile(configPath, 'utf-8')
    } catch {
    }

    ctx.body = { config }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get agent config' }
    console.error('[Agents] Config get failed:', err.message)
  }
})
