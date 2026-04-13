import { resolve } from 'path'
import { tmpdir } from 'os'

const isDevelopment = process.env.NODE_ENV !== 'production'

export const config = {
  port: parseInt(process.env.PORT || '8648', 10),
  upstream: process.env.UPSTREAM || 'http://127.0.0.1:8642',
  uploadDir: process.env.UPLOAD_DIR || resolve(tmpdir(), 'hermes-uploads'),
  dataDir: resolve(__dirname, '..', 'data'),
  corsOrigins: process.env.CORS_ORIGINS || (isDevelopment ? '*' : 'http://localhost:8648'),
  apiKey: process.env.HERMES_WEB_API_KEY || '',
  skipAuth: isDevelopment && !process.env.HERMES_WEB_API_KEY,
  webhookSecret: process.env.HERMES_WEBHOOK_SECRET || '',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10),
}
