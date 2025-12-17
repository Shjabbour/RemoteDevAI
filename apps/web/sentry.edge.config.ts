/**
 * Sentry Edge Runtime Configuration for Next.js
 *
 * This file configures Sentry for the Edge Runtime (Middleware, Edge API Routes).
 * It will be automatically imported by the Sentry Next.js plugin.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.SENTRY_RELEASE || `remotedevai-web@${process.env.npm_package_version || '1.0.0'}`,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Sample rate for error events
  sampleRate: 1.0,

  // Maximum breadcrumbs
  maxBreadcrumbs: 30, // Lower for edge runtime

  // Attach stack trace to messages
  attachStacktrace: true,

  // Send default PII
  sendDefaultPii: false,

  // Before send hook - sanitize sensitive data
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    return event;
  },
});
