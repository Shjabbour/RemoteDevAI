# API Versioning System

This directory contains the complete API versioning infrastructure for RemoteDevAI.

---

## Overview

The versioning system provides:

- **Version Detection** - Automatic detection from URL or headers
- **Version Validation** - Ensures clients use supported versions
- **Deprecation Management** - Tracks and warns about deprecated endpoints
- **Compatibility Checking** - Validates client compatibility
- **Response Transformation** - Transforms responses between versions
- **Migration Tools** - Automated migration assistance

---

## Architecture

```
versioning/
├── versions.ts           # Version definitions and metadata
├── index.ts             # Main versioning logic and exports
├── transformer.ts       # Response transformation between versions
├── deprecation.ts       # Deprecation tracking and warnings
└── compatibility.ts     # Client compatibility checking

middleware/
└── version.middleware.ts # Express middleware for version handling

routes/
├── v1/                  # API v1 routes
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   └── ...
└── v2/                  # API v2 routes
    ├── auth.routes.ts   # Enhanced auth (different from v1)
    └── index.ts         # Uses v1 routes for unchanged endpoints
```

---

## Core Modules

### 1. versions.ts

Defines all API versions, their metadata, and lifecycle information.

```typescript
import {
  VERSIONS,
  LATEST_VERSION,
  DEFAULT_VERSION,
  isValidVersion,
  isVersionDeprecated,
  isVersionSunset
} from './versions';

// Get version metadata
const v1Meta = getVersionMetadata('v1');
console.log(v1Meta.released, v1Meta.deprecated, v1Meta.sunset);

// Check version status
if (isVersionDeprecated('v1')) {
  console.log('v1 is deprecated');
}
```

### 2. index.ts

Main versioning logic for detection and validation.

```typescript
import { detectVersion, validateVersion } from './versioning';

// Detect version from request
const detection = detectVersion(req);
console.log(detection.version, detection.source, detection.isDeprecated);

// Validate version
const validation = validateVersion('v2');
if (validation.valid) {
  // Use version
}
```

### 3. transformer.ts

Transforms responses between API versions.

```typescript
import {
  transformAuthResponse,
  transformUserResponse,
  transformPaginatedResponse
} from './versioning/transformer';

// Transform auth response for v1 client
const v1Response = transformAuthResponse(data, 'v1');
// { user, token }

// Transform auth response for v2 client
const v2Response = transformAuthResponse(data, 'v2');
// { user, accessToken, refreshToken, tokenType, expiresIn }
```

### 4. deprecation.ts

Manages deprecated endpoints and adds warnings.

```typescript
import {
  markDeprecated,
  deprecationMiddleware,
  getDeprecatedEndpoints
} from './versioning/deprecation';

// Mark endpoint as deprecated
markDeprecated('/api/v1/old-endpoint', {
  deprecatedIn: 'v1',
  sunsetDate: '2025-12-31',
  reason: 'Replaced with new endpoint',
  alternative: '/api/v2/new-endpoint',
  migrationGuide: '/docs/migrations/old-to-new',
});

// Use middleware
app.use(deprecationMiddleware);
```

### 5. compatibility.ts

Validates client version compatibility.

```typescript
import {
  checkCompatibility,
  compatibilityMiddleware
} from './versioning/compatibility';

// Check client compatibility
const result = checkCompatibility({
  version: 'v1',
  sdkVersion: '1.2.3',
});

console.log(result.compatible, result.warnings, result.upgradeRequired);

// Use middleware
app.use(compatibilityMiddleware);
```

---

## Middleware

### version.middleware.ts

Express middleware for version handling.

```typescript
import {
  versionMiddleware,
  versionMiddlewareStack,
  enforceMinVersion,
  addDeprecationWarnings
} from './middleware/version.middleware';

// Apply version detection and warnings
app.use('/api', ...versionMiddlewareStack());

// Require minimum version for specific endpoint
app.post('/api/advanced', enforceMinVersion('v2'), handler);

// Add deprecation warnings to responses
app.use(addDeprecationWarnings);
```

---

## Usage Examples

### Server Setup

```typescript
import { versionMiddlewareStack } from './middleware/version.middleware';
import { compatibilityMiddleware } from './versioning/compatibility';
import { deprecationMiddleware } from './versioning/deprecation';
import v1Routes from './routes/v1';
import v2Routes from './routes/v2';

// Apply versioning middleware
app.use('/api', ...versionMiddlewareStack());
app.use('/api', compatibilityMiddleware);
app.use('/api', deprecationMiddleware);

// Mount versioned routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// Default to latest version
app.use('/api', v2Routes);
```

### Client Usage

```typescript
// URL-based versioning (recommended)
fetch('/api/v2/projects');

// Header-based versioning
fetch('/api/projects', {
  headers: { 'Accept-Version': 'v2' }
});

// Check response headers
response.headers.get('X-API-Version');           // v2
response.headers.get('X-API-Latest-Version');    // v2
response.headers.get('X-API-Deprecated');        // false
```

### Custom Version Detection

```typescript
import { extractVersionFromUrl, extractVersionFromHeader } from './versioning';

const urlVersion = extractVersionFromUrl('/api/v2/projects');    // 'v2'
const headerVersion = extractVersionFromHeader('v2');            // 'v2'
const headerVersion2 = extractVersionFromHeader('2');            // 'v2'
```

---

## Adding a New Version

### Step 1: Define Version

```typescript
// versioning/versions.ts
export const VERSIONS: Record<string, VersionMetadata> = {
  v1: { ... },
  v2: { ... },
  v3: {  // New version
    released: '2025-01-01',
    deprecated: null,
    sunset: null,
    description: 'Next generation API',
    changes: [
      'GraphQL support',
      'Real-time subscriptions',
      'Enhanced security',
    ],
  },
};

export const VERSION_ORDER = ['v1', 'v2', 'v3'] as const;
```

### Step 2: Create Routes

```bash
mkdir apps/cloud/src/routes/v3
cp apps/cloud/src/routes/v2/* apps/cloud/src/routes/v3/
```

### Step 3: Add Transformers

```typescript
// versioning/transformer.ts
export function transformAuthResponse(data: any, version: ApiVersion): any {
  if (version === 'v1') { ... }
  if (version === 'v2') { ... }
  if (version === 'v3') {
    // New v3 format
    return {
      user: data.user,
      tokens: {
        access: data.accessToken,
        refresh: data.refreshToken,
      },
      metadata: {
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      },
    };
  }
}
```

### Step 4: Mount Routes

```typescript
// server.ts
import v3Routes from './routes/v3';

app.use('/api/v3', v3Routes);
```

### Step 5: Update SDK Types

```bash
mkdir packages/shared/src/api/v3
```

```typescript
// packages/shared/src/api/v3/types.ts
export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
  metadata: {
    issuedAt: number;
    expiresAt: number;
  };
}
```

---

## Deprecating a Version

### Step 1: Update Metadata

```typescript
// versioning/versions.ts
export const VERSIONS: Record<string, VersionMetadata> = {
  v1: {
    released: '2024-01-01',
    deprecated: '2025-01-01',      // Mark as deprecated
    sunset: '2025-06-30',          // Set sunset date
    description: 'Initial version',
  },
};
```

### Step 2: Announce

1. Update changelog
2. Send email notifications
3. Update documentation
4. Add migration guide

### Step 3: Monitor

```typescript
// Track usage of deprecated version
app.use((req, res, next) => {
  if (req.apiVersion === 'v1') {
    analytics.track('deprecated_version_usage', {
      version: 'v1',
      endpoint: req.path,
      userId: req.user?.id,
    });
  }
  next();
});
```

### Step 4: Sunset

When sunset date is reached, the version automatically returns 426 Upgrade Required.

---

## Response Headers

All API responses include:

| Header | Description |
|--------|-------------|
| `X-API-Version` | Version used for request |
| `X-API-Latest-Version` | Latest available version |
| `X-API-Deprecated` | If version is deprecated |
| `Deprecation` | Deprecation date (RFC 8594) |
| `Sunset` | Sunset date (RFC 8594) |
| `X-API-Sunset-Days` | Days until sunset |
| `X-API-Migration-Guide` | Migration guide URL |
| `X-API-Compatible` | Client compatibility status |
| `X-API-Upgrade-Required` | If upgrade is required |
| `X-API-Upgrade-Recommended` | If upgrade is recommended |

---

## Testing

### Unit Tests

```typescript
import { detectVersion, validateVersion } from './versioning';

describe('Version Detection', () => {
  it('should detect version from URL', () => {
    const req = { path: '/api/v2/projects' };
    const result = detectVersion(req);
    expect(result.version).toBe('v2');
    expect(result.source).toBe('url');
  });

  it('should detect version from header', () => {
    const req = {
      path: '/api/projects',
      get: (header) => header === 'Accept-Version' ? 'v2' : null,
    };
    const result = detectVersion(req);
    expect(result.version).toBe('v2');
    expect(result.source).toBe('header');
  });
});
```

### Integration Tests

```typescript
describe('Versioned Endpoints', () => {
  it('should return v1 format for v1 endpoint', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.body.data).toHaveProperty('token');
    expect(response.headers['x-api-version']).toBe('v1');
  });

  it('should return v2 format for v2 endpoint', async () => {
    const response = await request(app)
      .post('/api/v2/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.headers['x-api-version']).toBe('v2');
  });
});
```

---

## Troubleshooting

### Version Not Detected

**Problem:** API always uses default version

**Solution:**
1. Check URL path: `/api/v2/...` (not `/api/v2...`)
2. Check header format: `Accept-Version: v2` (lowercase 'v')
3. Verify middleware is applied: `app.use('/api', versionMiddleware)`

### Deprecation Warnings Not Showing

**Problem:** No deprecation warnings in responses

**Solution:**
1. Check version metadata has `deprecated` date set
2. Ensure deprecation middleware is applied
3. Verify deprecated date is in the past

### Transformation Not Working

**Problem:** Response format doesn't match version

**Solution:**
1. Check transformer is registered for endpoint
2. Verify version parameter is passed correctly
3. Add logging to transformer function

---

## Best Practices

1. **Always specify version** in URL path
2. **Never remove v1** while it's marked as supported
3. **Deprecate before removing** (minimum 90 days)
4. **Provide clear migration guides** for all breaking changes
5. **Monitor deprecated version usage** to plan sunset
6. **Test transformers** thoroughly for edge cases
7. **Keep v1 and v2 routes separate** for clarity
8. **Document all changes** in API_CHANGELOG.md

---

## Resources

- [API Changelog](../../../../docs/API_CHANGELOG.md)
- [Migration Guide](../../../../docs/MIGRATION_GUIDE.md)
- [API Versioning Guide](../../../../docs/API_VERSIONING.md)
- [Migration Script](../../../../scripts/migrate-api-v1-to-v2.ts)

---

**Maintained by:** RemoteDevAI Team
**Last Updated:** 2024-06-01
