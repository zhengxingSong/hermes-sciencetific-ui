import Router from '@koa/router'
import axios from 'axios'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { homedir } from 'os'
import { restartGateway } from '../services/hermes-cli'
import { writeSecureFile } from '../utils/file-security'
import { sanitizeInput } from '../utils/validation'

const envPath = resolve(homedir(), '.hermes/.env')
const ILINK_BASE = 'https://ilinkai.weixin.qq.com'

export const weixinRoutes = new Router()

// GET /api/weixin/qrcode — fetch QR code from Tencent iLink API
weixinRoutes.get('/api/weixin/qrcode', async (ctx) => {
  try {
    const res = await axios.get(`${ILINK_BASE}/ilink/bot/get_bot_qrcode`, {
      params: { bot_type: 3 },
      timeout: 15000,
    })
    const data = res.data
    if (!data || !data.qrcode) {
      ctx.status = 500
      ctx.body = { error: 'Failed to get QR code' }
      return
    }
    ctx.body = {
      qrcode: data.qrcode,
      qrcode_url: data.qrcode_img_content,
    }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message || 'Failed to connect to iLink API' }
  }
})

// GET /api/weixin/qrcode/status — poll QR scan status
weixinRoutes.get('/api/weixin/qrcode/status', async (ctx) => {
  const qrcode = ctx.query.qrcode as string
  if (!qrcode) {
    ctx.status = 400
    ctx.body = { error: 'Missing qrcode parameter' }
    return
  }

  const safeQrcode = sanitizeInput(qrcode, 64)

  try {
    const res = await axios.get(`${ILINK_BASE}/ilink/bot/get_qrcode_status`, {
      params: { qrcode: safeQrcode },
      timeout: 35000,
    })
    const data = res.data
    const status = data?.status || 'wait'
    ctx.body = { status }

    if (status === 'confirmed') {
      ctx.body = {
        status: 'confirmed',
        account_id: sanitizeInput(data.ilink_bot_id || '', 64),
        token: sanitizeInput(data.bot_token || '', 128),
        base_url: sanitizeInput(data.baseurl || '', 256),
      }
    }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to poll QR status' }
    console.error('[Weixin] QR status failed:', err.message)
  }
})

// POST /api/weixin/save — save weixin credentials to .env
weixinRoutes.post('/api/weixin/save', async (ctx) => {
  const { account_id, token, base_url } = ctx.request.body as {
    account_id: string
    token: string
    base_url?: string
  }

  if (!account_id || !token) {
    ctx.status = 400
    ctx.body = { error: 'Missing account_id or token' }
    return
  }

  const safeAccountId = sanitizeInput(account_id, 64)
  const safeToken = sanitizeInput(token, 128)
  const safeBaseUrl = base_url ? sanitizeInput(base_url, 256) : ''

  try {
    let raw: string
    try {
      raw = await readFile(envPath, 'utf-8')
    } catch {
      raw = ''
    }

    const entries: Record<string, string> = {
      WEIXIN_ACCOUNT_ID: safeAccountId,
      WEIXIN_TOKEN: safeToken,
    }
    if (safeBaseUrl) entries.WEIXIN_BASE_URL = safeBaseUrl

    const lines = raw.split('\n')
    const existingKeys = new Set<string>()

    const result: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        result.push(line)
        continue
      }
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim()
        if (key in entries) {
          result.push(`${key}=${entries[key]}`)
          existingKeys.add(key)
          continue
        }
      }
      result.push(line)
    }

    for (const [key, val] of Object.entries(entries)) {
      if (!existingKeys.has(key)) {
        result.push(`${key}=${val}`)
      }
    }

    let output = result.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n'
    await writeSecureFile(envPath, output)
    await restartGateway()

    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to save weixin credentials' }
    console.error('[Weixin] Save failed:', err.message)
  }
})
