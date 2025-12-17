# API Migration Guide: v1 to v2

This guide provides step-by-step instructions for migrating from API v1 to v2.

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Code Examples](#code-examples)
5. [Migration Tool](#migration-tool)
6. [Testing](#testing)
7. [Rollback Plan](#rollback-plan)
8. [FAQ](#faq)

---

## Overview

### What's New in v2?

- **Enhanced Authentication**: Separate access and refresh tokens
- **Improved Error Handling**: Structured error responses with error codes
- **Better Pagination**: Enhanced pagination metadata
- **Response Headers**: Version and deprecation headers
- **Type Safety**: Improved TypeScript types

### Migration Timeline

- **Recommended**: 2-4 hours for small projects
- **Complexity**: Medium
- **Backward Compatibility**: v1 remains supported
- **Breaking Changes**: 4 major changes

### Prerequisites

- Node.js 16+ or 18+
- TypeScript 4.5+ (if using TypeScript)
- Familiarity with async/await and Promises
- Understanding of JWT tokens

---

## Breaking Changes

### 1. Authentication Response Format

#### What Changed?

Auth endpoints now return separate access and refresh tokens with metadata.

#### Before (v1)

```typescript
// Response from /api/v1/auth/login
{
  success: true,
  data: {
    user: { id, email, name },
    token: "eyJhbGciOiJIUzI1..."
  }
}

// Usage
localStorage.setItem('token', data.token);
```

#### After (v2)

```typescript
// Response from /api/v2/auth/login
{
  success: true,
  data: {
    user: { id, email, name },
    accessToken: "eyJhbGciOiJIUzI1...",
    refreshToken: "eyJhbGciOiJIUzI1...",
    tokenType: "Bearer",
    expiresIn: 3600
  }
}

// Usage
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

#### Migration Steps

1. Update token storage to use `accessToken` and `refreshToken`
2. Implement token refresh logic
3. Handle token expiration
4. Update Authorization header (no change needed, still uses Bearer)

---

### 2. Error Response Structure

#### What Changed?

Errors are now structured objects with error codes instead of simple strings.

#### Before (v1)

```typescript
{
  success: false,
  error: "Authentication failed",
  message: "Invalid credentials"
}

// Error handling
if (!response.success) {
  console.error(response.error); // String
}
```

#### After (v2)

```typescript
{
  success: false,
  error: {
    code: "AUTH_INVALID_CREDENTIALS",
    message: "Invalid credentials",
    details: { /* additional context */ },
    timestamp: "2024-06-01T12:00:00Z"
  }
}

// Error handling
if (!response.success) {
  console.error(response.error.code); // Enum
  console.error(response.error.message);
}
```

#### Migration Steps

1. Update error handling to check `error.code`
2. Use error codes for conditional logic
3. Display `error.message` to users
4. Log `error.details` for debugging

---

### 3. Pagination Structure

#### What Changed?

Pagination metadata is now in a dedicated `pagination` object with additional fields.

#### Before (v1)

```typescript
{
  success: true,
  data: [...],
  total: 100,
  page: 1,
  limit: 10
}

// Calculating pagination
const totalPages = Math.ceil(response.total / response.limit);
const hasNext = response.page < totalPages;
```

#### After (v2)

```typescript
{
  success: true,
  data: [...],
  pagination: {
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10,
    hasNext: true,
    hasPrev: false
  }
}

// Using pagination
const { hasNext, totalPages } = response.pagination;
```

#### Migration Steps

1. Update pagination extraction: `response.pagination.total` instead of `response.total`
2. Use built-in `hasNext` and `hasPrev` flags
3. Remove manual pagination calculations

---

### 4. Token Refresh Endpoint

#### What Changed?

Refresh token endpoint now expects `refreshToken` field instead of `token`.

#### Before (v1)

```typescript
POST /api/v1/auth/refresh
{
  token: "eyJhbGciOiJIUzI1..."
}
```

#### After (v2)

```typescript
POST /api/v2/auth/refresh
{
  refreshToken: "eyJhbGciOiJIUzI1..."
}
```

#### Migration Steps

1. Update request body to use `refreshToken`
2. Store new access and refresh tokens from response

---

## Step-by-Step Migration

### Step 1: Update API Base URL

```typescript
// Before
const API_BASE = 'https://api.remotedevai.com/api/v1';

// After
const API_BASE = 'https://api.remotedevai.com/api/v2';
```

### Step 2: Update Authentication

**Create a new auth service:**

```typescript
// auth.service.ts
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      this.setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data.user;
    } else {
      throw new Error(data.error.message);
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  async refreshAccessToken() {
    const response = await fetch('/api/v2/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      this.setTokens(data.data.accessToken, data.data.refreshToken);
    } else {
      // Refresh failed, logout user
      this.logout();
      throw new Error('Session expired, please login again');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken || localStorage.getItem('accessToken');
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

export const authService = new AuthService();
```

### Step 3: Create API Client with Auto-Refresh

```typescript
// api.client.ts
import { authService } from './auth.service';

class ApiClient {
  private baseUrl = 'https://api.remotedevai.com/api/v2';

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authService.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    // Handle token expiration
    if (!data.success && data.error?.code === 'AUTH_TOKEN_EXPIRED') {
      await authService.refreshAccessToken();
      // Retry request with new token
      return this.request<T>(endpoint, options);
    }

    if (!data.success) {
      throw new ApiError(data.error);
    }

    return data.data;
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

class ApiError extends Error {
  constructor(public error: { code: string; message: string; details?: any }) {
    super(error.message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
```

### Step 4: Update Error Handling

```typescript
// Before
try {
  const response = await fetch('/api/v1/projects');
  const data = await response.json();

  if (!data.success) {
    alert(data.error); // String
  }
} catch (error) {
  console.error(error);
}

// After
import { apiClient } from './api.client';
import { ErrorCode } from '@remotedevai/shared/api/v2';

try {
  const projects = await apiClient.get('/projects');
  // Success
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.error.code) {
      case ErrorCode.AUTH_INVALID_TOKEN:
        // Redirect to login
        break;
      case ErrorCode.VALIDATION_ERROR:
        // Show validation errors
        alert(error.error.message);
        break;
      default:
        alert('An error occurred');
    }
  }
}
```

### Step 5: Update Pagination

```typescript
// Before
const { data, total, page, limit } = response;
const totalPages = Math.ceil(total / limit);

// After
import { PaginatedResponse } from '@remotedevai/shared/api/v2';

const { data, pagination } = response as PaginatedResponse<Project>;
const { total, page, limit, totalPages, hasNext, hasPrev } = pagination;
```

### Step 6: Update TypeScript Types

```typescript
// Before
import { Project, User } from '@remotedevai/shared/api/v1';

// After
import { Project, User, AuthResponse } from '@remotedevai/shared/api/v2';
```

---

## Code Examples

### Complete React Example

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { User } from '@remotedevai/shared/api/v2';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = authService.getAccessToken();
      if (token) {
        const user = await apiClient.get<User>('/auth/me');
        setUser(user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const user = await authService.login(email, password);
    setUser(user);
  }

  function logout() {
    authService.logout();
    setUser(null);
  }

  return { user, loading, login, logout };
}
```

---

## Migration Tool

We provide an automated migration tool to help identify and fix breaking changes:

```bash
# Analyze your codebase
npx ts-node scripts/migrate-api-v1-to-v2.ts ./src

# Apply automatic fixes (dry run)
npx ts-node scripts/migrate-api-v1-to-v2.ts ./src --auto-fix

# Apply fixes (actually modify files)
npx ts-node scripts/migrate-api-v1-to-v2.ts ./src --auto-fix --no-dry-run
```

The tool will:
- Scan your code for v1 API usage
- Generate a detailed report
- Suggest fixes
- Optionally apply automatic fixes

---

## Testing

### Test Checklist

- [ ] Authentication flow (login, logout, refresh)
- [ ] Token refresh on expiration
- [ ] Error handling for all error codes
- [ ] Pagination in list endpoints
- [ ] Create/update/delete operations
- [ ] WebSocket connections (if used)
- [ ] File uploads (if used)

### Test Example

```typescript
describe('API v2 Migration', () => {
  it('should handle login with new response format', async () => {
    const response = await authService.login('test@example.com', 'password');

    expect(response).toHaveProperty('id');
    expect(localStorage.getItem('accessToken')).toBeTruthy();
    expect(localStorage.getItem('refreshToken')).toBeTruthy();
  });

  it('should handle token refresh', async () => {
    await authService.refreshAccessToken();

    const newToken = localStorage.getItem('accessToken');
    expect(newToken).toBeTruthy();
  });

  it('should handle errors with new structure', async () => {
    try {
      await apiClient.get('/invalid-endpoint');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.error).toHaveProperty('code');
      expect(error.error).toHaveProperty('message');
    }
  });
});
```

---

## Rollback Plan

If you need to rollback to v1:

1. **Change API base URL back to v1**
   ```typescript
   const API_BASE = 'https://api.remotedevai.com/api/v1';
   ```

2. **Revert auth changes** (use `token` instead of `accessToken`)

3. **Revert error handling** (use string errors)

4. **Revert pagination** (use flat structure)

5. **Deploy rollback** and monitor

---

## FAQ

### Q: Do I need to migrate immediately?

A: No, v1 will remain supported. However, we recommend migrating to benefit from new features and improvements.

### Q: Can I use both v1 and v2 simultaneously?

A: Yes, but it's not recommended. Use environment variables to switch between versions during migration.

### Q: Will my existing tokens work with v2?

A: Existing tokens will work initially, but you'll need to re-login to get the new token format with refresh tokens.

### Q: What happens if I don't refresh tokens?

A: Users will be logged out when their access token expires (1 hour). Implementing refresh is highly recommended.

### Q: Are there any performance differences?

A: v2 has similar performance to v1, with slight improvements in some areas.

---

## Support

Need help with migration?

- **Documentation**: [API Changelog](./API_CHANGELOG.md)
- **GitHub Issues**: Report migration issues
- **Community**: Join our Discord
- **Email**: support@remotedevai.com

---

**Last Updated:** 2024-06-01
