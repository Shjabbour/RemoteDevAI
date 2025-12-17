import { EventEmitter } from 'events'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

interface QueuedCommand {
  id: string
  type: 'command' | 'response' | 'status'
  payload: any
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'failed'
  error?: string
}

interface CachedResponse {
  commandId: string
  response: any
  timestamp: number
}

/**
 * Offline service for desktop app
 * Manages command queue and response caching when offline
 */
export class OfflineService extends EventEmitter {
  private queue: QueuedCommand[] = []
  private cache: Map<string, CachedResponse> = new Map()
  private isSyncing = false
  private queuePath: string
  private cachePath: string

  constructor() {
    super()
    const userDataPath = app.getPath('userData')
    this.queuePath = path.join(userDataPath, 'offline-queue.json')
    this.cachePath = path.join(userDataPath, 'response-cache.json')
  }

  /**
   * Initialize the service
   */
  async init(): Promise<void> {
    try {
      // Load queue
      await this.loadQueue()

      // Load cache
      await this.loadCache()

      console.log(`OfflineService initialized: ${this.queue.length} queued, ${this.cache.size} cached`)
    } catch (error) {
      console.error('Failed to initialize OfflineService:', error)
    }
  }

  /**
   * Load queue from disk
   */
  private async loadQueue(): Promise<void> {
    try {
      const data = await fs.readFile(this.queuePath, 'utf-8')
      this.queue = JSON.parse(data)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load queue:', error)
      }
    }
  }

  /**
   * Save queue to disk
   */
  private async saveQueue(): Promise<void> {
    try {
      await fs.writeFile(this.queuePath, JSON.stringify(this.queue, null, 2))
      this.emit('queue-updated', this.queue)
    } catch (error) {
      console.error('Failed to save queue:', error)
    }
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8')
      const cacheArray: CachedResponse[] = JSON.parse(data)
      this.cache = new Map(cacheArray.map((item) => [item.commandId, item]))
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load cache:', error)
      }
    }
  }

  /**
   * Save cache to disk
   */
  private async saveCache(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.values())
      await fs.writeFile(this.cachePath, JSON.stringify(cacheArray, null, 2))
    } catch (error) {
      console.error('Failed to save cache:', error)
    }
  }

  /**
   * Queue a command for later sync
   */
  async queueCommand(
    type: QueuedCommand['type'],
    payload: any
  ): Promise<string> {
    const command: QueuedCommand = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    }

    this.queue.push(command)
    await this.saveQueue()

    console.log(`Command queued: ${command.type} (${command.id})`)
    return command.id
  }

  /**
   * Get pending commands
   */
  getPendingCommands(): QueuedCommand[] {
    return this.queue.filter((cmd) => cmd.status === 'pending')
  }

  /**
   * Get queue count
   */
  getQueueCount(): number {
    return this.queue.filter((cmd) => cmd.status === 'pending').length
  }

  /**
   * Remove command from queue
   */
  async removeCommand(id: string): Promise<void> {
    const index = this.queue.findIndex((cmd) => cmd.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      await this.saveQueue()
      console.log(`Command removed from queue: ${id}`)
    }
  }

  /**
   * Update command status
   */
  async updateCommandStatus(
    id: string,
    status: QueuedCommand['status'],
    error?: string
  ): Promise<void> {
    const command = this.queue.find((cmd) => cmd.id === id)
    if (command) {
      command.status = status
      if (error) command.error = error
      if (status === 'syncing') command.retries += 1
      await this.saveQueue()
    }
  }

  /**
   * Sync pending commands
   */
  async syncPendingCommands(
    onSync: (command: QueuedCommand) => Promise<void>
  ): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return
    }

    const pending = this.getPendingCommands()
    if (pending.length === 0) {
      console.log('No pending commands to sync')
      return
    }

    this.isSyncing = true
    this.emit('sync-started', pending.length)
    console.log(`Starting command sync: ${pending.length} commands`)

    for (const command of pending) {
      try {
        await this.updateCommandStatus(command.id, 'syncing')

        // Execute sync callback
        await onSync(command)

        // Remove from queue on success
        await this.removeCommand(command.id)
      } catch (error) {
        console.error(`Failed to sync command ${command.id}:`, error)

        // Mark as failed if max retries reached
        if (command.retries >= 3) {
          await this.updateCommandStatus(
            command.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          )
        } else {
          // Reset to pending for retry
          await this.updateCommandStatus(command.id, 'pending')
        }
      }
    }

    this.isSyncing = false
    this.emit('sync-completed')
    console.log('Command sync completed')
  }

  /**
   * Cache a response
   */
  async cacheResponse(commandId: string, response: any): Promise<void> {
    this.cache.set(commandId, {
      commandId,
      response,
      timestamp: Date.now(),
    })

    await this.saveCache()
    console.log(`Response cached: ${commandId}`)
  }

  /**
   * Get cached response
   */
  getCachedResponse(commandId: string): any | null {
    const cached = this.cache.get(commandId)
    if (!cached) return null

    // Cache expires after 1 hour
    if (Date.now() - cached.timestamp > 3600000) {
      this.cache.delete(commandId)
      this.saveCache()
      return null
    }

    return cached.response
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear()
    await this.saveCache()
    console.log('Response cache cleared')
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    this.queue = []
    await this.saveQueue()
    console.log('Command queue cleared')
  }

  /**
   * Clear failed commands
   */
  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter((cmd) => cmd.status !== 'failed')
    await this.saveQueue()
    console.log('Failed commands cleared')
  }

  /**
   * Check if syncing
   */
  isSyncingNow(): boolean {
    return this.isSyncing
  }

  /**
   * Get all queued commands
   */
  getAllCommands(): QueuedCommand[] {
    return [...this.queue]
  }
}

// Singleton instance
let instance: OfflineService | null = null

export function getOfflineService(): OfflineService {
  if (!instance) {
    instance = new OfflineService()
  }
  return instance
}
