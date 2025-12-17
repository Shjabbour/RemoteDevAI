import { offlineStore } from './offlineStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface RequestOptions extends RequestInit {
  token?: string
  retries?: number
  retryDelay?: number
  timeout?: number
  cache?: boolean
  cacheTTL?: number
}

// Retry configuration
const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_TIMEOUT = 30000
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt - 1)
}

/**
 * Enhanced request function with retry logic, timeout, and caching
 */
async function request<T>(
  endpoint: string,
  {
    token,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    timeout = DEFAULT_TIMEOUT,
    cache = false,
    cacheTTL,
    ...options
  }: RequestOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint}`
  const cacheKey = `api:${endpoint}:${JSON.stringify(options.body || '')}`

  // Check cache first if enabled
  if (cache && options.method === 'GET') {
    const cached = await offlineStore.getCachedData<T>(cacheKey)
    if (cached) {
      console.log('Using cached data for:', endpoint)
      return cached
    }
  }

  let lastError: Error | null = null

  // Retry loop
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check if we should retry based on status code
      if (!response.ok && attempt <= retries && RETRY_STATUS_CODES.includes(response.status)) {
        const delay = getRetryDelay(attempt, retryDelay)
        console.log(`Request failed with ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${retries})`)
        await sleep(delay)
        continue
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Cache successful responses if enabled
      if (cache) {
        await offlineStore.cacheData(cacheKey, data, cacheTTL)
      }

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Request failed')

      // Don't retry on abort (timeout) errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }

      // Network error - check if we should retry
      if (attempt <= retries) {
        const delay = getRetryDelay(attempt, retryDelay)
        console.log(`Request failed: ${lastError.message}, retrying in ${delay}ms (attempt ${attempt}/${retries})`)
        await sleep(delay)
        continue
      }

      // All retries exhausted
      break
    }
  }

  // If offline and cache enabled, try to get stale cached data
  if (!navigator.onLine && cache) {
    const cached = await offlineStore.getCachedData<T>(cacheKey)
    if (cached) {
      console.warn('Using stale cached data (offline):', endpoint)
      return cached
    }
  }

  throw lastError || new Error('Request failed after all retries')
}

/**
 * Enhanced API client with retry logic and offline support
 */
export const api = {
  // Projects
  projects: {
    list: (token: string) =>
      request<{ projects: any[] }>('/projects', {
        token,
        cache: true,
        cacheTTL: 60000, // 1 minute
      }),

    get: (id: string, token: string) =>
      request<{ project: any }>(`/projects/${id}`, {
        token,
        cache: true,
        cacheTTL: 60000,
      }),

    create: (data: any, token: string) =>
      request<{ project: any }>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        retries: 2,
      }),

    update: (id: string, data: any, token: string) =>
      request<{ project: any }>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        retries: 2,
      }),

    delete: (id: string, token: string) =>
      request<{ success: boolean }>(`/projects/${id}`, {
        method: 'DELETE',
        token,
        retries: 1,
      }),
  },

  // Sessions
  sessions: {
    list: (token: string) =>
      request<{ sessions: any[] }>('/sessions', {
        token,
        cache: true,
        cacheTTL: 30000, // 30 seconds
      }),

    start: (projectId: string, token: string) =>
      request<{ session: any }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
        token,
        retries: 2,
      }),

    end: (id: string, token: string) =>
      request<{ session: any }>(`/sessions/${id}`, {
        method: 'DELETE',
        token,
        retries: 1,
      }),
  },

  // Recordings
  recordings: {
    list: (token: string) =>
      request<{ recordings: any[] }>('/recordings', {
        token,
        cache: true,
        cacheTTL: 120000, // 2 minutes
      }),

    get: (id: string, token: string) =>
      request<{ recording: any }>(`/recordings/${id}`, {
        token,
        cache: true,
        cacheTTL: 300000, // 5 minutes
      }),

    delete: (id: string, token: string) =>
      request<{ success: boolean }>(`/recordings/${id}`, {
        method: 'DELETE',
        token,
        retries: 1,
      }),
  },

  // User
  user: {
    get: (token: string) =>
      request<{ user: any }>('/user', {
        token,
        cache: true,
        cacheTTL: 300000, // 5 minutes
      }),

    update: (data: any, token: string) =>
      request<{ user: any }>('/user', {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        retries: 2,
      }),
  },

  // Billing
  billing: {
    getSubscription: (token: string) =>
      request<{ subscription: any }>('/billing/subscription', {
        token,
        cache: true,
        cacheTTL: 60000,
      }),

    getUsage: (token: string) =>
      request<{ usage: any }>('/billing/usage', {
        token,
        cache: true,
        cacheTTL: 30000,
      }),

    getInvoices: (token: string) =>
      request<{ invoices: any[] }>('/billing/invoices', {
        token,
        cache: true,
        cacheTTL: 300000,
      }),
  },
}

// Re-export for backward compatibility
export default api
