'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  actionUrl?: string
  actionText?: string
  read: boolean
  readAt?: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  createdAt: string
  updatedAt: string
}

export interface NotificationsData {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

export interface UseNotificationsOptions {
  socket?: Socket | null
  autoLoad?: boolean
  pollInterval?: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { socket, autoLoad = true, pollInterval = 30000 } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}) => {
      const { limit = 20, offset = 0, unreadOnly = false } = options

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          unreadOnly: unreadOnly.toString(),
        })

        const response = await fetch(`/api/notifications?${params}`, {
          signal: abortControllerRef.current.signal,
        })

        const data = await response.json()

        if (data.success) {
          const result: NotificationsData = data.data

          if (offset === 0) {
            setNotifications(result.notifications)
          } else {
            setNotifications((prev) => [...prev, ...result.notifications])
          }

          setTotal(result.total)
          setUnreadCount(result.unreadCount)
          setHasMore(result.hasMore)
        } else {
          throw new Error(data.message || 'Failed to fetch notifications')
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch notifications:', err)
          setError(err.message || 'Failed to fetch notifications')
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      const data = await response.json()

      if (data.success) {
        setUnreadCount(data.data.count)
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      })

      const data = await response.json()

      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
          )
        )

        setUnreadCount((prev) => Math.max(0, prev - 1))
      } else {
        throw new Error(data.message || 'Failed to mark as read')
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      throw err
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      })

      const data = await response.json()

      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        )

        setUnreadCount(0)
      } else {
        throw new Error(data.message || 'Failed to mark all as read')
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      throw err
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setNotifications((prev) => {
          const notification = prev.find((n) => n.id === notificationId)
          if (notification && !notification.read) {
            setUnreadCount((count) => Math.max(0, count - 1))
          }
          return prev.filter((n) => n.id !== notificationId)
        })

        setTotal((prev) => Math.max(0, prev - 1))
      } else {
        throw new Error(data.message || 'Failed to delete notification')
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
      throw err
    }
  }, [])

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setNotifications([])
        setUnreadCount(0)
        setTotal(0)
        setHasMore(false)
      } else {
        throw new Error(data.message || 'Failed to delete all notifications')
      }
    } catch (err) {
      console.error('Failed to delete all notifications:', err)
      throw err
    }
  }, [])

  // Load more notifications (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications({ offset: notifications.length })
    }
  }, [loading, hasMore, notifications.length, fetchNotifications])

  // Refresh notifications
  const refresh = useCallback(() => {
    fetchNotifications({ offset: 0 })
  }, [fetchNotifications])

  // Handle real-time notifications via socket
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev])
      setTotal((prev) => prev + 1)
      setUnreadCount((prev) => prev + 1)

      // Play notification sound if high priority
      if (notification.priority === 'HIGH' || notification.priority === 'URGENT') {
        playNotificationSound()
      }

      // Show browser notification if permission granted
      showBrowserNotification(notification)
    }

    socket.on('notification', handleNewNotification)

    return () => {
      socket.off('notification', handleNewNotification)
    }
  }, [socket])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      fetchNotifications()
    }
  }, [autoLoad, fetchNotifications])

  // Poll for updates
  useEffect(() => {
    if (pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        fetchUnreadCount()
      }, pollInterval)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    }
  }, [pollInterval, fetchUnreadCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  return {
    notifications,
    unreadCount,
    total,
    hasMore,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    loadMore,
    refresh,
  }
}

// Helper function to play notification sound
function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    audio.play().catch((err) => console.error('Failed to play notification sound:', err))
  } catch (err) {
    console.error('Failed to create audio:', err)
  }
}

// Helper function to show browser notification
function showBrowserNotification(notification: Notification) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'URGENT',
      })
    } catch (err) {
      console.error('Failed to show browser notification:', err)
    }
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('Notification permission:', permission)
    })
  }
}
