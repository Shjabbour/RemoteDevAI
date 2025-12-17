# Offline Support and Reconnection Logic Implementation

This document outlines the comprehensive offline support and reconnection logic added to RemoteDevAI.

## Overview

The implementation provides:
- **Offline data persistence** using IndexedDB (web) and AsyncStorage (mobile)
- **Automatic reconnection** with exponential backoff
- **Action queuing** when offline with automatic sync on reconnect
- **Session restoration** to recover state after disconnection
- **Heartbeat mechanism** to detect connection issues
- **Retry logic** for API requests with configurable attempts
- **Service Worker** for offline page caching
- **Visual indicators** for connection status

---

## Files Created/Modified

### Web App (apps/web/src)

#### 1. **apps/web/src/lib/offlineStore.ts**
IndexedDB-based offline storage system.

**Features:**
- Stores pending actions for later sync
- Caches API responses for offline access
- Stores messages and sessions offline
- Automatic expiration of cached data
- Queue management with retry logic

**Usage:**
```typescript
import { offlineStore } from '@/lib/offlineStore'

// Queue an action
await offlineStore.queueAction({
  type: 'session:message',
  payload: { message: 'Hello' }
})

// Cache data
await offlineStore.cacheData('user:profile', userData, 60000)

// Get cached data
const data = await offlineStore.getCachedData('user:profile')
```

#### 2. **apps/web/src/hooks/useOnlineStatus.ts**
React hook for tracking online/offline status.

**Features:**
- Monitors navigator.onLine
- Tracks pending action count
- Provides queue and sync functions
- Auto-syncs when coming back online

**Usage:**
```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function Component() {
  const { isOnline, pendingCount, queueAction, syncPendingActions } = useOnlineStatus()

  // Queue action when offline
  if (!isOnline) {
    await queueAction({
      type: 'session:message',
      payload: data
    })
  }
}
```

#### 3. **apps/web/src/components/OfflineBanner.tsx**
Visual banner showing offline status.

**Features:**
- Shows when offline or with pending actions
- Displays pending action count
- Retry button for manual sync
- Dismissible
- Auto-hides when back online with no pending actions

**Usage:**
```typescript
import { OfflineBanner } from '@/components/OfflineBanner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function Layout() {
  const { isOnline, pendingCount, isSyncing, retrySync } = useOnlineStatus()

  return (
    <>
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onRetry={() => retrySync(handleSync)}
      />
      {/* Your content */}
    </>
  )
}
```

#### 4. **apps/web/src/lib/socket.ts** (Enhanced)
Enhanced Socket.IO client with advanced reconnection.

**Features:**
- Exponential backoff (1s to 30s)
- Max 10 reconnection attempts
- Heartbeat/ping mechanism (30s interval)
- State change notifications
- Missed message recovery
- Auto-reconnect on client disconnect

**Configuration:**
```typescript
const RECONNECTION_CONFIG = {
  enabled: true,
  initialDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  backoffMultiplier: 1.5,
}
```

#### 5. **apps/web/src/hooks/useSocket.ts**
React hook for socket connection management.

**Features:**
- Socket lifecycle management
- Connection status tracking
- Auto-reconnect on window focus
- Manual reconnect/disconnect
- Reconnection attempt tracking

**Usage:**
```typescript
import { useSocket } from '@/hooks/useSocket'

function Component() {
  const { socket, status, reconnect, disconnect } = useSocket(token)

  // status.isConnected
  // status.reconnectAttempts
  // status.lastConnectedAt
}
```

#### 6. **apps/web/src/lib/api-enhanced.ts**
Enhanced API client with retry and caching.

**Features:**
- Automatic retries with exponential backoff
- Request timeout (default 30s)
- Response caching with TTL
- Offline fallback to cache
- Retry on specific status codes (408, 429, 500, 502, 503, 504)

**Usage:**
```typescript
import { api } from '@/lib/api-enhanced'

// Automatically retries on failure
const projects = await api.projects.list(token)

// Uses cache when offline
const user = await api.user.get(token)
```

#### 7. **apps/web/src/components/SyncStatus.tsx**
Visual sync status indicator.

**Features:**
- Shows connection status
- Displays pending action count
- Last sync timestamp
- Manual sync trigger
- Tooltip with details

**Usage:**
```typescript
import { SyncStatus } from '@/components/SyncStatus'

function Header() {
  return (
    <header>
      <SyncStatus showDetails />
    </header>
  )
}
```

#### 8. **apps/web/public/sw.js**
Service Worker for offline support.

**Features:**
- Caches static assets
- Network-first strategy with cache fallback
- Offline page serving
- Background sync support
- Cache cleanup on activation

**Registration:**
```typescript
// In your app entry point
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

#### 9. **apps/web/src/app/offline/page.tsx**
Offline fallback page.

**Features:**
- Shown when offline and no cache available
- Network status indicator
- Retry button
- Troubleshooting tips
- Auto-redirect when back online

---

### Mobile App (apps/mobile/src)

#### 10. **apps/mobile/src/services/offlineQueue.ts**
AsyncStorage-based offline queue for mobile.

**Features:**
- Persistent action queue
- Automatic retry with max attempts
- Queue status tracking
- Background sync support

**Usage:**
```typescript
import { offlineQueue } from '@/services/offlineQueue'

// Enqueue action
await offlineQueue.enqueue({
  type: 'message',
  payload: { text: 'Hello' }
})

// Sync when online
await offlineQueue.sync(async (action) => {
  // Send action to server
})
```

#### 11. **apps/mobile/src/hooks/useNetworkStatus.ts**
React Native hook for network monitoring.

**Features:**
- NetInfo integration
- Connection quality detection (excellent/good/poor/offline)
- Automatic sync on reconnect
- Pending action tracking

**Usage:**
```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

function Component() {
  const {
    isConnected,
    connectionQuality,
    pendingCount,
    queueAction,
    syncPendingActions
  } = useNetworkStatus()
}
```

#### 12. **apps/mobile/src/components/ConnectionStatus.tsx**
Mobile connection status indicator.

**Features:**
- Visual signal strength indicator
- Pulse animation when offline
- Pending action count
- Retry button
- Auto-hides when connected with good quality

**Usage:**
```tsx
import { ConnectionStatus } from '@/components/ConnectionStatus'

function Header() {
  return (
    <View>
      <ConnectionStatus showDetails onRetry={handleRetry} />
    </View>
  )
}
```

---

### Desktop App (apps/desktop/src)

#### 13. **apps/desktop/src/services/OfflineService.ts**
Electron offline service with file-based persistence.

**Features:**
- Command queue stored in userData
- Response caching
- Automatic sync on reconnect
- EventEmitter-based notifications

**Usage:**
```typescript
import { getOfflineService } from '@/services/OfflineService'

const offlineService = getOfflineService()
await offlineService.init()

// Queue command
await offlineService.queueCommand('command', payload)

// Sync pending
await offlineService.syncPendingCommands(handleSync)
```

#### 14. **apps/desktop/src/services/ConnectionServiceEnhanced.ts**
Enhanced connection service for desktop.

**Features:**
- Integrated offline service
- Heartbeat mechanism
- Automatic offline queue sync
- Missed message recovery
- Connection health monitoring

**Usage:**
```typescript
import { ConnectionService } from '@/services/ConnectionServiceEnhanced'

const service = new ConnectionService(authService)

service.on('connected', () => {
  console.log('Connected')
})

service.on('disconnected', () => {
  console.log('Disconnected')
})

await service.connect({
  url: 'ws://localhost:3001',
  token: 'your-token'
})
```

---

### Cloud Server (apps/cloud/src)

#### 15. **apps/cloud/src/socket/reconnection.ts**
Server-side reconnection handler.

**Features:**
- Session state preservation (5 min timeout)
- Message history for replay (100 messages per room)
- Missed message delivery
- Automatic session cleanup
- Room restoration on reconnect

**Usage:**
```typescript
import { initializeReconnectionHandlers } from '@/socket/reconnection'

// In your server setup
const io = new Server(server)
initializeReconnectionHandlers(io)
```

**Client reconnection:**
```typescript
// Client requests reconnection
socket.emit('reconnect:request', {
  oldSocketId: previousSocketId,
  since: disconnectedAt.toISOString()
})

socket.on('reconnect:response', ({ success, rooms, missedMessages }) => {
  // Handle reconnection
})
```

---

## Installation & Setup

### 1. Install Dependencies

#### Web App
```bash
cd apps/web
npm install
# No additional dependencies needed - uses built-in IndexedDB
```

#### Mobile App
```bash
cd apps/mobile
npm install @react-native-community/netinfo
```

Add to `package.json`:
```json
{
  "dependencies": {
    "@react-native-community/netinfo": "^11.0.0"
  }
}
```

#### Desktop App
No additional dependencies needed (uses built-in fs/EventEmitter)

### 2. Enable Service Worker (Web)

Add to `apps/web/src/app/layout.tsx`:

```typescript
'use client'

import { useEffect } from 'react'

export default function RootLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration)
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### 3. Add Offline Banner to Layout (Web)

```typescript
import { OfflineBanner } from '@/components/OfflineBanner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function Layout({ children }) {
  const { isOnline, pendingCount, isSyncing, retrySync } = useOnlineStatus()

  return (
    <>
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onRetry={() => retrySync(handleSync)}
      />
      {children}
    </>
  )
}
```

### 4. Initialize Reconnection Handler (Cloud)

Add to `apps/cloud/src/server.ts`:

```typescript
import { initializeReconnectionHandlers } from './socket/reconnection'

// After creating Socket.IO server
const io = new Server(server, { /* config */ })

// Initialize reconnection handlers
initializeReconnectionHandlers(io)

// Then initialize your regular socket handlers
initializeSocketHandlers(io)
```

### 5. Use Enhanced API Client (Web)

Replace existing API imports:

```typescript
// Before
import { api } from '@/lib/api'

// After
import { api } from '@/lib/api-enhanced'
```

### 6. Add Connection Status to Mobile Header

```tsx
import { ConnectionStatus } from '@/components/ConnectionStatus'

function Header() {
  return (
    <View style={styles.header}>
      <ConnectionStatus showDetails />
      {/* Other header content */}
    </View>
  )
}
```

---

## Configuration

### Reconnection Settings (Web/Desktop)

Adjust in `apps/web/src/lib/socket.ts`:

```typescript
const RECONNECTION_CONFIG = {
  enabled: true,
  initialDelay: 1000,        // Start with 1s delay
  maxDelay: 30000,           // Max 30s delay
  maxAttempts: 10,           // Try 10 times
  backoffMultiplier: 1.5,    // Exponential backoff multiplier
}
```

### Retry Settings (API)

Adjust in `apps/web/src/lib/api-enhanced.ts`:

```typescript
const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_TIMEOUT = 30000
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]
```

### Cache TTL

Configure per endpoint:

```typescript
api.projects.list(token) // Uses 60s TTL
api.user.get(token)      // Uses 5min TTL
```

---

## Testing

### Test Offline Mode

1. **Web**: Open DevTools → Network → Set to "Offline"
2. **Mobile**: Turn off WiFi and mobile data
3. **Desktop**: Disconnect from internet

### Test Reconnection

1. Go offline
2. Perform actions (they should queue)
3. Go back online
4. Verify actions sync automatically

### Test Service Worker

1. Open DevTools → Application → Service Workers
2. Verify SW is registered
3. Go offline
4. Navigate to a page
5. Should show offline page or cached content

---

## Monitoring

### Check Offline Queue

```typescript
// Web
const count = await offlineStore.getQueueCount()
const actions = await offlineStore.getPendingActions()

// Mobile
const count = offlineQueue.getCount()
const actions = offlineQueue.getAll()

// Desktop
const count = offlineService.getQueueCount()
const commands = offlineService.getAllCommands()
```

### Check Connection Status

```typescript
// Web
const state = getSocketState()
// { isConnected, reconnectAttempts, lastConnectedAt, lastDisconnectedAt }

// Mobile
const { isConnected, connectionQuality } = useNetworkStatus()

// Desktop
const status = connectionService.getStatus()
const stats = connectionService.getStats()
```

---

## Best Practices

1. **Always queue actions when offline** instead of showing errors
2. **Use cached data** when available for better UX
3. **Show visual feedback** for connection status
4. **Implement retry logic** for critical operations
5. **Handle sync conflicts** appropriately
6. **Test edge cases** (slow connections, intermittent connectivity)
7. **Monitor queue size** and clear old failed actions
8. **Preserve user data** even if sync fails

---

## Troubleshooting

### Actions not syncing

1. Check if online: `navigator.onLine`
2. Check pending count: `getQueueCount()`
3. Manually trigger sync: `syncPendingActions()`
4. Check for errors in console

### Service Worker not updating

1. Unregister old SW in DevTools
2. Clear cache
3. Hard reload (Ctrl+Shift+R)
4. Re-register SW

### Connection keeps dropping

1. Check heartbeat interval (might be too aggressive)
2. Check server timeout settings
3. Verify network stability
4. Check firewall/proxy settings

---

## Future Enhancements

- [ ] Conflict resolution for concurrent edits
- [ ] Optimistic updates with rollback
- [ ] Bandwidth-aware sync
- [ ] Differential sync for large datasets
- [ ] Push notifications for missed events
- [ ] Background sync API integration
- [ ] Progressive Web App (PWA) support
- [ ] Offline-first database (PouchDB/RxDB)

---

## Summary

This implementation provides a robust offline-first experience across all RemoteDevAI platforms:

- **Web**: IndexedDB + Service Worker + Enhanced Socket.IO
- **Mobile**: AsyncStorage + NetInfo + Connection monitoring
- **Desktop**: File-based queue + Enhanced connection service
- **Cloud**: Session restoration + Message replay

All platforms share the same core principles:
1. Queue actions when offline
2. Sync automatically when reconnected
3. Cache data for offline access
4. Show clear visual feedback
5. Retry failed operations
6. Preserve user data

The system is designed to handle edge cases gracefully and provide a seamless experience even with poor or intermittent connectivity.
