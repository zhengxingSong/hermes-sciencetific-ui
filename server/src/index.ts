import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from '@koa/bodyparser'
import send from 'koa-send'
import { resolve } from 'path'
import { mkdir } from 'fs/promises'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { homedir } from 'os'
import { config } from './config'
import { proxyRoutes } from './routes/proxy'
import { uploadRoutes } from './routes/upload'
import { sessionRoutes } from './routes/sessions'
import { webhookRoutes } from './routes/webhook'
import { logRoutes } from './routes/logs'
import { fsRoutes } from './routes/filesystem'
import { configRoutes } from './routes/config'
import { weixinRoutes } from './routes/weixin'
import { agentRoutes } from './routes/agents'
import { projectsRoutes } from './routes/projects'
import { dashboardRoutes } from './routes/dashboard'
import { tokenCostsRoutes } from './routes/token-costs'
import { timelineRoutes } from './routes/timeline'
import { patternsRoutes } from './routes/patterns'
import { correctionsRoutes } from './routes/corrections'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error-handler'
import { wsManager } from './websocket'
import { startWatcher, stopWatcher } from './services/file-watcher'
import * as hermesCli from './services/hermes-cli'
const { restartGateway } = hermesCli

export async function bootstrap() {
  await mkdir(config.uploadDir, { recursive: true })
  await mkdir(config.dataDir, { recursive: true })
  await ensureApiServerConfig()

  const app = new Koa()

  app.use(errorHandler)
  app.use(cors({ origin: config.corsOrigins }))
  app.use(bodyParser())

  app.use(webhookRoutes.routes())

  app.use(authMiddleware)

  app.use(logRoutes.routes())
  app.use(uploadRoutes.routes())
  app.use(sessionRoutes.routes())
  app.use(fsRoutes.routes())
  app.use(configRoutes.routes())
  app.use(weixinRoutes.routes())
  app.use(agentRoutes.routes())
  app.use(projectsRoutes.routes())
  app.use(dashboardRoutes.routes())
  app.use(tokenCostsRoutes.routes())
  app.use(timelineRoutes.routes())
  app.use(patternsRoutes.routes())
  app.use(correctionsRoutes.routes())

  // Health endpoint with version
  app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
      const raw = await hermesCli.getVersion()
      const version = raw.split('\n')[0].replace('Hermes Agent ', '') || ''
      ctx.body = { status: 'ok', platform: 'hermes-agent', version }
      return
    }
    await next()
  })

  // WebSocket status endpoint
  app.use(async (ctx, next) => {
    if (ctx.path === '/ws-status') {
      ctx.body = {
        status: 'ok',
        connections: wsManager.getConnectionCount(),
        stats: wsManager.getStats()
      }
      return
    }
    await next()
  })

  app.use(proxyRoutes.routes())

  // Static files serving with proper MIME types
  const distDir = resolve(__dirname, '..')
  app.use(async (ctx, next) => {
    // Skip API routes and WebSocket paths
    if (ctx.path.startsWith('/api') || ctx.path.startsWith('/v1') ||
        ctx.path === '/health' || ctx.path === '/upload' || ctx.path === '/webhook' ||
        ctx.path === '/ws-status' || ctx.path.startsWith('/ws')) {
      return await next()
    }

    // Try to serve static files with correct MIME types
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map)$/i.test(ctx.path)) {
      const mimeTypes: Record<string, string> = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.json': 'application/json',
        '.map': 'application/json',
      }
      const ext = ctx.path.match(/\.[^.]+$/)?.[0] || ''
      try {
        // Set MIME type BEFORE sending file
        if (mimeTypes[ext]) {
          ctx.type = mimeTypes[ext]
        }
        await send(ctx, ctx.path, { root: distDir })
        return
      } catch {
        // File not found, continue to SPA fallback
      }
    }

    await next()
  })

  // SPA fallback for non-asset routes
  app.use(async (ctx) => {
    if (!ctx.path.startsWith('/api') && !ctx.path.startsWith('/v1') &&
        !ctx.path.startsWith('/ws') &&
        ctx.path !== '/health' && ctx.path !== '/upload' && ctx.path !== '/webhook' && ctx.path !== '/ws-status') {
      await send(ctx, 'index.html', { root: distDir })
    }
  })

  // Create HTTP server for WebSocket upgrade
  const server = createServer(app.callback())

  // Create WebSocket server on /ws path
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    clientTracking: false // We handle our own tracking
  })

  // Handle WebSocket connections
  wss.on('connection', (wsConn: WebSocket, req: any) => {
    // Extract api_key from query parameters for authentication
    const url = new URL(req.url || '', `http://localhost:${config.port}`)
    const apiKey = url.searchParams.get('api_key') || url.searchParams.get('token')

    // Validate authentication
    const authenticated = !config.skipAuth && config.apiKey
      ? apiKey === config.apiKey
      : true

    if (!authenticated && config.apiKey) {
      wsConn.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Authentication failed' },
        timestamp: Date.now()
      }))
      wsConn.close(1008, 'Authentication failed')
      return
    }

    // Register connection with manager
    wsManager.connect(wsConn, authenticated)

    // Handle incoming messages from client
    wsConn.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        handleWebSocketMessage(wsConn, message)
      } catch {
        wsConn.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
          timestamp: Date.now()
        }))
      }
    })
  })

  // Start file watcher for Hermes directory
  const hermesDir = resolve(homedir(), '.hermes')
  await startWatcher(hermesDir)

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...')
    await stopWatcher()
    await wsManager.closeAll()
    wss.close()
    server.close()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`  ➜  Hermes BFF Server: http://localhost:${config.port}`)
    console.log(`  ➜  WebSocket: ws://localhost:${config.port}/ws`)
    console.log(`  ➜  Upstream: ${config.upstream}`)
  })
}

/**
 * Handle incoming WebSocket messages from clients
 */
function handleWebSocketMessage(ws: WebSocket, message: any): void {
  const { type, payload } = message

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        payload: { timestamp: Date.now() },
        timestamp: Date.now()
      }))
      break

    case 'subscribe':
      // Client wants to subscribe to specific events
      ws.send(JSON.stringify({
        type: 'subscribed',
        payload: { channels: payload?.channels || ['all'] },
        timestamp: Date.now()
      }))
      break

    case 'get-status':
      ws.send(JSON.stringify({
        type: 'status',
        payload: {
          connections: wsManager.getConnectionCount(),
          stats: wsManager.getStats()
        },
        timestamp: Date.now()
      }))
      break

    default:
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: `Unknown message type: ${type}` },
        timestamp: Date.now()
      }))
  }
}

async function ensureApiServerConfig() {
  const { homedir } = await import('os')
  const { readFileSync, writeFileSync, existsSync } = await import('fs')
  const configPath = resolve(homedir(), '.hermes/config.yaml')

  try {
    if (!existsSync(configPath)) {
      console.log('  ✗ config.yaml not found, skipping')
      return
    }

    const content = readFileSync(configPath, 'utf-8')

    // Case 1: api_server section exists, check if enabled is true
    if (/api_server:/.test(content)) {
      // Check specifically under api_server: look for a direct child `enabled: false`
      // Match api_server block and find enabled at the correct indent level
      const blockMatch = content.match(/api_server:\n((?:[ \t]+.*\n)*?)(?=\S|$)/)
      if (blockMatch) {
        const block = blockMatch[1]
        if (/^([ \t]*)enabled:\s*true/m.test(block)) {
          console.log('  ✓ api_server.enabled is true')
          return
        }
        if (/^([ \t]*)enabled:\s*false/m.test(block)) {
          // Backup before modifying
          const { copyFileSync } = await import('fs')
          copyFileSync(configPath, configPath + '.bak')
          const updated = content.replace(
            /(api_server:\n(?:[ \t]*.*\n)*?[ \t]*)enabled:\s*false/,
            '$1enabled: true'
          )
          writeFileSync(configPath, updated, 'utf-8')
          console.log('  ✓ api_server.enabled changed to true (backup saved to config.yaml.bak)')
          await restartGateway()
          return
        }
      }
      // api_server exists but no enabled key - don't touch, assume default
      console.log('  ✓ api_server section exists')
      return
    }

    // Case 2: api_server section exists and enabled is true (or missing but default true)
    if (/api_server:/.test(content)) {
      console.log('  ✓ api_server section exists')
      return
    }

    // Case 3: platforms section exists but no api_server - append api_server block
    if (/platforms:/.test(content)) {
      const { copyFileSync } = await import('fs')
      copyFileSync(configPath, configPath + '.bak')
      const append = `\n  api_server:\n    enabled: true\n    host: "127.0.0.1"\n    port: 8642\n    key: ""\n    cors_origins: "*"\n`
      const updated = content.replace(/(platforms:)/, '$1' + append)
      writeFileSync(configPath, updated, 'utf-8')
      console.log('  ✓ api_server block appended to platforms (backup saved to config.yaml.bak)')
      await restartGateway()
      return
    }

    // Case 4: No platforms section at all - append at end of file
    const { copyFileSync } = await import('fs')
    copyFileSync(configPath, configPath + '.bak')
    const append = `\nplatforms:\n  api_server:\n    enabled: true\n    host: "127.0.0.1"\n    port: 8642\n    key: ""\n    cors_origins: "*"\n`
    writeFileSync(configPath, content + append, 'utf-8')
    console.log('  ✓ platforms.api_server block appended (backup saved to config.yaml.bak)')
    await restartGateway()
  } catch (err: any) {
    console.error('  ✗ Failed to update config:', err.message)
  }
}

bootstrap()