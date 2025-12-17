const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface RequestOptions extends RequestInit {
  token?: string
}

async function request<T>(
  endpoint: string,
  { token, ...options }: RequestOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'An error occurred')
  }

  return response.json()
}

export const api = {
  // Projects
  projects: {
    list: (token: string) =>
      request<{ projects: any[] }>('/projects', { token }),

    get: (id: string, token: string) =>
      request<{ project: any }>(`/projects/${id}`, { token }),

    create: (data: any, token: string) =>
      request<{ project: any }>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),

    update: (id: string, data: any, token: string) =>
      request<{ project: any }>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
      }),

    delete: (id: string, token: string) =>
      request<{ success: boolean }>(`/projects/${id}`, {
        method: 'DELETE',
        token,
      }),
  },

  // Sessions
  sessions: {
    list: (token: string) =>
      request<{ sessions: any[] }>('/sessions', { token }),

    start: (projectId: string, token: string) =>
      request<{ session: any }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
        token,
      }),

    end: (id: string, token: string) =>
      request<{ session: any }>(`/sessions/${id}`, {
        method: 'DELETE',
        token,
      }),
  },

  // Recordings
  recordings: {
    list: (token: string) =>
      request<{ recordings: any[] }>('/recordings', { token }),

    get: (id: string, token: string) =>
      request<{ recording: any }>(`/recordings/${id}`, { token }),

    delete: (id: string, token: string) =>
      request<{ success: boolean }>(`/recordings/${id}`, {
        method: 'DELETE',
        token,
      }),
  },

  // User
  user: {
    get: (token: string) =>
      request<{ user: any }>('/user', { token }),

    update: (data: any, token: string) =>
      request<{ user: any }>('/user', {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
      }),
  },

  // Billing
  billing: {
    getSubscription: (token: string) =>
      request<{ subscription: any }>('/billing/subscription', { token }),

    getUsage: (token: string) =>
      request<{ usage: any }>('/billing/usage', { token }),

    getInvoices: (token: string) =>
      request<{ invoices: any[] }>('/billing/invoices', { token }),
  },
}
