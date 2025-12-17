import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Initialize Sentry for React Native / Expo
 *
 * Features:
 * - Error tracking with stack traces
 * - Performance monitoring
 * - Native crash reporting
 * - Breadcrumb tracking
 * - User context
 * - Release tracking
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initializeSentry(): void {
  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: __DEV__ ? 'development' : 'production',

    // Release tracking
    release: Constants.expoConfig?.version || '1.0.0',
    dist: Constants.expoConfig?.android?.versionCode?.toString() ||
          Constants.expoConfig?.ios?.buildNumber ||
          '1',

    // Enable native crash handling
    enableNative: true,
    enableNativeNagger: __DEV__, // Only warn about native issues in dev

    // Performance Monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in prod

    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        // Tracing options
        tracingOrigins: ['localhost', /^\//, /^https:\/\//],
        routingInstrumentation: new Sentry.ReactNativeNavigationInstrumentation(),
      }),
    ],

    // Configure which errors to capture
    ignoreErrors: [
      // Ignore common non-actionable errors
      'Network request failed',
      'Request aborted',
      'Timeout',
      // Expo-specific errors that can be ignored
      'Invariant Violation',
      'Warning: ',
    ],

    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,

    // Maximum breadcrumbs
    maxBreadcrumbs: 50,

    // Attach stack trace to messages
    attachStacktrace: true,

    // Send default PII
    sendDefaultPii: false,

    // Auto session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30 seconds

    // Before send hook - sanitize sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Don't send events in development if desired
      if (__DEV__ && !process.env.EXPO_PUBLIC_SENTRY_IN_DEV) {
        console.log('[Sentry] Event captured (not sent in dev):', event);
        return null;
      }

      return event;
    },

    // Before breadcrumb hook - filter sensitive data
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out sensitive console logs
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

  console.log(`[Sentry] Initialized - Environment: ${__DEV__ ? 'development' : 'production'}`);
}

/**
 * Capture exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  return Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture message with level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string {
  return Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string = 'navigation'): Sentry.Transaction | undefined {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Wrap a component with Sentry error boundary
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Get Sentry instance for advanced usage
 */
export { Sentry };

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  ErrorBoundary,
  Sentry,
};
