/**
 * Sentry Client-Side Configuration for Next.js
 *
 * This file configures Sentry for the browser/client-side.
 * It will be automatically imported by the Sentry Next.js plugin.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || `remotedevai-web@${process.env.npm_package_version || '1.0.0'}`,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

  // Session Replay (optional - captures user sessions)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Trace all navigation/route changes
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        // @ts-ignore
        React.useEffect,
        // @ts-ignore
        window.location,
        // @ts-ignore
        window.history
      ),
    }),
    new Sentry.Replay({
      // Mask all text content
      maskAllText: true,
      // Block all media (images, videos, etc.)
      blockAllMedia: true,
    }),
  ],

  // Configure which errors to capture
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    // Network errors
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User actions
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
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
    // Remove sensitive headers and data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_IN_DEV) {
      console.log('[Sentry] Event captured (not sent in dev):', event);
      return null;
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

    // Filter out navigation to sensitive URLs
    if (breadcrumb.category === 'navigation') {
      const url = breadcrumb.data?.to || breadcrumb.data?.from;
      if (url && /\/api\//.test(url)) {
        breadcrumb.data = { ...breadcrumb.data, to: '[REDACTED]', from: '[REDACTED]' };
      }
    }

    return breadcrumb;
  },
});
