'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket, subscribeToSocketState, getSocketState } from '../lib/socket'

export interface SocketStatus {
  isConnected: boolean
  isConnecting: boolean
  reconnectAttempts: number
  lastConnectedAt: Date | null
  error: Error | null
}

/**
 * Hook to manage socket connection with auto-reconnect and status tracking
 */
export function useSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [status, setStatus] = useState<SocketStatus>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    error: null,
  })

  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize socket
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        disconnectSocket()
        socketRef.current = null
        setSocket(null)
      }
      return
    }

    try {
      setStatus((prev) => ({ ...prev, isConnecting: true, error: null }))

      const socketInstance = getSocket(token)
      socketRef.current = socketInstance
      setSocket(socketInstance)

      setStatus((prev) => ({ ...prev, isConnecting: false }))
    } catch (error) {
      console.error('Failed to initialize socket:', error)
      setStatus((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Failed to initialize socket'),
      }))
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [token])

  // Subscribe to socket state changes
  useEffect(() => {
    const unsubscribe = subscribeToSocketState((state) => {
      setStatus((prev) => ({
        ...prev,
        isConnected: state.isConnected,
        reconnectAttempts: state.reconnectAttempts,
        lastConnectedAt: state.lastConnectedAt,
      }))
    })

    // Initialize with current state
    const currentState = getSocketState()
    setStatus((prev) => ({
      ...prev,
      isConnected: currentState.isConnected,
      reconnectAttempts: currentState.reconnectAttempts,
      lastConnectedAt: currentState.lastConnectedAt,
    }))

    return unsubscribe
  }, [])

  // Auto-reconnect on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (!status.isConnected && socketRef.current && token) {
        console.log('Window focused - attempting to reconnect')
        socketRef.current.connect()
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !status.isConnected && socketRef.current && token) {
        console.log('Page visible - attempting to reconnect')
        socketRef.current.connect()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status.isConnected, token])

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current && token) {
      console.log('Manual reconnect triggered')
      socketRef.current.connect()
    }
  }, [token])

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Manual disconnect triggered')
      disconnectSocket()
      socketRef.current = null
      setSocket(null)
    }
  }, [])

  return {
    socket,
    status,
    reconnect,
    disconnect,
  }
}
