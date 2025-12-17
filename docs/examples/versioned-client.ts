/**
 * Example: Versioned API Client Implementation
 *
 * This example shows how to build a robust API client that:
 * - Supports multiple API versions
 * - Handles deprecation warnings
 * - Automatically refreshes tokens
 * - Provides type safety
 */

import type {
  ApiResponse,
  AuthResponse,
  User,
  Project,
  ErrorCode,
} from '@remotedevai/shared/api/v2';

// ============================================================================
// Configuration
// ============================================================================

interface ClientConfig {
  baseUrl: string;
  version: 'v1' | 'v2';
  onDeprecationWarning?: (warning: DeprecationWarning) => void;
  onUpgradeRecommended?: (latest: string) => void;
  onTokenRefresh?: (tokens: TokenPair) => void;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface DeprecationWarning {
  version: string;
  sunsetDays: number | null;
  migrationGuide: string | null;
}

// ============================================================================
// API Client
// ============================================================================

class RemoteDevAIClient {
  private config: ClientConfig;
  private tokens: TokenPair | null = null;

  constructor(config: ClientConfig) {
    this.config = {
      baseUrl: 'https://api.remotedevai.com',
      version: 'v2',
      ...config,
    };

    // Load tokens from storage
    this.loadTokens();
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  async login(email: string, password: string): Promise<User> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });

    // Store tokens
    this.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });

    return response.user;
  }

  async register(email: string, password: string, name: string): Promise<User> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
      skipAuth: true,
    });

    this.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });

    return response.user;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: this.tokens.refreshToken },
      skipAuth: true,
    });

    this.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
  }

  // --------------------------------------------------------------------------
  // User Endpoints
  // --------------------------------------------------------------------------

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(data: { name?: string; avatar?: string }): Promise<User> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: data,
    });
  }

  // --------------------------------------------------------------------------
  // Project Endpoints
  // --------------------------------------------------------------------------

  async getProjects(params?: {
    page?: number;
    limit?: number;
    includeArchived?: boolean;
  }): Promise<{ data: Project[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.includeArchived) query.set('includeArchived', 'true');

    const queryString = query.toString();
    const endpoint = `/projects${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
  }): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: data,
    });
  }

  async updateProject(
    id: string,
    data: { name?: string; description?: string }
  ): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // --------------------------------------------------------------------------
  // Core Request Method
  // --------------------------------------------------------------------------

  private async request<T = any>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      skipAuth?: boolean;
      retryOnTokenExpired?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      skipAuth = false,
      retryOnTokenExpired = true,
    } = options;

    // Build URL
    const url = `${this.config.baseUrl}/api/${this.config.version}${endpoint}`;

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authentication
    if (!skipAuth && this.tokens?.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    // Make request
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      ...(body && { body: JSON.stringify(body) }),
    });

    // Check response headers for warnings
    this.checkDeprecationWarnings(response);
    this.checkUpgradeRecommendations(response);

    // Parse response
    const data: ApiResponse<T> = await response.json();

    // Handle errors
    if (!data.success) {
      // Token expired - try to refresh
      if (
        retryOnTokenExpired &&
        data.error?.code === 'AUTH_TOKEN_EXPIRED' &&
        this.tokens?.refreshToken
      ) {
        await this.refreshToken();
        // Retry request with new token
        return this.request<T>(endpoint, {
          ...options,
          retryOnTokenExpired: false, // Prevent infinite loop
        });
      }

      throw new ApiError(data.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error' });
    }

    return data.data as T;
  }

  // --------------------------------------------------------------------------
  // Token Management
  // --------------------------------------------------------------------------

  private setTokens(tokens: TokenPair): void {
    this.tokens = tokens;
    this.saveTokens();

    if (this.config.onTokenRefresh) {
      this.config.onTokenRefresh(tokens);
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem('remotedevai_access_token');
    localStorage.removeItem('remotedevai_refresh_token');
  }

  private saveTokens(): void {
    if (this.tokens) {
      localStorage.setItem('remotedevai_access_token', this.tokens.accessToken);
      localStorage.setItem('remotedevai_refresh_token', this.tokens.refreshToken);
    }
  }

  private loadTokens(): void {
    const accessToken = localStorage.getItem('remotedevai_access_token');
    const refreshToken = localStorage.getItem('remotedevai_refresh_token');

    if (accessToken && refreshToken) {
      this.tokens = { accessToken, refreshToken };
    }
  }

  // --------------------------------------------------------------------------
  // Header Checks
  // --------------------------------------------------------------------------

  private checkDeprecationWarnings(response: Response): void {
    const deprecated = response.headers.get('X-API-Deprecated');
    if (deprecated !== 'true') return;

    const warning: DeprecationWarning = {
      version: response.headers.get('X-API-Version') || this.config.version,
      sunsetDays: parseInt(response.headers.get('X-API-Sunset-Days') || '0') || null,
      migrationGuide: response.headers.get('X-API-Migration-Guide'),
    };

    console.warn('⚠️  API Version Deprecated:', warning);

    if (this.config.onDeprecationWarning) {
      this.config.onDeprecationWarning(warning);
    }
  }

  private checkUpgradeRecommendations(response: Response): void {
    const upgradeRecommended = response.headers.get('X-API-Upgrade-Recommended');
    if (upgradeRecommended !== 'true') return;

    const latest = response.headers.get('X-API-Latest-Version');
    if (!latest) return;

    console.info(`💡 API upgrade recommended to ${latest}`);

    if (this.config.onUpgradeRecommended) {
      this.config.onUpgradeRecommended(latest);
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  getVersion(): string {
    return this.config.version;
  }

  setVersion(version: 'v1' | 'v2'): void {
    this.config.version = version;
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

class ApiError extends Error {
  constructor(
    public error: {
      code: string;
      message: string;
      details?: any;
      timestamp?: string;
    }
  ) {
    super(error.message);
    this.name = 'ApiError';
  }

  is(code: ErrorCode | string): boolean {
    return this.error.code === code;
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

// Example 1: Basic Usage
async function example1() {
  const client = new RemoteDevAIClient({
    baseUrl: 'https://api.remotedevai.com',
    version: 'v2',
  });

  try {
    // Login
    const user = await client.login('user@example.com', 'password');
    console.log('Logged in as:', user.email);

    // Get projects
    const { data: projects } = await client.getProjects({ page: 1, limit: 10 });
    console.log('Projects:', projects);

    // Create project
    const newProject = await client.createProject({
      name: 'My Project',
      description: 'A new project',
    });
    console.log('Created:', newProject);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.error.code, error.error.message);
    }
  }
}

// Example 2: With Deprecation Warnings
async function example2() {
  const client = new RemoteDevAIClient({
    baseUrl: 'https://api.remotedevai.com',
    version: 'v1', // Using deprecated version

    onDeprecationWarning: (warning) => {
      if (warning.sunsetDays && warning.sunsetDays < 30) {
        alert(`⚠️  API version will be sunset in ${warning.sunsetDays} days!`);
      }
    },

    onUpgradeRecommended: (latest) => {
      console.log(`Consider upgrading to ${latest}`);
    },
  });

  await client.login('user@example.com', 'password');
}

// Example 3: React Hook
function useRemoteDevAI() {
  const [client] = React.useState(
    () =>
      new RemoteDevAIClient({
        baseUrl: process.env.REACT_APP_API_URL!,
        version: 'v2',

        onTokenRefresh: (tokens) => {
          console.log('Tokens refreshed');
        },

        onDeprecationWarning: (warning) => {
          // Show toast notification
          toast.warning(
            `API deprecated. ${warning.sunsetDays} days until sunset.`
          );
        },
      })
  );

  return client;
}

// Example 4: Error Handling
async function example4() {
  const client = new RemoteDevAIClient({
    baseUrl: 'https://api.remotedevai.com',
    version: 'v2',
  });

  try {
    await client.createProject({ name: 'Test' });
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.error.code) {
        case 'AUTH_INVALID_TOKEN':
          // Redirect to login
          window.location.href = '/login';
          break;

        case 'VALIDATION_ERROR':
          // Show validation errors
          console.error('Validation failed:', error.error.details);
          break;

        case 'RATE_LIMIT_EXCEEDED':
          // Show rate limit message
          alert('Too many requests. Please try again later.');
          break;

        default:
          // Generic error
          alert('An error occurred: ' + error.error.message);
      }
    }
  }
}

// ============================================================================
// Export
// ============================================================================

export { RemoteDevAIClient, ApiError };
export type { ClientConfig, TokenPair, DeprecationWarning };
