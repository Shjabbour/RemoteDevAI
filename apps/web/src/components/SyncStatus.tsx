'use client'

import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'

interface SyncStatusProps {
  className?: string
  showDetails?: boolean
}

/**
 * Component to show sync status and pending changes
 */
export function SyncStatus({ className = '', showDetails = false }: SyncStatusProps) {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    wasOffline,
    syncPendingActions,
    retrySync,
  } = useOnlineStatus()

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  // Update last sync time when sync completes
  useEffect(() => {
    if (!isSyncing && wasOffline && pendingCount === 0) {
      setLastSyncTime(new Date())
    }
  }, [isSyncing, wasOffline, pendingCount])

  // Determine status
  const getStatus = () => {
    if (!isOnline) return 'offline'
    if (isSyncing) return 'syncing'
    if (pendingCount > 0) return 'pending'
    if (lastSyncTime) return 'synced'
    return 'online'
  }

  const status = getStatus()

  // Get status icon
  const getIcon = () => {
    switch (status) {
      case 'offline':
        return <CloudOff className="w-4 h-4" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'pending':
        return <AlertCircle className="w-4 h-4" />
      case 'synced':
        return <Check className="w-4 h-4" />
      case 'online':
      default:
        return <Cloud className="w-4 h-4" />
    }
  }

  // Get status color
  const getColor = () => {
    switch (status) {
      case 'offline':
        return 'text-red-600 dark:text-red-400'
      case 'syncing':
        return 'text-blue-600 dark:text-blue-400'
      case 'pending':
        return 'text-orange-600 dark:text-orange-400'
      case 'synced':
        return 'text-green-600 dark:text-green-400'
      case 'online':
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'offline':
        return 'Offline'
      case 'syncing':
        return 'Syncing...'
      case 'pending':
        return `${pendingCount} pending`
      case 'synced':
        return 'All synced'
      case 'online':
      default:
        return 'Online'
    }
  }

  const handleRetry = async () => {
    await retrySync(async (action) => {
      // This will be handled by the parent component
      console.log('Syncing action:', action)
    })
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={pendingCount > 0 && isOnline ? handleRetry : undefined}
        disabled={isSyncing || !isOnline}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${getColor()} ${
          pendingCount > 0 && isOnline
            ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
            : 'cursor-default'
        }`}
      >
        {getIcon()}
        {showDetails && (
          <span className="text-sm font-medium">{getStatusText()}</span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Sync Status</span>
              <span className={`text-xs ${getColor()}`}>{getStatusText()}</span>
            </div>

            {!isOnline && (
              <p className="text-gray-300">
                You are currently offline. Changes will sync when connection is restored.
              </p>
            )}

            {pendingCount > 0 && (
              <p className="text-gray-300">
                {pendingCount} {pendingCount === 1 ? 'action' : 'actions'} queued for sync
              </p>
            )}

            {lastSyncTime && (
              <p className="text-gray-400 text-xs">
                Last synced {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
              </p>
            )}

            {pendingCount > 0 && isOnline && !isSyncing && (
              <button
                onClick={handleRetry}
                className="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              >
                Sync Now
              </button>
            )}
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  )
}
