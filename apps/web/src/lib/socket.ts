'use client'

import { io, Socket } from 'socket.io-client'
import { offlineStore } from './offlineStore'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

// Reconnection configuration
const RECONNECTION_CONFIG = {
  enabled: true,
  initialDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  backoffMultiplier: 1.5,
}

interface SocketState {
  isConnected: boolean
  reconnectAttempts: number
  lastConnectedAt: Date | null
  lastDisconnectedAt: Date | null
}

let socket: Socket | null = null
let socketState: SocketState = {
  isConnected: false,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
}

// Callbacks for state changes
const stateChangeCallbacks: ((state: SocketState) => void)[] = []

export function subscribeToSocketState(callback: (state: SocketState) => void): () => void {
  stateChangeCallbacks.push(callback)
  // Return unsubscribe function
  return () => {
    const index = stateChangeCallbacks.indexOf(callback)
    if (index > -1) {
      stateChangeCallbacks.splice(index, 1)
    }
  }
}

export function getSocketState(): SocketState {
  return { ...socketState }
}

function notifyStateChange() {
  stateChangeCallbacks.forEach((callback) => callback({ ...socketState }))
}

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: RECONNECTION_CONFIG.enabled,
      reconnectionDelay: RECONNECTION_CONFIG.initialDelay,
      reconnectionDelayMax: RECONNECTION_CONFIG.maxDelay,
      reconnectionAttempts: RECONNECTION_CONFIG.maxAttempts,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    })

    // Connection event
    socket.on('connect', async () => {
      console.log('Socket connected:', socket?.id)
      socketState.isConnected = true
      socketState.reconnectAttempts = 0
      socketState.lastConnectedAt = new Date()
      notifyStateChange()

      // Request missed messages if reconnecting
      if (socketState.lastDisconnectedAt) {
        socket?.emit('request:missed-messages', {
          since: socketState.lastDisconnectedAt.toISOString(),
        })
      }
    })

    // Reconnection attempt event
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}/${RECONNECTION_CONFIG.maxAttempts}`)
      socketState.reconnectAttempts = attemptNumber
      notifyStateChange()
    })

    // Reconnection error
    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error)
    })

    // Reconnection failed
    socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after maximum attempts')
      socketState.reconnectAttempts = RECONNECTION_CONFIG.maxAttempts
      notifyStateChange()
    })

    // Successful reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`)
      socketState.reconnectAttempts = 0
      notifyStateChange()
    })

    // Disconnect event
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      socketState.isConnected = false
      socketState.lastDisconnectedAt = new Date()
      notifyStateChange()

      // Auto-reconnect on client-side disconnect
      if (reason === 'io client disconnect') {
        socket?.connect()
      }
    })

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // General error
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    // Heartbeat/ping mechanism
    let heartbeatInterval: NodeJS.Timeout | null = null
    socket.on('connect', () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }

      // Send ping every 30 seconds
      heartbeatInterval = setInterval(() => {
        if (socket?.connected) {
          socket.emit('ping', { timestamp: Date.now() })
        }
      }, 30000)
    })

    socket.on('disconnect', () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
    })

    // Handle pong response
    socket.on('pong', (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp
      console.log(`Heartbeat latency: ${latency}ms`)
    })
  }

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    socketState.isConnected = false
    socketState.lastDisconnectedAt = new Date()
    notifyStateChange()
  }
}

// Event types
export interface SessionEvent {
  sessionId: string
  projectId: string
  timestamp: string
}

export interface MessageEvent {
  sessionId: string
  message: string
  sender: 'user' | 'ai'
  timestamp: string
}

export interface StreamEvent {
  sessionId: string
  streamUrl: string
  quality: string
}

// Event handlers
export function subscribeToSession(
  socket: Socket,
  sessionId: string,
  callbacks: {
    onMessage?: (event: MessageEvent) => void
    onStreamUpdate?: (event: StreamEvent) => void
    onSessionEnd?: (event: SessionEvent) => void
  }
): void {
  socket.emit('join-session', { sessionId })

  if (callbacks.onMessage) {
    socket.on('message', callbacks.onMessage)
  }

  if (callbacks.onStreamUpdate) {
    socket.on('stream-update', callbacks.onStreamUpdate)
  }

  if (callbacks.onSessionEnd) {
    socket.on('session-end', callbacks.onSessionEnd)
  }
}

export function unsubscribeFromSession(
  socket: Socket,
  sessionId: string
): void {
  socket.emit('leave-session', { sessionId })
  socket.off('message')
  socket.off('stream-update')
  socket.off('session-end')
}

export function sendMessage(
  socket: Socket,
  sessionId: string,
  message: string
): void {
  socket.emit('send-message', {
    sessionId,
    message,
    timestamp: new Date().toISOString(),
  })
}
