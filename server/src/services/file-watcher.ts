import { watch, FSWatcher, existsSync } from 'fs'
import { homedir } from 'os'
import { resolve, basename } from 'path'
import { wsManager } from '../websocket'

export interface FileChangeEvent {
  type: 'change' | 'rename' | 'delete'
  file: string
  path: string
  timestamp: number
}

type FileChangeCallback = (event: FileChangeEvent) => void

interface WatcherConfig {
  hermesDir: string
  debounceMs: number
  watchedFiles: string[]
  watchedDirs: string[]
}

const DEFAULT_CONFIG: WatcherConfig = {
  hermesDir: resolve(homedir(), '.hermes'),
  debounceMs: 500, // Debounce rapid changes by 500ms
  watchedFiles: [
    'state.db',
    'MEMORY.md',
    'USER.md',
    'config.yaml'
  ],
  watchedDirs: [
    'skills'
  ]
}

class FileWatcher {
  private watchers: Map<string, FSWatcher> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private changeCallbacks: FileChangeCallback[] = []
  private config: WatcherConfig
  private isRunning = false

  constructor(config: Partial<WatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Start watching the Hermes directory
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('File watcher already running')
      return
    }

    const hermesDir = this.config.hermesDir

    if (!existsSync(hermesDir)) {
      console.log(`Hermes directory does not exist: ${hermesDir}`)
      return
    }

    console.log(`Starting file watcher on: ${hermesDir}`)

    // Watch specific files
    for (const file of this.config.watchedFiles) {
      const filePath = resolve(hermesDir, file)
      if (existsSync(filePath)) {
        this.watchFile(filePath)
      }
    }

    // Watch directories
    for (const dir of this.config.watchedDirs) {
      const dirPath = resolve(hermesDir, dir)
      if (existsSync(dirPath)) {
        this.watchDirectory(dirPath)
      }
    }

    // Watch the main directory for new files
    this.watchDirectory(hermesDir, false)

    this.isRunning = true
    console.log(`File watcher started, watching ${this.watchers.size} paths`)
  }

  /**
   * Stop all watchers
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    // Clear all debounce timers
    Array.from(this.debounceTimers.values()).forEach(timer => {
      clearTimeout(timer)
    })
    this.debounceTimers.clear()

    // Close all watchers
    Array.from(this.watchers.entries()).forEach(([path, watcher]) => {
      try {
        watcher.close()
      } catch (error) {
        console.error(`Error closing watcher for ${path}:`, error)
      }
    })
    this.watchers.clear()

    this.isRunning = false
    console.log('File watcher stopped')
  }

  /**
   * Register a callback for file changes
   */
  onChange(callback: FileChangeCallback): void {
    this.changeCallbacks.push(callback)
  }

  /**
   * Remove a callback
   */
  offChange(callback: FileChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback)
    if (index > -1) {
      this.changeCallbacks.splice(index, 1)
    }
  }

  /**
   * Watch a specific file for changes
   */
  private watchFile(filePath: string): void {
    if (this.watchers.has(filePath)) {
      return
    }

    try {
      const watcher = watch(filePath, (eventType) => {
        this.handleFileChange(filePath, eventType)
      })

      watcher.on('error', (error) => {
        console.error(`Watcher error for ${filePath}:`, error.message)
      })

      this.watchers.set(filePath, watcher)
    } catch (error) {
      console.error(`Failed to watch file ${filePath}:`, error)
    }
  }

  /**
   * Watch a directory for changes
   */
  private watchDirectory(dirPath: string, recursive: boolean = true): void {
    if (this.watchers.has(dirPath)) {
      return
    }

    try {
      const watcher = watch(dirPath, { recursive }, (eventType, filename) => {
        if (filename) {
          const fullPath = resolve(dirPath, filename)
          this.handleFileChange(fullPath, eventType, filename)
        }
      })

      watcher.on('error', (error) => {
        console.error(`Watcher error for ${dirPath}:`, error.message)
      })

      this.watchers.set(dirPath, watcher)
    } catch (error) {
      console.error(`Failed to watch directory ${dirPath}:`, error)
    }
  }

  /**
   * Handle a file change event with debouncing
   */
  private handleFileChange(
    filePath: string,
    eventType: string,
    filename?: string
  ): void {
    const fileName = filename || basename(filePath)

    // Check if this is a file we care about
    const isWatchedFile = this.config.watchedFiles.includes(fileName)
    const isWatchedDir = this.config.watchedDirs.some(dir =>
      filePath.includes(resolve(this.config.hermesDir, dir))
    )

    if (!isWatchedFile && !isWatchedDir) {
      return
    }

    // Debounce rapid changes
    const timer = this.debounceTimers.get(filePath)
    if (timer) {
      clearTimeout(timer)
    }

    this.debounceTimers.set(
      filePath,
      setTimeout(() => {
        this.debounceTimers.delete(filePath)
        this.emitChange(filePath, eventType)
      }, this.config.debounceMs)
    )
  }

  /**
   * Emit a file change event to all callbacks
   */
  private emitChange(filePath: string, eventType: string): void {
    const event: FileChangeEvent = {
      type: eventType === 'rename' ? 'rename' : 'change',
      file: basename(filePath),
      path: filePath,
      timestamp: Date.now()
    }

    // Call registered callbacks
    for (const callback of this.changeCallbacks) {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in file change callback:', error)
      }
    }

    // Broadcast via WebSocket
    wsManager.broadcast({
      type: 'file-change',
      payload: {
        file: event.file,
        path: event.path,
        changeType: event.type,
        timestamp: event.timestamp
      }
    }).catch((error) => {
      console.error('Failed to broadcast file change:', error)
    })
  }

  /**
   * Check if the watcher is running
   */
  get running(): boolean {
    return this.isRunning
  }

  /**
   * Get the number of active watchers
   */
  get watchCount(): number {
    return this.watchers.size
  }
}

// Singleton instance
let fileWatcherInstance: FileWatcher | null = null

/**
 * Start the file watcher
 */
export async function startWatcher(hermesDir?: string): Promise<void> {
  if (fileWatcherInstance) {
    console.log('File watcher already initialized')
    return
  }

  const config: Partial<WatcherConfig> = {}
  if (hermesDir) {
    config.hermesDir = hermesDir
  }

  fileWatcherInstance = new FileWatcher(config)
  await fileWatcherInstance.start()
}

/**
 * Stop the file watcher
 */
export async function stopWatcher(): Promise<void> {
  if (!fileWatcherInstance) {
    return
  }

  await fileWatcherInstance.stop()
  fileWatcherInstance = null
}

/**
 * Get the file watcher instance
 */
export function getFileWatcher(): FileWatcher | null {
  return fileWatcherInstance
}

/**
 * Register a callback for file changes
 */
export function onFileChange(callback: FileChangeCallback): void {
  if (fileWatcherInstance) {
    fileWatcherInstance.onChange(callback)
  }
}

export { FileWatcher }