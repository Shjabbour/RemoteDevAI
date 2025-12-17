import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { setUser, addBreadcrumb } from '../config/sentry';

/**
 * Sentry request handler middleware
 * Must be added BEFORE all routes
 *
 * This middleware:
 * - Creates a hub for each request
 * - Attaches request data to Sentry events
 * - Starts performance transaction
 */
export const sentryRequestHandler = () => {
  return Sentry.Handlers.requestHandler({
    // Include user data
    user: ['id', 'email', 'username'],

    // Include request data
    request: true,

    // Include transaction name
    transaction: 'methodPath', // e.g., "GET /api/projects"

    // Include IP address
    ip: false, // Set to false for privacy
  });
};

/**
 * Sentry tracing middleware
 * Adds performance monitoring for routes
 */
export const sentryTracingHandler = () => {
  return Sentry.Handlers.tracingHandler();
};

/**
 * Attach user context to Sentry
 * Use this middleware after authentication
 */
export const attachUserContext = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user from request (adjust based on your auth implementation)
    const user = (req as any).user;

    if (user) {
      setUser({
        id: user.id || user.userId,
        email: user.email,
        username: user.username || user.name,
      });

      // Add breadcrumb for user action
      addBreadcrumb({
        message: `User action: ${req.method} ${req.path}`,
        category: 'user-action',
        level: 'info',
        data: {
          userId: user.id || user.userId,
          method: req.method,
          path: req.path,
        },
      });
    }
  } catch (error) {
    // Don't fail the request if user context fails
    console.error('Failed to attach user context to Sentry:', error);
  }

  next();
};

/**
 * Sentry error handler middleware
 * Must be added AFTER all routes but BEFORE other error handlers
 *
 * This middleware:
 * - Captures errors and sends them to Sentry
 * - Attaches request context
 * - Does not modify the response
 */
export const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors by default
      // You can customize this to filter certain errors
      return true;
    },
  });
};

/**
 * Custom error handler that works with Sentry
 * Use this AFTER sentryErrorHandler
 */
export const customErrorHandler = (
  err: Error & { statusCode?: number; status?: number },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Add error context to Sentry
  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setContext('error_details', {
      statusCode,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
    });
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
  });
};

/**
 * Performance monitoring middleware
 * Tracks response time and adds it to Sentry
 */
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Add listener for response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Add breadcrumb with performance data
    addBreadcrumb({
      message: `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
      category: 'performance',
      level: duration > 1000 ? 'warning' : 'info',
      data: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      },
    });

    // Log slow requests
    if (duration > 2000) {
      Sentry.captureMessage(`Slow request: ${req.method} ${req.path} (${duration}ms)`, {
        level: 'warning',
        contexts: {
          performance: {
            duration,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        },
      });
    }
  });

  next();
};

/**
 * Transaction naming middleware
 * Provides better transaction names for parameterized routes
 */
export const transactionNaming = (req: Request, res: Response, next: NextFunction) => {
  // Get the route pattern if available
  const route = (req as any).route;
  if (route && route.path) {
    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (transaction) {
      transaction.setName(`${req.method} ${req.baseUrl}${route.path}`);
    }
  }

  next();
};

/**
 * Capture specific operation with custom context
 *
 * @param operation - Operation name
 * @param fn - Function to execute
 * @param context - Additional context
 */
export async function captureOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: 'operation',
    name: operation,
  });

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error, {
      contexts: {
        operation: {
          name: operation,
          ...context,
        },
      },
    });
    throw error;
  } finally {
    transaction.finish();
  }
}

export default {
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  customErrorHandler,
  attachUserContext,
  performanceMonitoring,
  transactionNaming,
  captureOperation,
};
