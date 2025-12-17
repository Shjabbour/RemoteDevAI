/**
 * Sentry Server-Side Configuration for Next.js
 *
 * This file configures Sentry for the server-side (Node.js).
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
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

  // Integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  // Configure which errors to capture
  ignoreErrors: [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED',
  ],

  // Sample rate for error events
  sampleRate: 1.0,

  // Maximum breadcrumbs
  maxBreadcrumbs: 50,

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
      delete event.request.headers['x-api-key'];
    }

    // Remove sensitive environment variables
    if (event.contexts?.runtime) {
      const env = (event.contexts.runtime as any).env;
      if (env) {
        delete env.DATABASE_URL;
        delete env.JWT_SECRET;
        delete env.CLERK_SECRET_KEY;
        delete env.STRIPE_SECRET_KEY;
        delete env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      }
    }

    return event;
  },

  // Before breadcrumb hook - filter sensitive data
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter console logs with sensitive data
    if (breadcrumb.category === 'console') {
      const sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /api[_-]?key/i,
      ];

      if (breadcrumb.message) {
        for (const pattern of sensitivePatterns) {
          if (pattern.test(breadcrumb.message)) {
            breadcrumb.message = '[REDACTED]';
          }
        }
      }
    }

    return breadcrumb;
  },
});
