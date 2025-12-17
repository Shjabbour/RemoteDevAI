# API Versioning Guide

This document describes the API versioning system for RemoteDevAI.

---

## Table of Contents

1. [Overview](#overview)
2. [Version Detection](#version-detection)
3. [Using Versions](#using-versions)
4. [Response Headers](#response-headers)
5. [Deprecation Policy](#deprecation-policy)
6. [Client SDK](#client-sdk)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Overview

RemoteDevAI uses semantic API versioning to ensure backward compatibility and smooth migrations.

### Supported Versions

| Version | Status | Released | Deprecated | Sunset | Support Level |
|---------|--------|----------|------------|--------|---------------|
| v2 | Current | 2024-06-01 | - | - | Full support |
| v1 | Supported | 2024-01-01 | - | - | Maintenance |

### Versioning Strategy

We use **URL-based versioning** as the primary method, with **header-based versioning** as an alternative.

**URL-based (Recommended):**
```
GET /api/v1/projects
GET /api/v2/projects
```

**Header-based (Alternative):**
```
GET /api/projects
Accept-Version: v2
```

---

## Version Detection

The API detects versions in the following priority order:

1. **URL Path** - `/api/v1/...`, `/api/v2/...`
2. **Accept-Version Header** - `Accept-Version: v2`
3. **Default Version** - Falls back to v2 (latest)

### Examples

```bash
# Using URL (recommended)
curl https://api.remotedevai.com/api/v2/projects

# Using header
curl https://api.remotedevai.com/api/projects \
  -H "Accept-Version: v2"

# Default (uses v2)
curl https://api.remotedevai.com/api/projects
```

---

## Using Versions

### Version Headers in Requests

You can specify version in two ways:

#### 1. URL Path (Recommended)

```typescript
fetch('https://api.remotedevai.com/api/v2/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});
```

#### 2. Accept-Version Header

```typescript
fetch('https://api.remotedevai.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': 'v2', // or just "2"
  },
  body: JSON.stringify({ email, password }),
});
```

---

## Response Headers

All API responses include version-related headers:

### Standard Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-API-Version` | Version used for this request | `v2` |
| `X-API-Latest-Version` | Latest available version | `v2` |
| `X-API-Compatible` | Whether client version is compatible | `true` |
| `X-API-Minimum-Version` | Minimum supported version | `v1` |

### Deprecation Headers

When using a deprecated version or endpoint:

| Header | Description | Example |
|--------|-------------|---------|
| `X-API-Deprecated` | Whether version is deprecated | `true` |
| `Deprecation` | Deprecation date (RFC 8594) | `2024-12-31` |
| `Sunset` | End-of-life date (RFC 8594) | `2025-06-30` |
| `X-API-Sunset-Days` | Days until sunset | `180` |
| `X-API-Migration-Guide` | URL to migration guide | `/docs/migrations/v1-to-v2` |

### Compatibility Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-API-Upgrade-Required` | Whether upgrade is required | `false` |
| `X-API-Upgrade-Recommended` | Whether upgrade is recommended | `true` |

### Example Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: v1
X-API-Latest-Version: v2
X-API-Deprecated: true
X-API-Sunset-Days: 90
X-API-Migration-Guide: /docs/migrations/v1-to-v2
X-API-Upgrade-Recommended: true

{
  "success": true,
  "data": { ... },
  "_deprecation": {
    "deprecated": true,
    "version": "v1",
    "message": "API version v1 is deprecated. Please upgrade to v2.",
    "sunsetDate": "2025-06-30",
    "daysUntilSunset": 90,
    "migrationGuide": "/docs/migrations/v1-to-v2"
  }
}
```

---

## Deprecation Policy

### Lifecycle Stages

1. **Supported** - Full support with new features
2. **Deprecated** - Maintenance only, no new features
3. **Sunset** - End of life, no longer accessible

### Deprecation Process

When a version is marked deprecated:

1. **Announcement** (T-180 days)
   - Public announcement via changelog
   - Email notification to registered developers
   - Deprecation headers in responses

2. **Deprecation Period** (T-90 to T-0 days)
   - All requests include deprecation warnings
   - `Sunset` header shows end-of-life date
   - Migration guide published

3. **Sunset Warning** (T-30 days)
   - Urgent warnings in responses
   - Final email notification
   - Rate limiting for deprecated version

4. **Sunset** (T-0)
   - Version returns 426 Upgrade Required
   - Clients must upgrade

### Timeline Example

```
Day 0:   Version released
Day 180: Deprecation announced
Day 270: Sunset warning (30 days)
Day 300: Version sunset (end of life)
```

---

## Client SDK

### TypeScript Types

Use version-specific types from the shared package:

```typescript
// API v1 types
import {
  User,
  Project,
  AuthResponse,
  ApiResponse,
} from '@remotedevai/shared/api/v1';

// API v2 types
import {
  User,
  Project,
  AuthResponse,
  ApiResponse,
  ErrorCode,
} from '@remotedevai/shared/api/v2';
```

### Type Guards

```typescript
import { isSuccessResponse, isErrorResponse } from '@remotedevai/shared/api/v2';

const response = await fetch('/api/v2/projects');
const data = await response.json();

if (isSuccessResponse(data)) {
  // TypeScript knows data.data exists
  console.log(data.data);
}

if (isErrorResponse(data)) {
  // TypeScript knows data.error exists
  console.error(data.error.code, data.error.message);
}
```

### Deprecation Warnings

Check for deprecation warnings in responses:

```typescript
import { hasDeprecationWarning } from '@remotedevai/shared/api/v2';

const response = await fetch('/api/v1/projects');
const data = await response.json();

if (hasDeprecationWarning(data)) {
  console.warn('API version deprecated:', data._deprecation);
  console.warn('Migrate to:', data._deprecation.alternative);
  console.warn('Days until sunset:', data._deprecation.daysUntilSunset);
}
```

---

## Best Practices

### For API Consumers

1. **Always specify version** in URL path
   ```typescript
   // Good
   fetch('/api/v2/projects')

   // Avoid (relies on default)
   fetch('/api/projects')
   ```

2. **Monitor deprecation warnings**
   ```typescript
   const checkDeprecation = (response) => {
     const deprecated = response.headers.get('X-API-Deprecated');
     if (deprecated === 'true') {
       const daysUntilSunset = response.headers.get('X-API-Sunset-Days');
       console.warn(`API deprecated. ${daysUntilSunset} days until sunset.`);
     }
   };
   ```

3. **Use TypeScript types** for version safety
   ```typescript
   import type { User } from '@remotedevai/shared/api/v2';

   const user: User = await apiClient.get('/auth/me');
   ```

4. **Handle version errors**
   ```typescript
   try {
     await fetch('/api/v1/projects');
   } catch (error) {
     if (error.status === 426) {
       // Upgrade Required
       alert('Please update the app');
     }
   }
   ```

5. **Test migrations early**
   - Don't wait until sunset
   - Test in staging environment
   - Run migration tool on codebase

### For API Developers

1. **Never break v1** while it's supported
2. **Deprecate before removing** (minimum 90 days)
3. **Provide migration guides** for all breaking changes
4. **Maintain backward compatibility** where possible
5. **Version response transformers** carefully

---

## Examples

### Complete Client Implementation

```typescript
class ApiClient {
  private version: 'v1' | 'v2' = 'v2';
  private baseUrl = 'https://api.remotedevai.com';

  constructor(version: 'v1' | 'v2' = 'v2') {
    this.version = version;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/${this.version}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check deprecation
    this.checkDeprecation(response);

    // Check compatibility
    this.checkCompatibility(response);

    const data = await response.json();

    if (!data.success) {
      throw new ApiError(data.error);
    }

    return data.data;
  }

  private checkDeprecation(response: Response) {
    const deprecated = response.headers.get('X-API-Deprecated');
    if (deprecated === 'true') {
      const sunsetDays = response.headers.get('X-API-Sunset-Days');
      const migrationGuide = response.headers.get('X-API-Migration-Guide');

      console.warn(
        `⚠️  API version ${this.version} is deprecated.`,
        sunsetDays ? `${sunsetDays} days until sunset.` : '',
        migrationGuide ? `Migration guide: ${migrationGuide}` : ''
      );
    }
  }

  private checkCompatibility(response: Response) {
    const upgradeRequired = response.headers.get('X-API-Upgrade-Required');
    if (upgradeRequired === 'true') {
      throw new Error('API version upgrade required');
    }

    const upgradeRecommended = response.headers.get('X-API-Upgrade-Recommended');
    if (upgradeRecommended === 'true') {
      const latest = response.headers.get('X-API-Latest-Version');
      console.info(`💡 Upgrade recommended to ${latest}`);
    }
  }
}

// Usage
const client = new ApiClient('v2');
const projects = await client.request('/projects');
```

### Handling Version-Specific Logic

```typescript
import * as v1 from '@remotedevai/shared/api/v1';
import * as v2 from '@remotedevai/shared/api/v2';

class ProjectService {
  constructor(private version: 'v1' | 'v2') {}

  async getProjects(): Promise<v1.Project[] | v2.Project[]> {
    const endpoint = `/api/${this.version}/projects`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (this.version === 'v1') {
      // v1: flat structure
      return data.data as v1.Project[];
    } else {
      // v2: pagination structure
      return data.data as v2.Project[];
    }
  }
}
```

---

## Additional Resources

- [API Changelog](./API_CHANGELOG.md) - All changes between versions
- [Migration Guide](./MIGRATION_GUIDE.md) - Step-by-step migration
- [API Reference](./API.md) - Complete API documentation
- [Error Codes](./ERROR_CODES.md) - All error codes reference

---

## Version Support Matrix

| Feature | v1 | v2 |
|---------|----|----|
| Basic Auth | ✅ | ✅ |
| Refresh Tokens | ❌ | ✅ |
| Structured Errors | ❌ | ✅ |
| Enhanced Pagination | ❌ | ✅ |
| Email Verification | ❌ | 🚧 Planned |
| 2FA | ❌ | 🚧 Planned |
| Webhooks | ✅ | ✅ |
| WebSocket | ✅ | ✅ |
| File Uploads | ✅ | ✅ |

Legend:
- ✅ Available
- ❌ Not available
- 🚧 Planned/In development

---

**Last Updated:** 2024-06-01
