# Offline Support - Quick Start Guide

Quick reference for using offline support features in RemoteDevAI.

## Installation

### Mobile Only
```bash
cd apps/mobile
npm install @react-native-community/netinfo
```

Web and Desktop use built-in APIs - no additional dependencies needed.

---

## Web App Usage

### 1. Basic Setup

```typescript
// In your root layout or App component
import { OfflineBanner } from '@/components/OfflineBanner'
import { SyncStatus } from '@/components/SyncStatus'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function App() {
  const { isOnline, pendingCount, isSyncing, retrySync } = useOnlineStatus()

  return (
    <>
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onRetry={() => retrySync(handleSync)}
      />
      <Header>
        <SyncStatus showDetails />
      </Header>
      {/* Your app */}
    </>
  )
}
```

### 2. Queue Actions When Offline

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function Component() {
  const { isOnline, queueAction } = useOnlineStatus()

  const sendMessage = async (message) => {
    if (isOnline) {
      // Send directly
      await api.sendMessage(message)
    } else {
      // Queue for later
      await queueAction({
        type: 'session:message',
        payload: { message }
      })
    }
  }
}
```

### 3. Use Enhanced API (with auto-retry)

```typescript
import { api } from '@/lib/api-enhanced'

// Automatically retries on failure and caches responses
const projects = await api.projects.list(token)
```

### 4. Register Service Worker

```typescript
// In app entry point
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

---

## Mobile App Usage

### 1. Basic Setup

```tsx
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

function App() {
  const { isConnected, connectionQuality, pendingCount } = useNetworkStatus()

  return (
    <View>
      <ConnectionStatus showDetails onRetry={handleRetry} />
      {/* Your app */}
    </View>
  )
}
```

### 2. Queue Actions

```tsx
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

function Component() {
  const { isConnected, queueAction, syncPendingActions } = useNetworkStatus()

  const sendCommand = async (command) => {
    if (isConnected) {
      socket.emit('command', command)
    } else {
      await queueAction({
        type: 'command',
        payload: command
      })
    }
  }

  // Sync when back online
  useEffect(() => {
    if (isConnected) {
      syncPendingActions(async (action) => {
        socket.emit(action.type, action.payload)
      })
    }
  }, [isConnected])
}
```

---

## Desktop App Usage

### 1. Initialize Services

```typescript
import { getOfflineService } from '@/services/OfflineService'
import { ConnectionService } from '@/services/ConnectionServiceEnhanced'

const offlineService = getOfflineService()
await offlineService.init()

const connectionService = new ConnectionService(authService)

connectionService.on('connected', async () => {
  console.log('Connected - syncing offline commands')
  // Sync happens automatically
})

await connectionService.connect({
  url: 'ws://localhost:3001',
  token: authToken
})
```

### 2. Send Commands

```typescript
// Automatically queues if offline
connectionService.send('command', payload)

// Or with acknowledgment
try {
  const response = await connectionService.sendWithAck('command', payload)
} catch (error) {
  // Uses cached response if offline
}
```

---

## Cloud Server Setup

```typescript
import { initializeReconnectionHandlers } from './socket/reconnection'

const io = new Server(server)

// Initialize reconnection handlers FIRST
initializeReconnectionHandlers(io)

// Then your regular socket handlers
initializeSocketHandlers(io)
```

---

## Common Patterns

### Pattern 1: Optimistic Updates

```typescript
const updateProject = async (id, data) => {
  // Update UI immediately
  setProject({ ...project, ...data })

  try {
    if (isOnline) {
      await api.projects.update(id, data, token)
    } else {
      // Queue for later
      await queueAction({
        type: 'project:update',
        payload: { id, data }
      })
    }
  } catch (error) {
    // Rollback on failure
    setProject(project)
    showError('Update failed')
  }
}
```

### Pattern 2: Cache-First Data Loading

```typescript
const loadProjects = async () => {
  try {
    // Try API first (will use cache if offline)
    const { projects } = await api.projects.list(token)
    setProjects(projects)
  } catch (error) {
    // Fallback to cached data
    const cached = await offlineStore.getCachedData('projects')
    if (cached) {
      setProjects(cached)
      showWarning('Showing cached data (offline)')
    }
  }
}
```

### Pattern 3: Sync on Reconnect

```typescript
useEffect(() => {
  if (isOnline && wasOffline) {
    // Sync pending actions
    syncPendingActions(async (action) => {
      switch (action.type) {
        case 'session:message':
          socket.emit('send-message', action.payload)
          break
        case 'project:update':
          await api.projects.update(action.payload.id, action.payload.data, token)
          break
      }
    })
  }
}, [isOnline, wasOffline])
```

### Pattern 4: Show Status to User

```typescript
const StatusIndicator = () => {
  const { isOnline, pendingCount, isSyncing } = useOnlineStatus()

  return (
    <div className="status">
      {!isOnline && '🔴 Offline'}
      {isSyncing && '🔄 Syncing...'}
      {pendingCount > 0 && `📦 ${pendingCount} pending`}
      {isOnline && pendingCount === 0 && '🟢 All synced'}
    </div>
  )
}
```

---

## Configuration

### Adjust Reconnection Attempts

```typescript
// apps/web/src/lib/socket.ts
const RECONNECTION_CONFIG = {
  maxAttempts: 10,      // Change this
  initialDelay: 1000,
  maxDelay: 30000,
}
```

### Adjust Retry Count

```typescript
// apps/web/src/lib/api-enhanced.ts
const DEFAULT_RETRIES = 3  // Change this
```

### Adjust Cache TTL

```typescript
// Custom TTL per request
await offlineStore.cacheData('key', data, 120000) // 2 minutes
```

---

## Testing Checklist

- [ ] Go offline and perform actions
- [ ] Verify actions are queued
- [ ] Go back online
- [ ] Verify actions sync automatically
- [ ] Test with slow connection
- [ ] Test with intermittent connection
- [ ] Test manual retry
- [ ] Verify cached data works offline
- [ ] Test service worker offline page

---

## Monitoring

### Check Queue Status

```typescript
// Web
const count = await offlineStore.getQueueCount()
console.log(`${count} actions queued`)

// Mobile
const count = offlineQueue.getCount()

// Desktop
const count = offlineService.getQueueCount()
```

### Clear Queue (if needed)

```typescript
await offlineStore.clear()           // Web
await offlineQueue.clear()           // Mobile
await offlineService.clearQueue()    // Desktop
```

---

## Key Files Reference

| Platform | File | Purpose |
|----------|------|---------|
| Web | `lib/offlineStore.ts` | IndexedDB storage |
| Web | `hooks/useOnlineStatus.ts` | Online/offline tracking |
| Web | `lib/socket.ts` | Enhanced WebSocket |
| Web | `lib/api-enhanced.ts` | Retry + cache |
| Web | `components/OfflineBanner.tsx` | Status banner |
| Web | `components/SyncStatus.tsx` | Sync indicator |
| Web | `public/sw.js` | Service worker |
| Mobile | `services/offlineQueue.ts` | AsyncStorage queue |
| Mobile | `hooks/useNetworkStatus.ts` | Network monitoring |
| Mobile | `components/ConnectionStatus.tsx` | Status indicator |
| Desktop | `services/OfflineService.ts` | File-based queue |
| Desktop | `services/ConnectionServiceEnhanced.ts` | Enhanced connection |
| Cloud | `socket/reconnection.ts` | Session restoration |

---

## Getting Help

See [OFFLINE_SUPPORT_IMPLEMENTATION.md](./OFFLINE_SUPPORT_IMPLEMENTATION.md) for detailed documentation.
