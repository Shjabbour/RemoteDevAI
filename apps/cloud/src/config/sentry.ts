import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import config from './index';

/**
 * Initialize Sentry error tracking and performance monitoring
 *
 * Features:
 * - Error tracking with stack traces
 * - Performance monitoring for API endpoints
 * - Request/response context capture
 * - User context tracking
 * - Environment-specific configuration
 * - Release tracking for versioning
 * - Profiling for performance analysis
 */
export function initializeSentry(): void {
  // Only initialize if DSN is provided
  if (!config.sentryDsn) {
    console.log('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,

    // Environment identification
    environment: config.nodeEnv,

    // Release tracking (use git commit hash or version)
    release: process.env.SENTRY_RELEASE || `remotedevai-cloud@${process.env.npm_package_version || '1.0.0'}`,

    // Performance Monitoring
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling (CPU and memory)
    profilesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // Enable HTTP instrumentation
      new Sentry.Integrations.Http({ tracing: true }),

      // Enable Express instrumentation
      new Sentry.Integrations.Express({
        app: undefined // Will be set via setupExpressErrorHandler
      }),

      // Enable profiling
      new ProfilingIntegration(),

      // Prisma instrumentation (if available)
      ...(config.nodeEnv !== 'test' ? [
        new Sentry.Integrations.Prisma({ client: undefined }),
      ] : []),
    ],

    // Configure which errors to capture
    ignoreErrors: [
      // Ignore common non-actionable errors
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED',
      // Ignore validation errors (handled by our middleware)
      'ValidationError',
      'ZodError',
    ],

    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,

    // Maximum breadcrumbs to capture
    maxBreadcrumbs: 50,

    // Attach stack trace to messages
    attachStacktrace: true,

    // Send default PII (Personally Identifiable Information)
    sendDefaultPii: false, // Set to false for privacy

    // Before send hook - sanitize sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive environment variables
      if (event.contexts?.runtime?.node) {
        const env = (event.contexts.runtime as any).env;
        if (env) {
          delete env.DATABASE_URL;
          delete env.JWT_SECRET;
          delete env.STRIPE_SECRET_KEY;
          delete env.CLERK_SECRET_KEY;
          delete env.S3_SECRET_ACCESS_KEY;
        }
      }

      return event;
    },

    // Before breadcrumb hook - filter sensitive data
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out sensitive console logs
      if (breadcrumb.category === 'console' && breadcrumb.message) {
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /secret/i,
          /api[_-]?key/i,
        ];

        for (const pattern of sensitivePatterns) {
          if (pattern.test(breadcrumb.message)) {
            breadcrumb.message = '[REDACTED]';
          }
        }
      }

      return breadcrumb;
    },
  });

  console.log(`✓ Sentry initialized - Environment: ${config.nodeEnv}, Release: ${Sentry.getCurrentHub().getClient()?.getOptions().release}`);
}

/**
 * Capture exception with additional context
 *
 * @param error - Error to capture
 * @param context - Additional context data
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
 *
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
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
 * Set user context for error tracking
 *
 * @param user - User information
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 *
 * @param breadcrumb - Breadcrumb data
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
 *
 * @param name - Transaction name
 * @param op - Operation type
 * @returns Transaction instance
 */
export function startTransaction(name: string, op: string = 'http.server'): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
}

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
  Sentry,
};
