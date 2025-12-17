'use client'

import { WifiOff, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'

export interface OfflineBannerProps {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  onRetry?: () => void
  onDismiss?: () => void
}

/**
 * Banner component to show offline status and pending actions
 */
export function OfflineBanner({
  isOnline,
  pendingCount,
  isSyncing,
  onRetry,
  onDismiss,
}: OfflineBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show if online and no pending actions
  if (isOnline && pendingCount === 0) return null

  // Don't show if dismissed
  if (isDismissed) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleRetry = () => {
    onRetry?.()
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOnline
          ? 'bg-blue-500'
          : 'bg-orange-500'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            {!isOnline && (
              <WifiOff className="h-5 w-5 text-white" />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <p className="text-sm font-medium text-white">
                {!isOnline ? (
                  'You are offline'
                ) : isSyncing ? (
                  'Syncing changes...'
                ) : (
                  'Back online'
                )}
              </p>

              {pendingCount > 0 && (
                <p className="text-xs text-white/90">
                  {pendingCount} {pendingCount === 1 ? 'action' : 'actions'} pending
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOnline && pendingCount > 0 && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isSyncing}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Retry'}</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-white/20 text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
