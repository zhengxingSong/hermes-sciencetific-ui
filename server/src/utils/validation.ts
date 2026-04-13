import { Context } from 'koa'

const VALID_LOG_NAMES = ['agent', 'errors', 'gateway']

const SAFE_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/
const DANGEROUS_PATH_CHARS = /[\x00-\x1f\x7f@\\]/
const PATH_TRAVERSAL_PATTERN = /\.\.|\.\.%2f|\.\.%5c/i

export function validateAgentName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Agent name is required'
  }
  if (!SAFE_NAME_PATTERN.test(name)) {
    return 'Agent name must contain only letters, numbers, underscores, and hyphens (max 64 chars)'
  }
  if (name === 'default') {
    return 'Cannot use reserved name "default"'
  }
  return null
}

export function validateProfileName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Profile name is required'
  }
  if (!SAFE_NAME_PATTERN.test(name)) {
    return 'Profile name must contain only letters, numbers, underscores, and hyphens (max 64 chars)'
  }
  return null
}

export function validateLogName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Log name is required'
  }
  if (!VALID_LOG_NAMES.includes(name)) {
    return `Log name must be one of: ${VALID_LOG_NAMES.join(', ')}`
  }
  return null
}

export function validateSessionId(id: string): string | null {
  if (!id || typeof id !== 'string') {
    return 'Session ID is required'
  }
  if (!SESSION_ID_PATTERN.test(id)) {
    return 'Session ID format invalid'
  }
  return null
}

export function validateFilePath(path: string): string | null {
  if (!path || typeof path !== 'string') {
    return 'File path is required'
  }
  if (DANGEROUS_PATH_CHARS.test(path)) {
    return 'File path contains dangerous characters'
  }
  if (PATH_TRAVERSAL_PATTERN.test(path)) {
    return 'File path contains traversal sequence'
  }
  return null
}

export function validateModelName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Model name is required'
  }
  if (name.length > 128) {
    return 'Model name too long'
  }
  if (/[<>"'&]/.test(name)) {
    return 'Model name contains invalid characters'
  }
  return null
}

export function validateProviderKey(key: string): string | null {
  if (!key || typeof key !== 'string') {
    return 'Provider key is required'
  }
  if (key.length > 64) {
    return 'Provider key too long'
  }
  return null
}

export function validateProxyPath(path: string): string | null {
  if (!path || typeof path !== 'string') {
    return 'Path is required'
  }
  if (DANGEROUS_PATH_CHARS.test(path)) {
    return 'Path contains dangerous characters'
  }
  if (path.includes('@')) {
    return 'Path contains forbidden character @'
  }
  if (PATH_TRAVERSAL_PATTERN.test(path)) {
    return 'Path contains traversal sequence'
  }
  if (!path.startsWith('/api/') && !path.startsWith('/v1/')) {
    return 'Path must start with /api/ or /v1/'
  }
  return null
}

const ALLOWED_UPLOAD_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.pdf', '.txt', '.md', '.json', '.yaml', '.yml', '.csv',
  '.zip', '.tar', '.gz'
]

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.svg': ['image/svg+xml'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.json': ['application/json'],
  '.yaml': ['text/yaml', 'application/x-yaml'],
  '.yml': ['text/yaml', 'application/x-yaml'],
  '.csv': ['text/csv'],
  '.zip': ['application/zip'],
  '.tar': ['application/x-tar'],
  '.gz': ['application/gzip', 'application/x-gzip'],
}

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

export function validateUploadFile(filename: string, contentType: string, size: number): string | null {
  if (!filename || typeof filename !== 'string') {
    return 'Filename is required'
  }

  const ext = filename.includes('.') ? '.' + filename.split('.').pop()?.toLowerCase() : ''
  if (!ext || !ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
    return `File extension not allowed. Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`
  }

  if (size > MAX_UPLOAD_SIZE) {
    return `File size exceeds limit (${MAX_UPLOAD_SIZE / 1024 / 1024}MB)`
  }

  const allowedMimes = ALLOWED_MIME_TYPES[ext]
  if (allowedMimes && contentType) {
    const normalizedContent = contentType.toLowerCase().split(';')[0].trim()
    if (!allowedMimes.some(m => normalizedContent === m.toLowerCase())) {
      return 'File content type does not match extension'
    }
  }

  return null
}

export function sanitizeInput(input: string, maxLength: number = 256): string {
  if (!input) return ''
  return input.slice(0, maxLength).replace(/[<>"'&\x00-\x1f]/g, '')
}