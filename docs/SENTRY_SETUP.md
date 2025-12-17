# Sentry Error Tracking Setup Guide

Comprehensive guide for setting up Sentry error tracking across all RemoteDevAI applications.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Configuration by App](#configuration-by-app)
- [Usage Examples](#usage-examples)
- [Source Maps Upload](#source-maps-upload)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

RemoteDevAI uses Sentry for comprehensive error tracking across:

- **apps/cloud** - Express.js backend (Node.js)
- **apps/web** - Next.js frontend
- **apps/mobile** - React Native (Expo)
- **apps/desktop** - Electron
- **packages/agents** - AI agent services
- **packages/shared** - Shared error classes

## Prerequisites

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new organization or use existing
3. Create projects for each application:
   - `remotedevai-cloud` (Node.js)
   - `remotedevai-web` (Next.js)
   - `remotedevai-mobile` (React Native)
   - `remotedevai-desktop` (Electron)
4. Get your DSN (Data Source Name) for each project
5. Generate an Auth Token for source maps upload

## Environment Variables

### Required for All Apps

Add these to your `.env` file(s):

#### apps/cloud/.env

```env
# Sentry Configuration
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_RELEASE=1.0.0
SENTRY_ENVIRONMENT=production

# Optional: Send errors in development
SENTRY_IN_DEV=false
```

#### apps/web/.env.local

```env
# Sentry Configuration (Next.js)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_RELEASE=1.0.0

# Optional: Send errors in development
NEXT_PUBLIC_SENTRY_IN_DEV=false

# Auth token for source maps (DO NOT COMMIT)
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your-org-name
SENTRY_PROJECT=remotedevai-web
```

#### apps/mobile/.env

```env
# Sentry Configuration (Expo/React Native)
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
EXPO_PUBLIC_SENTRY_RELEASE=1.0.0

# Optional: Send errors in development
EXPO_PUBLIC_SENTRY_IN_DEV=false
```

#### apps/desktop/.env

```env
# Sentry Configuration (Electron)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_RELEASE=1.0.0
```

### CI/CD Environment Variables

Add these to your CI/CD pipeline (GitHub Actions, etc.):

```env
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your-org-name
SENTRY_PROJECT=remotedevai-cloud  # or web, mobile, desktop
DEPLOY_ENV=production  # or staging, development
```

## Installation

### 1. Install Sentry CLI (for source maps)

```bash
npm install -g @sentry/cli
```

### 2. Install Dependencies

Dependencies are already added to package.json files. If you need to add them manually:

#### Cloud Backend

```bash
cd apps/cloud
npm install @sentry/node @sentry/profiling-node --save
```

#### Web (Next.js)

```bash
cd apps/web
npm install @sentry/nextjs --save
```

#### Mobile (React Native)

```bash
cd apps/mobile
npm install @sentry/react-native --save
```

#### Desktop (Electron)

```bash
cd apps/desktop
npm install @sentry/electron --save
```

## Configuration by App

### apps/cloud (Express Backend)

**1. Update server.ts**

Add at the very beginning of `apps/cloud/src/server.ts`:

```typescript
// THIS MUST BE FIRST - before any other imports
import './instrument';

// Rest of your imports...
import express from 'express';
// ...
```

**2. Add Sentry middleware**

In `apps/cloud/src/server.ts`, add middleware in this order:

```typescript
import {
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  customErrorHandler,
  performanceMonitoring,
} from './middleware/sentry.middleware';

// MUST be first middleware
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());
app.use(performanceMonitoring);

// ... other middleware (helmet, cors, body-parser, etc.)

// ... routes ...

// MUST be after routes but before other error handlers
app.use(sentryErrorHandler());
app.use(customErrorHandler);
```

**3. Use TrackedError in your code**

```typescript
import { NotFoundError, ValidationError } from '@remotedevai/shared/errors';

// In route handlers
if (!user) {
  throw new NotFoundError('User', userId);
}

if (errors.length > 0) {
  throw new ValidationError('Invalid input', { email: ['Invalid format'] });
}
```

### apps/web (Next.js)

**1. Update next.config.js**

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config...
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

const sentryOptions = {
  // Upload source maps during production build
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
};

module.exports = withSentryConfig(
  nextConfig,
  sentryWebpackPluginOptions,
  sentryOptions
);
```

**2. Wrap your app with ErrorBoundary**

```typescript
// app/layout.tsx or pages/_app.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**3. Enable instrumentation**

Ensure `instrumentation.ts` exists in the root of your web app (already created).

### apps/mobile (React Native)

**1. Initialize Sentry in App.tsx**

```typescript
// app/_layout.tsx or App.tsx
import { initializeSentry } from '@/config/sentry.config';
import ErrorBoundary from '@/components/ErrorBoundary';

// Initialize Sentry
initializeSentry();

export default function App() {
  return (
    <ErrorBoundary>
      {/* Your app content */}
    </ErrorBoundary>
  );
}
```

**2. Configure Metro for source maps**

```javascript
// metro.config.js
module.exports = {
  // ... existing config
  transformer: {
    // Generate source maps
    unstable_allowRequireContext: true,
  },
};
```

### apps/desktop (Electron)

**1. Main Process (apps/desktop/src/main/main.ts)**

```typescript
import * as Sentry from '@sentry/electron/main';

// Initialize Sentry for main process
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: app.getVersion(),
});

// Capture uncaught errors
process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
});
```

**2. Renderer Process (apps/desktop/src/renderer/index.tsx)**

```typescript
import * as Sentry from '@sentry/electron/renderer';

// Initialize Sentry for renderer
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## Usage Examples

### Capturing Errors

```typescript
import { captureException, captureMessage } from '@/config/sentry';

try {
  // Some operation
  throw new Error('Something went wrong');
} catch (error) {
  captureException(error as Error, {
    userId: user.id,
    action: 'create_project',
  });
}

// Log important events
captureMessage('User upgraded subscription', 'info', {
  userId: user.id,
  plan: 'pro',
});
```

### Using TrackedError

```typescript
import {
  NotFoundError,
  ValidationError,
  AuthenticationError,
} from '@remotedevai/shared/errors';

// Throw tracked errors (automatically captured by Sentry)
if (!isAuthenticated) {
  throw new AuthenticationError('Please log in');
}

if (!project) {
  throw new NotFoundError('Project', projectId);
}

if (!isValid) {
  throw new ValidationError('Invalid data', {
    name: ['Name is required'],
    email: ['Invalid email format'],
  });
}
```

### Setting User Context

```typescript
import { setUser } from '@/config/sentry';

// After user login
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// After logout
setUser(null);
```

### Adding Breadcrumbs

```typescript
import { addBreadcrumb } from '@/config/sentry';

addBreadcrumb({
  message: 'User started voice session',
  category: 'user-action',
  level: 'info',
  data: {
    sessionId: session.id,
    projectId: project.id,
  },
});
```

### Performance Monitoring

```typescript
import { startTransaction } from '@/config/sentry';

const transaction = startTransaction('expensive-operation', 'task');

try {
  // Perform operation
  await processLargeDataset();

  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

## Source Maps Upload

### Manual Upload

```bash
# Upload source maps for cloud backend
./scripts/upload-sourcemaps.sh cloud 1.0.0

# Upload for web app
./scripts/upload-sourcemaps.sh web 1.0.0

# Upload for mobile
./scripts/upload-sourcemaps.sh mobile 1.0.0

# Upload for desktop
./scripts/upload-sourcemaps.sh desktop 1.0.0
```

### Automated Upload (CI/CD)

Add to your GitHub Actions workflow:

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build application
        run: npm run build

      - name: Upload source maps to Sentry
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: remotedevai-cloud
          DEPLOY_ENV: production
        run: |
          chmod +x ./scripts/upload-sourcemaps.sh
          ./scripts/upload-sourcemaps.sh cloud ${{ github.sha }}
```

## Best Practices

### 1. Environment-Specific Configuration

- **Development**: Set sample rate to 1.0 (100% of events)
- **Production**: Set sample rate to 0.1 (10% of events) to reduce quota usage
- Use `SENTRY_IN_DEV=false` to disable Sentry in development (optional)

### 2. Error Handling

```typescript
// ✅ Good: Use TrackedError for known errors
throw new NotFoundError('User', userId);

// ❌ Bad: Generic Error
throw new Error('User not found');

// ✅ Good: Add context to errors
captureException(error, {
  userId: user.id,
  action: 'delete_project',
  projectId: project.id,
});

// ❌ Bad: No context
captureException(error);
```

### 3. PII (Personally Identifiable Information)

- NEVER log passwords, tokens, or API keys
- Use `sendDefaultPii: false` in Sentry config
- Filter sensitive data in `beforeSend` hook (already configured)
- Use `beforeBreadcrumb` to sanitize console logs (already configured)

### 4. Performance Monitoring

- Keep `tracesSampleRate` low in production (0.1 = 10%)
- Use transactions for critical operations only
- Don't create transactions for every function call

### 5. Release Tracking

- Use semantic versioning (e.g., 1.0.0)
- Include git commit hash in releases
- Associate commits with releases for better debugging

## Troubleshooting

### Events not appearing in Sentry

1. **Check DSN**: Ensure `SENTRY_DSN` is correctly set
2. **Check environment**: Verify `SENTRY_IN_DEV` is not blocking events
3. **Check network**: Ensure your firewall allows connections to sentry.io
4. **Check console**: Look for Sentry initialization logs

### Source maps not working

1. **Verify upload**: Check Sentry dashboard for uploaded source maps
2. **Check release**: Ensure release name matches between app and upload
3. **Check auth token**: Verify `SENTRY_AUTH_TOKEN` has correct permissions
4. **Run upload script**: Manually run upload script to see errors

### High quota usage

1. **Reduce sample rates**: Lower `tracesSampleRate` and `replaysSessionSampleRate`
2. **Filter errors**: Add more patterns to `ignoreErrors` array
3. **Use beforeSend**: Filter unnecessary events in `beforeSend` hook
4. **Set up quotas**: Configure rate limits in Sentry dashboard

### Errors not grouping correctly

1. **Use TrackedError**: Provides consistent error codes for grouping
2. **Set fingerprints**: Use `setFingerprint` for custom grouping
3. **Check stack traces**: Ensure source maps are uploaded correctly

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/node/)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry React Native Guide](https://docs.sentry.io/platforms/react-native/)
- [Sentry Electron Guide](https://docs.sentry.io/platforms/javascript/guides/electron/)

## Support

For issues or questions:
1. Check this documentation
2. Review Sentry dashboard for error details
3. Check application logs
4. Contact the development team
