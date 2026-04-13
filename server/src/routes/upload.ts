import Router from '@koa/router'
import { randomBytes } from 'crypto'
import { mkdir, writeFile, chmod } from 'fs/promises'
import { config } from '../config'
import { validateUploadFile, sanitizeInput } from '../utils/validation'

export const uploadRoutes = new Router()

uploadRoutes.post('/upload', async (ctx) => {
  const contentType = ctx.get('content-type') || ''
  if (!contentType.startsWith('multipart/form-data')) {
    ctx.status = 400
    ctx.body = { error: 'Expected multipart/form-data' }
    return
  }

  const boundary = '--' + contentType.split('boundary=')[1]
  if (!boundary || boundary === '--undefined') {
    ctx.status = 400
    ctx.body = { error: 'Missing boundary' }
    return
  }

  await mkdir(config.uploadDir, { recursive: true })

  const chunks: Buffer[] = []
  for await (const chunk of ctx.req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('latin1')
  const parts = body.split(boundary).slice(1, -1)

  const results: { name: string; path: string }[] = []

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const header = part.substring(0, headerEnd)
    const data = part.substring(headerEnd + 4, part.length - 2)

    const filenameMatch = header.match(/filename="([^"]+)"/)
    if (!filenameMatch) continue

    const rawFilename = filenameMatch[1]
    const safeFilename = sanitizeInput(rawFilename, 64)

    const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i)
    const fileContentType = contentTypeMatch?.[1]?.trim() || 'application/octet-stream'

    const dataSize = Buffer.byteLength(data, 'binary')

    const validationError = validateUploadFile(safeFilename, fileContentType, dataSize)
    if (validationError) {
      ctx.status = 400
      ctx.body = { error: validationError }
      return
    }

    const ext = safeFilename.includes('.') ? '.' + safeFilename.split('.').pop()?.toLowerCase() : ''
    const allowedExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.pdf', '.txt', '.md', '.json', '.yaml', '.yml', '.csv',
      '.zip', '.tar', '.gz'
    ]

    if (!ext || !allowedExtensions.includes(ext)) {
      ctx.status = 400
      ctx.body = { error: `File extension not allowed: ${ext}` }
      return
    }

    const savedName = randomBytes(16).toString('hex') + ext
    const savedPath = `${config.uploadDir}/${savedName}`

    await writeFile(savedPath, Buffer.from(data, 'binary'))
    await chmod(savedPath, 0o644)

    results.push({ name: safeFilename, path: savedPath })
  }

  ctx.body = { files: results }
})
