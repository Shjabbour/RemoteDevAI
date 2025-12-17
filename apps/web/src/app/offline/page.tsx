'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * Offline fallback page
 * Shown when user is offline and no cached content is available
 */
export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-redirect when back online
  useEffect(() => {
    if (isOnline) {
      window.location.href = '/'
    }
  }, [isOnline])

  const handleRetry = async () => {
    setRetrying(true)

    try {
      // Try to fetch the homepage
      const response = await fetch('/', { method: 'HEAD' })

      if (response.ok) {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="w-10 h-10 text-orange-600 dark:text-orange-400" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            You're Offline
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            It looks like you've lost your internet connection. Check your network settings and try
            again.
          </p>

          {/* Status */}
          <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isOnline ? 'Connection restored!' : 'No internet connection'}
              </span>
            </div>
          </div>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Retrying...' : 'Try Again'}</span>
          </button>

          {/* Tips */}
          <div className="mt-8 text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Troubleshooting tips:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Check if your WiFi or mobile data is turned on</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Try turning airplane mode off and on</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Restart your router if using WiFi</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Check if other websites are working</span>
              </li>
            </ul>
          </div>

          {/* Cached Content Info */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Some previously visited pages may be available offline. Your
              actions will be saved and synced when you're back online.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
