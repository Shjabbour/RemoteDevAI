// Service Worker for RemoteDevAI Web App
// Provides offline support and caching

const CACHE_NAME = 'remotedevai-v1'
const OFFLINE_URL = '/offline'

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
        // Don't fail installation if caching fails
      })
    })
  )

  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )

  // Take control immediately
  return self.clients.claim()
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone()

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
        }

        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url)
            return cachedResponse
          }

          // If no cache, return offline page for navigation requests
          if (request.mode === 'navigate') {
            console.log('[SW] Serving offline page')
            return caches.match(OFFLINE_URL)
          }

          // Return a basic offline response for other requests
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          })
        })
      })
  )
})

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions())
  }
})

// Sync offline actions
async function syncOfflineActions() {
  console.log('[SW] Syncing offline actions...')

  try {
    // Open IndexedDB and get pending actions
    const db = await openDB()
    const actions = await getPendingActions(db)

    console.log(`[SW] Found ${actions.length} pending actions`)

    for (const action of actions) {
      try {
        // Try to sync each action
        await syncAction(action)

        // Remove from queue on success
        await removeAction(db, action.id)
      } catch (error) {
        console.error('[SW] Failed to sync action:', error)
        // Will retry on next sync
      }
    }

    console.log('[SW] Offline actions synced')
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// Helper: Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('remotedevai_offline', 1)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Helper: Get pending actions
function getPendingActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_actions'], 'readonly')
    const store = transaction.objectStore('pending_actions')
    const index = store.index('status')
    const request = index.getAll('pending')

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// Helper: Remove action
function removeAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_actions'], 'readwrite')
    const store = transaction.objectStore('pending_actions')
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Helper: Sync action
async function syncAction(action) {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(action),
  })

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`)
  }

  return response.json()
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urls)
      })
    )
  }
})

console.log('[SW] Service worker loaded')
