'use client'

/**
 * IndexedDB Offline Store for RemoteDevAI
 * Handles offline data persistence and sync queue
 */

const DB_NAME = 'remotedevai_offline'
const DB_VERSION = 1
const STORES = {
  ACTIONS: 'pending_actions',
  CACHE: 'data_cache',
  MESSAGES: 'messages',
  SESSIONS: 'sessions',
}

export interface PendingAction {
  id: string
  type: 'session:message' | 'project:create' | 'project:update' | 'session:start' | 'session:end'
  payload: any
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'failed'
  error?: string
}

export interface CacheEntry {
  key: string
  data: any
  timestamp: number
  expiresAt?: number
}

class OfflineStore {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.ACTIONS)) {
          const actionsStore = db.createObjectStore(STORES.ACTIONS, { keyPath: 'id' })
          actionsStore.createIndex('status', 'status', { unique: false })
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' })
          messagesStore.createIndex('sessionId', 'sessionId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionsStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' })
        }
      }
    })

    return this.initPromise
  }

  /**
   * Queue an action for later sync
   */
  async queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const actionWithMeta: PendingAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.ACTIONS)
      const request = store.add(actionWithMeta)

      request.onsuccess = () => {
        console.log('Action queued:', actionWithMeta.type)
        resolve(actionWithMeta.id)
      }

      request.onerror = () => {
        reject(new Error('Failed to queue action'))
      }
    })
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<PendingAction[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ACTIONS], 'readonly')
      const store = transaction.objectStore(STORES.ACTIONS)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error('Failed to get pending actions'))
      }
    })
  }

  /**
   * Update action status
   */
  async updateActionStatus(
    id: string,
    status: PendingAction['status'],
    error?: string
  ): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.ACTIONS)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const action = getRequest.result
        if (!action) {
          reject(new Error('Action not found'))
          return
        }

        action.status = status
        if (error) action.error = error
        if (status === 'syncing') action.retries += 1

        const updateRequest = store.put(action)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(new Error('Failed to update action'))
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get action'))
      }
    })
  }

  /**
   * Remove an action from the queue
   */
  async removeAction(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ACTIONS], 'readwrite')
      const store = transaction.objectStore(STORES.ACTIONS)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('Action removed:', id)
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to remove action'))
      }
    })
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.CACHE)
      const request = store.put(entry)

      request.onsuccess = () => {
        console.log('Data cached:', key)
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to cache data'))
      }
    })
  }

  /**
   * Get cached data
   */
  async getCachedData<T = any>(key: string): Promise<T | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CACHE], 'readonly')
      const store = transaction.objectStore(STORES.CACHE)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result
        if (!entry) {
          resolve(null)
          return
        }

        // Check if expired
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.removeCachedData(key)
          resolve(null)
          return
        }

        resolve(entry.data)
      }

      request.onerror = () => {
        reject(new Error('Failed to get cached data'))
      }
    })
  }

  /**
   * Remove cached data
   */
  async removeCachedData(key: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CACHE], 'readwrite')
      const store = transaction.objectStore(STORES.CACHE)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to remove cached data'))
    })
  }

  /**
   * Store message offline
   */
  async storeMessage(message: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES], 'readwrite')
      const store = transaction.objectStore(STORES.MESSAGES)
      const request = store.put(message)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to store message'))
    })
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<any[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES], 'readonly')
      const store = transaction.objectStore(STORES.MESSAGES)
      const index = store.index('sessionId')
      const request = index.getAll(sessionId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(new Error('Failed to get messages'))
    })
  }

  /**
   * Clear all offline data
   */
  async clear(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const stores = [STORES.ACTIONS, STORES.CACHE, STORES.MESSAGES, STORES.SESSIONS]

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite')

      stores.forEach((storeName) => {
        transaction.objectStore(storeName).clear()
      })

      transaction.oncomplete = () => {
        console.log('Offline store cleared')
        resolve()
      }

      transaction.onerror = () => {
        reject(new Error('Failed to clear offline store'))
      }
    })
  }

  /**
   * Get action queue count
   */
  async getQueueCount(): Promise<number> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ACTIONS], 'readonly')
      const store = transaction.objectStore(STORES.ACTIONS)
      const index = store.index('status')
      const request = index.count('pending')

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Failed to get queue count'))
    })
  }
}

// Singleton instance
export const offlineStore = new OfflineStore()

// Initialize on import
if (typeof window !== 'undefined') {
  offlineStore.init().catch(console.error)
}
