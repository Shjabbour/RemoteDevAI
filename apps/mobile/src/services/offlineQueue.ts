import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = '@remotedevai:offline_queue'
const MAX_RETRIES = 3
const RETRY_DELAY = 2000

export interface QueuedAction {
  id: string
  type: 'message' | 'command' | 'session:start' | 'session:end'
  payload: any
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'failed'
  error?: string
}

class OfflineQueue {
  private queue: QueuedAction[] = []
  private isSyncing = false
  private listeners: ((queue: QueuedAction[]) => void)[] = []

  /**
   * Initialize the queue from AsyncStorage
   */
  async init(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
        console.log(`Offline queue loaded: ${this.queue.length} items`)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  /**
   * Add an action to the queue
   */
  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    }

    this.queue.push(queuedAction)
    await this.save()

    console.log(`Action queued: ${queuedAction.type} (${queuedAction.id})`)
    return queuedAction.id
  }

  /**
   * Get all pending actions
   */
  getPending(): QueuedAction[] {
    return this.queue.filter((action) => action.status === 'pending')
  }

  /**
   * Get all actions
   */
  getAll(): QueuedAction[] {
    return [...this.queue]
  }

  /**
   * Get queue count
   */
  getCount(): number {
    return this.queue.filter((action) => action.status === 'pending').length
  }

  /**
   * Remove an action from the queue
   */
  async remove(id: string): Promise<void> {
    const index = this.queue.findIndex((action) => action.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      await this.save()
      console.log(`Action removed from queue: ${id}`)
    }
  }

  /**
   * Update action status
   */
  async updateStatus(id: string, status: QueuedAction['status'], error?: string): Promise<void> {
    const action = this.queue.find((a) => a.id === id)
    if (action) {
      action.status = status
      if (error) action.error = error
      if (status === 'syncing') action.retries += 1
      await this.save()
    }
  }

  /**
   * Sync all pending actions
   */
  async sync(onSync: (action: QueuedAction) => Promise<void>): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress')
      return
    }

    const pending = this.getPending()
    if (pending.length === 0) {
      console.log('No pending actions to sync')
      return
    }

    this.isSyncing = true
    console.log(`Starting sync: ${pending.length} actions`)

    for (const action of pending) {
      try {
        await this.updateStatus(action.id, 'syncing')

        // Execute the sync callback
        await onSync(action)

        // Remove from queue on success
        await this.remove(action.id)
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error)

        // Mark as failed if max retries reached
        if (action.retries >= MAX_RETRIES) {
          await this.updateStatus(
            action.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          )
        } else {
          // Reset to pending for retry
          await this.updateStatus(action.id, 'pending')

          // Wait before next retry
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
        }
      }
    }

    this.isSyncing = false
    console.log('Sync completed')
  }

  /**
   * Clear all actions
   */
  async clear(): Promise<void> {
    this.queue = []
    await AsyncStorage.removeItem(QUEUE_KEY)
    this.notifyListeners()
    console.log('Offline queue cleared')
  }

  /**
   * Clear failed actions
   */
  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter((action) => action.status !== 'failed')
    await this.save()
    console.log('Failed actions cleared')
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedAction[]) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.queue]))
  }

  /**
   * Check if syncing
   */
  isSyncingNow(): boolean {
    return this.isSyncing
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue()

// Initialize on import
offlineQueue.init().catch(console.error)
