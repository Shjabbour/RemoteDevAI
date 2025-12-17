/**
 * Sentry Integration for TrackedError
 *
 * This module provides utilities to capture TrackedErrors in Sentry
 * with proper context, tags, and severity levels.
 */

import { TrackedError } from './TrackedError';

// Type-safe Sentry interface (works with both @sentry/node and @sentry/react-native)
interface SentryClient {
  captureException(exception: any, captureContext?: any): string;
  withScope(callback: (scope: any) => void): void;
}

let sentryClient: SentryClient | null = null;

/**
 * Setup error handler with Sentry client
 *
 * Call this during application initialization to enable Sentry integration
 *
 * @param client - Sentry client instance
 *
 * Example (Node.js):
 *   import * as Sentry from '@sentry/node';
 *   setupErrorHandler(Sentry);
 *
 * Example (React Native):
 *   import * as Sentry from '@sentry/react-native';
 *   setupErrorHandler(Sentry);
 */
export function setupErrorHandler(client: SentryClient): void {
  sentryClient = client;
}

/**
 * Capture a TrackedError in Sentry with full context
 *
 * This function automatically:
 * - Sets appropriate severity level
 * - Adds custom tags from the error
 * - Includes error context
 * - Marks operational vs non-operational errors
 *
 * @param error - TrackedError instance
 * @param additionalContext - Additional context to include
 * @returns Sentry event ID
 *
 * Example:
 *   try {
 *     throw new NotFoundError('User', userId);
 *   } catch (error) {
 *     captureTrackedError(error as TrackedError, {
 *       requestId: req.id,
 *       userId: req.user?.id,
 *     });
 *   }
 */
export function captureTrackedError(
  error: TrackedError,
  additionalContext?: Record<string, any>
): string | null {
  if (!sentryClient) {
    console.warn('[Sentry] Error handler not setup. Call setupErrorHandler() first.');
    console.error('TrackedError:', error.toJSON());
    return null;
  }

  let eventId: string | null = null;

  sentryClient.withScope((scope: any) => {
    // Get Sentry scope configuration from error
    const scopeConfig = error.getSentryScope();

    // Set severity level
    scope.setLevel(scopeConfig.level);

    // Add tags
    Object.entries(scopeConfig.tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });

    // Add contexts
    Object.entries(scopeConfig.contexts).forEach(([key, value]) => {
      scope.setContext(key, value);
    });

    // Add additional context if provided
    if (additionalContext) {
      scope.setContext('additional', additionalContext);
    }

    // Add fingerprint for grouping similar errors
    scope.setFingerprint([
      error.code,
      error.name,
      error.message,
    ]);

    // Capture the exception
    eventId = sentryClient!.captureException(error);
  });

  return eventId;
}

/**
 * Capture any error (will convert to TrackedError if needed)
 *
 * @param error - Any error instance
 * @param additionalContext - Additional context to include
 * @returns Sentry event ID
 */
export function captureError(
  error: Error,
  additionalContext?: Record<string, any>
): string | null {
  if (!sentryClient) {
    console.warn('[Sentry] Error handler not setup. Call setupErrorHandler() first.');
    console.error('Error:', error);
    return null;
  }

  if (error instanceof TrackedError) {
    return captureTrackedError(error, additionalContext);
  }

  // For non-TrackedError errors, capture directly
  let eventId: string | null = null;

  sentryClient.withScope((scope: any) => {
    scope.setLevel('error');
    scope.setTag('error_type', 'untracked');

    if (additionalContext) {
      scope.setContext('additional', additionalContext);
    }

    eventId = sentryClient!.captureException(error);
  });

  return eventId;
}

export default {
  setupErrorHandler,
  captureTrackedError,
  captureError,
};
