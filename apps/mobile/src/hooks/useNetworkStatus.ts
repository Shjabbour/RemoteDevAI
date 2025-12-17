import { useState, useEffect, useCallback } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { offlineQueue, QueuedAction } from '../services/offlineQueue'

export interface NetworkStatus {
  isConnected: boolean
  isInternetReachable: boolean | null
  type: string | null
  pendingCount: number
  isSyncing: boolean
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
}

/**
 * Hook to track network status and manage offline queue
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: null,
    type: null,
    pendingCount: 0,
    isSyncing: false,
    connectionQuality: 'offline',
  })

  // Update pending count
  const updatePendingCount = useCallback(() => {
    const count = offlineQueue.getCount()
    setStatus((prev) => ({ ...prev, pendingCount: count }))
  }, [])

  // Determine connection quality based on network info
  const getConnectionQuality = useCallback(
    (state: NetInfoState): NetworkStatus['connectionQuality'] => {
      if (!state.isConnected || state.isInternetReachable === false) {
        return 'offline'
      }

      const type = state.type
      const details = state.details as any

      // WiFi
      if (type === 'wifi') {
        if (details?.strength !== undefined) {
          if (details.strength >= 70) return 'excellent'
          if (details.strength >= 40) return 'good'
          return 'poor'
        }
        return 'good' // Assume good if no strength info
      }

      // Cellular
      if (type === 'cellular') {
        const cellularGeneration = details?.cellularGeneration
        if (cellularGeneration === '5g') return 'excellent'
        if (cellularGeneration === '4g') return 'good'
        return 'poor'
      }

      // Other types
      if (state.isInternetReachable === true) {
        return 'good'
      }

      return 'poor'
    },
    []
  )

  // Handle network state change
  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const quality = getConnectionQuality(state)

      setStatus((prev) => ({
        ...prev,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        connectionQuality: quality,
      }))

      console.log('Network status changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        quality,
      })
    },
    [getConnectionQuality]
  )

  // Queue an action
  const queueAction = useCallback(
    async (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries' | 'status'>) => {
      try {
        const id = await offlineQueue.enqueue(action)
        updatePendingCount()
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
    async (onSync: (action: QueuedAction) => Promise<void>) => {
      if (!status.isConnected || status.isSyncing) return

      try {
        setStatus((prev) => ({ ...prev, isSyncing: true }))
        await offlineQueue.sync(onSync)
        updatePendingCount()
      } catch (error) {
        console.error('Sync failed:', error)
      } finally {
        setStatus((prev) => ({ ...prev, isSyncing: false }))
      }
    },
    [status.isConnected, status.isSyncing, updatePendingCount]
  )

  // Retry sync manually
  const retrySync = useCallback(
    async (onSync: (action: QueuedAction) => Promise<void>) => {
      if (status.isConnected) {
        await syncPendingActions(onSync)
      }
    },
    [status.isConnected, syncPendingActions]
  )

  // Clear queue
  const clearQueue = useCallback(async () => {
    try {
      await offlineQueue.clear()
      updatePendingCount()
    } catch (error) {
      console.error('Failed to clear queue:', error)
    }
  }, [updatePendingCount])

  // Clear failed actions
  const clearFailed = useCallback(async () => {
    try {
      await offlineQueue.clearFailed()
      updatePendingCount()
    } catch (error) {
      console.error('Failed to clear failed actions:', error)
    }
  }, [updatePendingCount])

  // Set up NetInfo listener
  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribeNetInfo = NetInfo.addEventListener(handleNetworkChange)

    // Get initial state
    NetInfo.fetch().then(handleNetworkChange)

    // Subscribe to queue changes
    const unsubscribeQueue = offlineQueue.subscribe((queue) => {
      const pendingCount = queue.filter((a) => a.status === 'pending').length
      setStatus((prev) => ({ ...prev, pendingCount }))
    })

    // Initial pending count
    updatePendingCount()

    return () => {
      unsubscribeNetInfo()
      unsubscribeQueue()
    }
  }, [handleNetworkChange, updatePendingCount])

  return {
    ...status,
    queueAction,
    syncPendingActions,
    retrySync,
    clearQueue,
    clearFailed,
    updatePendingCount,
  }
}
