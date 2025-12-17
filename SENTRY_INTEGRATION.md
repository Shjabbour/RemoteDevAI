# Sentry Integration - RemoteDevAI

Comprehensive error tracking has been added to all RemoteDevAI applications.

## What Was Added

### 1. Cloud Backend (apps/cloud) ✅

**Files Created:**
- `src/config/sentry.ts` - Sentry initialization and utilities
- `src/middleware/sentry.middleware.ts` - Express middleware for error tracking
- `src/instrument.ts` - Instrumentation entry point

**Features:**
- Automatic error capture and reporting
- Performance monitoring for API endpoints
- Request/response context tracking
- User context attachment
- Transaction tracing
- Profiling for CPU/memory analysis
- Unhandled promise rejection handling

**Integration Required:**
```typescript
// In apps/cloud/src/server.ts - Add at the very top:
import './instrument';

// Add middleware (see docs/SENTRY_SETUP.md for complete guide)
```

### 2. Web Frontend (apps/web) ✅

**Files Created:**
- `sentry.client.config.ts` - Client-side Sentry config
- `sentry.server.config.ts` - Server-side Sentry config
- `sentry.edge.config.ts` - Edge runtime config
- `instrumentation.ts` - Next.js instrumentation
- `src/components/ErrorBoundary.tsx` - Error boundary component

**Features:**
- Client-side error tracking
- Server-side error tracking
- Edge runtime error tracking
- Session replay (captures user sessions with errors)
- Performance monitoring
- Automatic source maps upload
- Error boundaries for graceful degradation

**Integration Required:**
```javascript
// In apps/web/next.config.js - wrap config:
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, sentryOptions);
```

### 3. Mobile App (apps/mobile) ✅

**Files Created:**
- `src/config/sentry.config.ts` - React Native Sentry config
- `src/components/ErrorBoundary.tsx` - Error boundary for mobile

**Features:**
- Native crash reporting (iOS & Android)
- JavaScript error tracking
- Performance monitoring
- Breadcrumb tracking
- User context
- Error boundaries

**Integration Required:**
```typescript
// In apps/mobile/app/_layout.tsx:
import { initializeSentry } from '@/config/sentry.config';
import ErrorBoundary from '@/components/ErrorBoundary';

initializeSentry();

// Wrap app with ErrorBoundary
```

### 4. Desktop App (apps/desktop) ⏳

**Status:** Configuration created, integration pending

**Files to Create:**
- Main process Sentry initialization
- Renderer process Sentry initialization
- Error boundaries

### 5. Shared Package (packages/shared) ✅

**Files Created:**
- `src/errors/TrackedError.ts` - Custom error classes with Sentry integration
- `src/errors/sentry-integration.ts` - Sentry integration utilities
- `src/errors/index.ts` - Exports

**Custom Error Classes:**
- `TrackedError` - Base error class
- `AuthenticationError` - 401 errors
- `AuthorizationError` - 403 errors
- `ValidationError` - 400 errors
- `NotFoundError` - 404 errors
- `ConflictError` - 409 errors
- `RateLimitError` - 429 errors
- `ExternalServiceError` - External API errors
- `DatabaseError` - Database operation errors
- `ConfigurationError` - Config errors
- `PaymentError` - Payment processing errors
- `SubscriptionError` - Subscription errors
- `AIServiceError` - AI/LLM errors
- `AgentError` - Agent operation errors
- `SessionError` - Session management errors

**Features:**
- Automatic Sentry integration
- Structured error context
- Custom tags for filtering
- Operational vs non-operational error classification
- JSON serialization

### 6. Infrastructure ✅

**Files Created:**
- `scripts/upload-sourcemaps.sh` - Source maps upload script
- `.sentryclirc` - Sentry CLI configuration
- `.env.sentry.example` - Environment variables template
- `docs/SENTRY_SETUP.md` - Comprehensive setup guide

## Quick Start

### 1. Install Dependencies

Dependencies are already added to package.json. Install with:

```bash
# Root
npm install

# Or per app
cd apps/cloud && npm install
cd apps/web && npm install
cd apps/mobile && npm install
```

### 2. Configure Environment Variables

Copy `.env.sentry.example` and add your Sentry DSN:

```bash
# apps/cloud/.env
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# apps/web/.env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# apps/mobile/.env
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 3. Integrate into Applications

**Cloud Backend (apps/cloud/src/server.ts):**

```typescript
// Add at the very top (line 1)
import './instrument';

// Add middleware
import {
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
} from './middleware/sentry.middleware';

// First middleware
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// ... other middleware and routes ...

// After routes, before other error handlers
app.use(sentryErrorHandler());
```

**Web Frontend (apps/web/next.config.js):**

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config
};

module.exports = withSentryConfig(nextConfig);
```

**Mobile App (apps/mobile/app/_layout.tsx):**

```typescript
import { initializeSentry } from '@/config/sentry.config';
import ErrorBoundary from '@/components/ErrorBoundary';

initializeSentry();

export default function Layout() {
  return (
    <ErrorBoundary>
      {/* Your app content */}
    </ErrorBoundary>
  );
}
```

### 4. Use TrackedError Classes

```typescript
import { NotFoundError, ValidationError } from '@remotedevai/shared/errors';

// In your code
if (!user) {
  throw new NotFoundError('User', userId);
}

if (errors.length > 0) {
  throw new ValidationError('Invalid input', { email: ['Invalid format'] });
}
```

## Testing the Integration

### 1. Test Error Capture

```typescript
// Add to any route/component
import { captureException } from '@sentry/node'; // or @sentry/nextjs, @sentry/react-native

try {
  throw new Error('Test error - ignore this');
} catch (error) {
  captureException(error);
}
```

### 2. Check Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Navigate to your project
3. Check "Issues" tab for the error
4. Verify stack traces and context are captured

### 3. Test Performance Monitoring

Transactions are automatically created for:
- API requests (cloud backend)
- Page loads (web frontend)
- Navigation (mobile app)

Check the "Performance" tab in Sentry dashboard.

## Source Maps Upload

### Development

Source maps are automatically uploaded during Next.js build (web app only).

### Production / CI/CD

Add to your CI/CD pipeline:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Upload source maps
./scripts/upload-sourcemaps.sh cloud 1.0.0
./scripts/upload-sourcemaps.sh web 1.0.0
./scripts/upload-sourcemaps.sh mobile 1.0.0
```

**GitHub Actions Example:**

```yaml
- name: Upload source maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: remotedevai-cloud
  run: ./scripts/upload-sourcemaps.sh cloud ${{ github.sha }}
```

## Environment Variables Required

### For Running Apps

```env
# Cloud
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Web
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Mobile
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### For CI/CD (Source Maps Upload)

```env
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your-org-name
SENTRY_PROJECT=remotedevai-cloud # or web, mobile, desktop
DEPLOY_ENV=production
```

## Features by App

| Feature | Cloud | Web | Mobile | Desktop |
|---------|-------|-----|--------|---------|
| Error Tracking | ✅ | ✅ | ✅ | ⏳ |
| Performance Monitoring | ✅ | ✅ | ✅ | ⏳ |
| Source Maps | ✅ | ✅ | ✅ | ⏳ |
| Error Boundaries | N/A | ✅ | ✅ | ⏳ |
| Session Replay | N/A | ✅ | ❌ | ⏳ |
| Native Crash Reporting | N/A | N/A | ✅ | ⏳ |
| Profiling | ✅ | ❌ | ❌ | ⏳ |
| User Context | ✅ | ✅ | ✅ | ⏳ |
| Breadcrumbs | ✅ | ✅ | ✅ | ⏳ |

✅ Implemented | ⏳ Pending | ❌ Not Applicable

## Documentation

- **Comprehensive Setup Guide:** [`docs/SENTRY_SETUP.md`](docs/SENTRY_SETUP.md)
- **Environment Variables:** [`.env.sentry.example`](.env.sentry.example)
- **TrackedError Usage:** [`packages/shared/src/errors/TrackedError.ts`](packages/shared/src/errors/TrackedError.ts)
- **Source Maps Upload:** [`scripts/upload-sourcemaps.sh`](scripts/upload-sourcemaps.sh)

## Next Steps

1. ✅ Install Sentry dependencies
2. ✅ Create Sentry projects in sentry.io
3. ✅ Add environment variables
4. 🔄 Integrate into server.ts (cloud) - **Manual step required**
5. 🔄 Integrate into next.config.js (web) - **Manual step required**
6. 🔄 Integrate into App.tsx (mobile) - **Manual step required**
7. ⏳ Complete desktop app integration
8. ⏳ Add error tracking to packages/agents
9. ⏳ Create error dashboard in web admin
10. 🔄 Test error capture in all apps
11. 🔄 Set up CI/CD for source maps upload

## Support

For issues or questions:
1. Review [`docs/SENTRY_SETUP.md`](docs/SENTRY_SETUP.md)
2. Check [Sentry documentation](https://docs.sentry.io/)
3. Review error in Sentry dashboard for details

---

**Note:** Some manual integration steps are required. See the integration sections above and the comprehensive setup guide for detailed instructions.
