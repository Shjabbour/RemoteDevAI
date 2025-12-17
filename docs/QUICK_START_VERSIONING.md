# Quick Start: API Versioning

Get started with the RemoteDevAI versioned API in 5 minutes.

---

## For API Consumers

### 1. Install SDK (if using TypeScript)

```bash
npm install @remotedevai/shared
```

### 2. Choose Your Version

```typescript
// Option A: URL-based (Recommended)
fetch('https://api.remotedevai.com/api/v2/projects')

// Option B: Header-based
fetch('https://api.remotedevai.com/api/projects', {
  headers: { 'Accept-Version': 'v2' }
})
```

### 3. Use TypeScript Types

```typescript
import { ApiV2 } from '@remotedevai/shared';

// Use v2 types
const response = await fetch('/api/v2/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const data: ApiV2.ApiResponse<ApiV2.AuthResponse> = await response.json();

if (ApiV2.isSuccessResponse(data)) {
  const { accessToken, refreshToken } = data.data;
  // Store tokens
}
```

### 4. Handle Deprecation Warnings

```typescript
const response = await fetch('/api/v1/projects');

// Check headers
if (response.headers.get('X-API-Deprecated') === 'true') {
  const daysUntilSunset = response.headers.get('X-API-Sunset-Days');
  console.warn(`API will sunset in ${daysUntilSunset} days!`);
}
```

---

## For API Developers

### 1. Apply Versioning Middleware

```typescript
// server.ts
import { versionMiddlewareStack } from './middleware/version.middleware';
import { compatibilityMiddleware } from './versioning/compatibility';
import { deprecationMiddleware } from './versioning/deprecation';

// Apply to all API routes
app.use('/api', ...versionMiddlewareStack());
app.use('/api', compatibilityMiddleware);
app.use('/api', deprecationMiddleware);
```

### 2. Mount Versioned Routes

```typescript
import v1Routes from './routes/v1';
import v2Routes from './routes/v2';

// Versioned routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// Default to latest
app.use('/api', v2Routes);
```

### 3. Create Version-Specific Routes

```typescript
// routes/v2/auth.routes.ts
router.post('/login', async (req, res) => {
  const result = await AuthService.login(req.body);

  // v2 response format
  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  });
});
```

### 4. Add Response Transformers (Optional)

```typescript
import { transformAuthResponse } from './versioning/transformer';

const data = { user, accessToken, refreshToken };
const transformed = transformAuthResponse(data, req.apiVersion);
res.json({ success: true, data: transformed });
```

---

## Migration from v1 to v2

### 1. Run Migration Tool

```bash
npx ts-node scripts/migrate-api-v1-to-v2.ts ./src --auto-fix
```

### 2. Update Auth Code

```typescript
// Before (v1)
const { token } = response.data;
localStorage.setItem('token', token);

// After (v2)
const { accessToken, refreshToken } = response.data;
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### 3. Update Error Handling

```typescript
// Before (v1)
if (!response.success) {
  console.error(response.error); // string
}

// After (v2)
if (!response.success) {
  const { code, message } = response.error; // object
  console.error(code, message);
}
```

### 4. Update Pagination

```typescript
// Before (v1)
const { data, total, page, limit } = response;

// After (v2)
const { data, pagination } = response;
const { total, page, limit, hasNext } = pagination;
```

---

## Quick Reference

### Response Headers

| Header | Description |
|--------|-------------|
| `X-API-Version` | Version used (v1, v2) |
| `X-API-Latest-Version` | Latest available version |
| `X-API-Deprecated` | If version is deprecated |
| `X-API-Sunset-Days` | Days until end-of-life |

### Error Codes (v2)

```typescript
import { ApiV2 } from '@remotedevai/shared';

switch (error.code) {
  case ApiV2.ErrorCode.AUTH_INVALID_TOKEN:
    // Handle invalid token
    break;
  case ApiV2.ErrorCode.VALIDATION_ERROR:
    // Handle validation error
    break;
}
```

### Type Guards

```typescript
import { ApiV2 } from '@remotedevai/shared';

if (ApiV2.isSuccessResponse(response)) {
  // response.data is available
}

if (ApiV2.isErrorResponse(response)) {
  // response.error is available
}

if (ApiV2.hasDeprecationWarning(response)) {
  // response._deprecation is available
}
```

---

## Common Patterns

### Authenticated Request

```typescript
fetch('/api/v2/projects', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
```

### Token Refresh

```typescript
const response = await fetch('/api/v2/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken, refreshToken } = response.data;
// Update tokens
```

### Pagination

```typescript
const response = await fetch('/api/v2/projects?page=1&limit=10');
const { data, pagination } = response;

if (pagination.hasNext) {
  // Load next page
  fetch(`/api/v2/projects?page=${pagination.page + 1}&limit=10`);
}
```

---

## Resources

- **Full Documentation**: [API_VERSIONING.md](./API_VERSIONING.md)
- **Migration Guide**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Changelog**: [API_CHANGELOG.md](./API_CHANGELOG.md)
- **Client Example**: [examples/versioned-client.ts](./examples/versioned-client.ts)

---

## Need Help?

1. Check the [Migration Guide](./MIGRATION_GUIDE.md) for detailed examples
2. Run the migration tool: `scripts/migrate-api-v1-to-v2.ts`
3. Review the [complete example client](./examples/versioned-client.ts)
4. Open a GitHub issue

---

**Last Updated:** 2024-12-16
