/**
 * Custom Error Classes with Sentry Integration
 *
 * These error classes automatically integrate with Sentry for error tracking.
 * They provide structured error handling with custom context and tags.
 */

export interface ErrorContext {
  [key: string]: any;
}

export interface ErrorTags {
  [key: string]: string | number | boolean;
}

/**
 * Base TrackedError class
 *
 * All custom errors should extend this class to ensure
 * proper Sentry integration and context tracking.
 */
export class TrackedError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly tags: ErrorTags;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      context?: ErrorContext;
      tags?: ErrorTags;
      isOperational?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.context = options.context || {};
    this.tags = options.tags || {};
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date();

    // Attach cause if provided (Error cause proposal)
    if (options.cause) {
      (this as any).cause = options.cause;
    }
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      tags: this.tags,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Get Sentry scope configuration for this error
   */
  getSentryScope(): {
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    tags: ErrorTags;
    contexts: { error_details: ErrorContext };
  } {
    return {
      level: this.statusCode >= 500 ? 'error' : 'warning',
      tags: {
        error_code: this.code,
        error_name: this.name,
        ...this.tags,
      },
      contexts: {
        error_details: {
          statusCode: this.statusCode,
          isOperational: this.isOperational,
          timestamp: this.timestamp.toISOString(),
          ...this.context,
        },
      },
    };
  }
}

/**
 * Authentication/Authorization Errors
 */
export class AuthenticationError extends TrackedError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super(message, {
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
      context,
      tags: { error_type: 'authentication' },
    });
  }
}

export class AuthorizationError extends TrackedError {
  constructor(message: string = 'Insufficient permissions', context?: ErrorContext) {
    super(message, {
      statusCode: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      context,
      tags: { error_type: 'authorization' },
    });
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends TrackedError {
  public readonly fields: Record<string, string[]>;

  constructor(message: string, fields: Record<string, string[]> = {}, context?: ErrorContext) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      context: { ...context, fields },
      tags: { error_type: 'validation' },
    });
    this.fields = fields;
  }
}

/**
 * Resource Errors
 */
export class NotFoundError extends TrackedError {
  constructor(resource: string, identifier?: string, context?: ErrorContext) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, {
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND',
      context: { ...context, resource, identifier },
      tags: { error_type: 'not_found', resource },
    });
  }
}

export class ConflictError extends TrackedError {
  constructor(message: string, context?: ErrorContext) {
    super(message, {
      statusCode: 409,
      code: 'RESOURCE_CONFLICT',
      context,
      tags: { error_type: 'conflict' },
    });
  }
}

/**
 * Rate Limiting Errors
 */
export class RateLimitError extends TrackedError {
  constructor(retryAfter?: number, context?: ErrorContext) {
    super('Rate limit exceeded', {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      context: { ...context, retryAfter },
      tags: { error_type: 'rate_limit' },
    });
  }
}

/**
 * External Service Errors
 */
export class ExternalServiceError extends TrackedError {
  constructor(service: string, message: string, context?: ErrorContext) {
    super(`External service error: ${service} - ${message}`, {
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      context: { ...context, service },
      tags: { error_type: 'external_service', service },
      isOperational: true, // External errors are usually operational
    });
  }
}

/**
 * Database Errors
 */
export class DatabaseError extends TrackedError {
  constructor(message: string, operation: string, context?: ErrorContext) {
    super(message, {
      statusCode: 500,
      code: 'DATABASE_ERROR',
      context: { ...context, operation },
      tags: { error_type: 'database', operation },
    });
  }
}

/**
 * Configuration Errors
 */
export class ConfigurationError extends TrackedError {
  constructor(message: string, context?: ErrorContext) {
    super(message, {
      statusCode: 500,
      code: 'CONFIGURATION_ERROR',
      context,
      tags: { error_type: 'configuration' },
      isOperational: false, // Config errors are not operational
    });
  }
}

/**
 * Payment Errors
 */
export class PaymentError extends TrackedError {
  constructor(message: string, paymentProvider?: string, context?: ErrorContext) {
    super(message, {
      statusCode: 402,
      code: 'PAYMENT_ERROR',
      context: { ...context, paymentProvider },
      tags: { error_type: 'payment', provider: paymentProvider || 'unknown' },
    });
  }
}

/**
 * Subscription Errors
 */
export class SubscriptionError extends TrackedError {
  constructor(message: string, context?: ErrorContext) {
    super(message, {
      statusCode: 403,
      code: 'SUBSCRIPTION_ERROR',
      context,
      tags: { error_type: 'subscription' },
    });
  }
}

/**
 * AI/Agent Errors
 */
export class AIServiceError extends TrackedError {
  constructor(message: string, provider: string, context?: ErrorContext) {
    super(message, {
      statusCode: 503,
      code: 'AI_SERVICE_ERROR',
      context: { ...context, provider },
      tags: { error_type: 'ai_service', provider },
    });
  }
}

export class AgentError extends TrackedError {
  constructor(message: string, agentType: string, context?: ErrorContext) {
    super(message, {
      statusCode: 500,
      code: 'AGENT_ERROR',
      context: { ...context, agentType },
      tags: { error_type: 'agent', agent_type: agentType },
    });
  }
}

/**
 * Session Errors
 */
export class SessionError extends TrackedError {
  constructor(message: string, context?: ErrorContext) {
    super(message, {
      statusCode: 500,
      code: 'SESSION_ERROR',
      context,
      tags: { error_type: 'session' },
    });
  }
}

/**
 * Utility function to check if an error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof TrackedError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Utility function to convert any error to TrackedError
 */
export function toTrackedError(error: unknown): TrackedError {
  if (error instanceof TrackedError) {
    return error;
  }

  if (error instanceof Error) {
    return new TrackedError(error.message, {
      statusCode: 500,
      code: 'UNKNOWN_ERROR',
      context: {
        originalName: error.name,
        originalStack: error.stack,
      },
      cause: error,
    });
  }

  return new TrackedError('An unknown error occurred', {
    statusCode: 500,
    code: 'UNKNOWN_ERROR',
    context: {
      originalError: String(error),
    },
  });
}

export default TrackedError;
