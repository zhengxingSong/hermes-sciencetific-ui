import { WebSocket, WebSocketServer } from 'ws'
export type WebSocketType = WebSocket

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}

interface ConnectionInfo {
  ws: WebSocket
  isAlive: boolean
  authenticated: boolean
  connectedAt: number
  lastPing: number
}

/**
 * WebSocket Manager for Hermes Web UI
 * Handles connection management, broadcasting, and heartbeat
 */
export class WebSocketManager {
  private connections: Map<WebSocket, ConnectionInfo> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly heartbeatTimeout = 30000 // 30 seconds

  constructor() {
    this.startHeartbeat()
  }

  /**
   * Register a new WebSocket connection
   */
  async connect(ws: WebSocket, authenticated: boolean = false): Promise<void> {
    const info: ConnectionInfo = {
      ws,
      isAlive: true,
      authenticated,
      connectedAt: Date.now(),
      lastPing: Date.now()
    }

    this.connections.set(ws, info)

    ws.on('pong', () => {
      const connInfo = this.connections.get(ws)
      if (connInfo) {
        connInfo.isAlive = true
        connInfo.lastPing = Date.now()
      }
    })

    ws.on('close', () => {
      this.disconnect(ws)
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message)
      this.disconnect(ws)
    })

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      payload: {
        message: 'Connected to Hermes Web UI'
      },
      timestamp: Date.now()
    })
  }

  /**
   * Remove a WebSocket connection
   */
  async disconnect(ws: WebSocket): Promise<void> {
    const info = this.connections.get(ws)
    if (info) {
      this.connections.delete(ws)
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      } catch {
        // Ignore errors during close
      }
    }
  }

  /**
   * Send a message to a specific client
   */
  send(ws: WebSocket, message: WebSocketMessage): boolean {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        return false
      }
    }
    return false
  }

  /**
   * Broadcast a message to all connected clients
   * @param message - The message to broadcast
   * @param authenticatedOnly - If true, only send to authenticated clients
   * @returns Number of clients the message was sent to
   */
  async broadcast(message: object, authenticatedOnly: boolean = false): Promise<number> {
    const wsMessage: WebSocketMessage = {
      type: (message as any).type || 'update',
      payload: message,
      timestamp: Date.now()
    }

    let sentCount = 0
    const deadConnections: WebSocket[] = []

    Array.from(this.connections.entries()).forEach(([ws, info]) => {
      // Skip unauthenticated connections if required
      if (authenticatedOnly && !info.authenticated) {
        return
      }

      if (this.send(ws, wsMessage)) {
        sentCount++
      } else if (ws.readyState !== WebSocket.CONNECTING) {
        deadConnections.push(ws)
      }
    })

    // Clean up dead connections
    deadConnections.forEach(ws => {
      this.connections.delete(ws)
    })

    return sentCount
  }

  /**
   * Get the current number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Get detailed connection statistics
   */
  getStats(): {
    total: number
    authenticated: number
    oldestConnection: number | null
  } {
    let authenticated = 0
    let oldestConnection: number | null = null

    Array.from(this.connections.values()).forEach(info => {
      if (info.authenticated) authenticated++
      if (oldestConnection === null || info.connectedAt < oldestConnection) {
        oldestConnection = info.connectedAt
      }
    })

    return {
      total: this.connections.size,
      authenticated,
      oldestConnection
    }
  }

  /**
   * Mark a connection as authenticated
   */
  authenticate(ws: WebSocket): boolean {
    const info = this.connections.get(ws)
    if (info) {
      info.authenticated = true
      return true
    }
    return false
  }

  /**
   * Check if a connection is authenticated
   */
  isAuthenticated(ws: WebSocket): boolean {
    const info = this.connections.get(ws)
    return info?.authenticated ?? false
  }

  /**
   * Start the heartbeat interval to check connection health
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const deadConnections: WebSocket[] = []

      Array.from(this.connections.entries()).forEach(([ws, info]) => {
        if (!info.isAlive) {
          // Connection didn't respond to ping
          deadConnections.push(ws)
          return
        }

        // Check if connection is stale (no pong response for too long)
        if (now - info.lastPing > this.heartbeatTimeout * 2) {
          deadConnections.push(ws)
          return
        }

        // Mark as not alive and send ping
        info.isAlive = false
        try {
          ws.ping()
        } catch {
          deadConnections.push(ws)
        }
      })

      // Clean up dead connections
      deadConnections.forEach(ws => {
        this.disconnect(ws)
      })
    }, this.heartbeatTimeout)
  }

  /**
   * Stop the heartbeat interval
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Close all connections and cleanup
   */
  async closeAll(): Promise<void> {
    this.stopHeartbeat()

    const closePromises: Promise<void>[] = []

    Array.from(this.connections.keys()).forEach(wsConn => {
      closePromises.push(
        new Promise<void>((resolve) => {
          try {
            wsConn.on('close', () => resolve())
            wsConn.close(1000, 'Server shutting down')
          } catch {
            resolve()
          }
        })
      )
    })

    await Promise.all(closePromises)
    this.connections.clear()
  }
}

// Singleton instance
export const wsManager = new WebSocketManager()