'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineStore, PendingAction } from '../lib/offlineStore'

export interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
  pendingCount: number
  isSyncing: boolean
}

/**
 * Hook to track online/offline status and manage offline actions
 */
export function useOnlineStatus() {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    pendingCount: 0,
    isSyncing: false,
  })

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await offlineStore.getQueueCount()
      setStatus((prev) => ({ ...prev, pendingCount: count }))
    } catch (error) {
      console.error('Failed to get pending count:', error)
    }
  }, [])

  // Handle coming back online
  const handleOnline = useCallback(async () => {
    console.log('Network: Back online')
    setStatus((prev) => ({
      ...prev,
      isOnline: true,
      wasOffline: !prev.isOnline,
    }))

    // Update pending count
    await updatePendingCount()
  }, [updatePendingCount])

  // Handle going offline
  const handleOffline = useCallback(() => {
    console.log('Network: Going offline')
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
    }))
  }, [])

  // Queue action when offline
  const queueAction = useCallback(
    async (action: Omit<PendingAction, 'id' | 'timestamp' | 'retries' | 'status'>) => {
      try {
        const id = await offlineStore.queueAction(action)
        await updatePendingCount()
        return id
      } catch (error) {
        console.error('Failed to queue action:', error)
        throw error
      }
    },
    [updatePendingCount]
  )

  // Sync pending actions
  const syncPendingActions = useCallback(
    async (onSync: (action: PendingAction) => Promise<void>) => {
      if (!status.isOnline || status.isSyncing) return

      try {
        setStatus((prev) => ({ ...prev, isSyncing: true }))

        const pendingActions = await offlineStore.getPendingActions()
        console.log(`Syncing ${pendingActions.length} pending actions`)

        for (const action of pendingActions) {
          try {
            // Update status to syncing
            await offlineStore.updateActionStatus(action.id, 'syncing')

            // Execute the sync callback
            await onSync(action)

            // Remove from queue on success
            await offlineStore.removeAction(action.id)
          } catch (error) {
            console.error('Failed to sync action:', action.id, error)

            // Mark as failed if max retries reached
            if (action.retries >= 3) {
              await offlineStore.updateActionStatus(
                action.id,
                'failed',
                error instanceof Error ? error.message : 'Unknown error'
              )
            } else {
              // Reset to pending for retry
              await offlineStore.updateActionStatus(action.id, 'pending')
            }
          }
        }

        // Update pending count
        await updatePendingCount()
      } catch (error) {
        console.error('Sync failed:', error)
      } finally {
        setStatus((prev) => ({ ...prev, isSyncing: false, wasOffline: false }))
      }
    },
    [status.isOnline, status.isSyncing, updatePendingCount]
  )

  // Retry sync manually
  const retrySync = useCallback(
    async (onSync: (action: PendingAction) => Promise<void>) => {
      if (status.isOnline) {
        await syncPendingActions(onSync)
      }
    },
    [status.isOnline, syncPendingActions]
  )

  // Clear all pending actions
  const clearPending = useCallback(async () => {
    try {
      await offlineStore.clear()
      await updatePendingCount()
    } catch (error) {
      console.error('Failed to clear pending actions:', error)
    }
  }, [updatePendingCount])

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initialize pending count
    updatePendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline, updatePendingCount])

  return {
    ...status,
    queueAction,
    syncPendingActions,
    retrySync,
    clearPending,
    updatePendingCount,
  }
}
