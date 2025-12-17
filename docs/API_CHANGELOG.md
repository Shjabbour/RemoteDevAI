# API Changelog

This document tracks all changes between API versions, including breaking changes, new features, and deprecations.

---

## Version 2 (v2)

**Released:** 2024-06-01
**Status:** Current
**Stability:** Stable

### Overview

Version 2 introduces enhanced authentication, improved error handling, and better response structures. This version is backward compatible where possible, with clear migration paths for breaking changes.

### Breaking Changes

#### Authentication Response Format

**v1 Format:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGc..."
  }
}
```

**v2 Format:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

**Migration:**
- Replace `token` with `accessToken`
- Store `refreshToken` for token refresh
- Handle `expiresIn` for automatic token refresh

#### Error Response Format

**v1 Format:**
```json
{
  "success": false,
  "error": "Authentication failed",
  "message": "Invalid credentials"
}
```

**v2 Format:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid credentials",
    "details": { ... },
    "timestamp": "2024-06-01T12:00:00Z"
  }
}
```

**Migration:**
- Update error handling to check `error.code` instead of `error`
- Use `error.message` for user-facing messages
- Access additional context in `error.details`

### New Features

#### 1. Enhanced Authentication

**New Endpoints:**

- `POST /api/v2/auth/refresh` - Refresh access tokens
- `POST /api/v2/auth/verify-email` - Email verification (placeholder)
- `POST /api/v2/auth/forgot-password` - Password reset request (placeholder)
- `POST /api/v2/auth/reset-password` - Password reset (placeholder)

**Enhanced Responses:**

- `GET /api/v2/auth/me` - Now includes permissions and subscription info

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "permissions": ["read", "write"],
    "subscription": {
      "active": true,
      "tier": "free"
    }
  }
}
```

#### 2. Improved Token Management

- Separate access and refresh tokens
- Configurable token expiration
- Token refresh mechanism
- Future support for token revocation

#### 3. Better Pagination

**v1 Format:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**v2 Format:**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 4. Response Headers

All v2 responses include:

- `X-API-Version` - API version used
- `X-API-Latest-Version` - Latest available version
- `X-API-Deprecated` - If version is deprecated
- `X-API-Sunset` - Sunset date if applicable
- `X-API-Migration-Guide` - URL to migration guide

### Deprecations

Currently, no endpoints are deprecated in v2. All v1 endpoints remain available.

### Bug Fixes

- Improved error messages for validation failures
- Better handling of concurrent requests
- Fixed race conditions in session management

---

## Version 1 (v1)

**Released:** 2024-01-01
**Status:** Supported
**Stability:** Stable

### Overview

Initial API version with core functionality for RemoteDevAI platform.

### Features

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - User logout

#### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `GET /api/v1/users/statistics` - User statistics
- `DELETE /api/v1/users/account` - Delete account

#### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project
- `POST /api/v1/projects/:id/archive` - Archive project
- `POST /api/v1/projects/:id/unarchive` - Unarchive project
- `GET /api/v1/projects/:id/statistics` - Project statistics

#### Sessions
- Session management endpoints
- Real-time collaboration via WebSocket

#### Recordings
- Recording storage and retrieval
- Playback functionality

#### Payments
- Stripe integration
- Subscription management

#### Webhooks
- Stripe webhook handling
- Event notifications

#### Relay
- Relay service endpoints

---

## Migration Guides

### Migrating from v1 to v2

#### 1. Update Authentication Flow

**Before (v1):**
```typescript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();
const token = data.token;

// Use token in subsequent requests
fetch('/api/v1/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**After (v2):**
```typescript
const response = await fetch('/api/v2/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();
const { accessToken, refreshToken, expiresIn } = data;

// Store both tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Use access token
fetch('/api/v2/users/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Refresh token when expired
async function refreshAccessToken() {
  const response = await fetch('/api/v2/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });

  const { data } = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
}
```

#### 2. Update Error Handling

**Before (v1):**
```typescript
try {
  const response = await fetch('/api/v1/projects');
  const data = await response.json();

  if (!data.success) {
    console.error(data.error); // String
  }
} catch (error) {
  console.error(error);
}
```

**After (v2):**
```typescript
try {
  const response = await fetch('/api/v2/projects');
  const data = await response.json();

  if (!data.success) {
    const { code, message, details } = data.error; // Object

    switch (code) {
      case 'AUTH_INVALID_TOKEN':
        // Handle authentication error
        break;
      case 'VALIDATION_ERROR':
        // Handle validation error
        break;
      default:
        console.error(message);
    }
  }
} catch (error) {
  console.error(error);
}
```

#### 3. Update Pagination Handling

**Before (v1):**
```typescript
const { data, total, page, limit } = response;

const hasNext = (page * limit) < total;
const totalPages = Math.ceil(total / limit);
```

**After (v2):**
```typescript
const { data, pagination } = response;

// All metadata available in pagination object
const { total, page, limit, totalPages, hasNext, hasPrev } = pagination;
```

---

## Version Support Policy

### Support Lifecycle

- **Supported**: Receives bug fixes and security updates
- **Deprecated**: No new features, only critical bug fixes
- **Sunset**: End of life, no longer supported

### Current Status

| Version | Status | Released | Deprecated | Sunset |
|---------|--------|----------|------------|--------|
| v2 | Supported | 2024-06-01 | - | - |
| v1 | Supported | 2024-01-01 | - | - |

### Deprecation Policy

When a version is deprecated:

1. **Announcement**: 90 days notice via changelog and email
2. **Deprecation Period**: 180 days minimum before sunset
3. **Headers**: All responses include deprecation headers
4. **Migration Guide**: Detailed guide provided
5. **Support**: Bug fixes for critical issues only

### Sunset Policy

When a version is sunset:

1. **Final Notice**: 30 days before sunset
2. **End of Life**: Version no longer accessible
3. **Error Response**: 426 Upgrade Required
4. **Forced Upgrade**: Clients must upgrade to supported version

---

## Breaking Changes Policy

We minimize breaking changes, but when necessary:

1. **Major Version**: Breaking changes only in major versions
2. **Documentation**: All breaking changes documented
3. **Migration Path**: Clear upgrade path provided
4. **Deprecation First**: Features deprecated before removal
5. **Backward Compatibility**: Maintained where possible

---

## Feature Requests

Have a feature request or found a bug? Please:

1. Check existing issues on GitHub
2. Submit detailed issue with use case
3. Join our community discussions
4. Contribute via pull request

---

## API Versioning Strategy

### URL-based Versioning

Primary method: `/api/v1/...`, `/api/v2/...`

### Header-based Versioning

Alternative: `Accept-Version: v1` or `Accept-Version: 1`

### Default Version

Unversioned routes (`/api/...`) map to latest stable version (currently v2)

### Version Detection Priority

1. URL path (`/api/v1/...`)
2. `Accept-Version` header
3. Default version (v2)

---

## Additional Resources

- [API Documentation](./API.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Authentication Guide](./AUTH.md)
- [Error Codes Reference](./ERROR_CODES.md)
- [Rate Limiting](./RATE_LIMITING.md)

---

**Last Updated:** 2024-06-01
**Changelog Version:** 1.0
