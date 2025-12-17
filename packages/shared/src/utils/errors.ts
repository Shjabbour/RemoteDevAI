/**
 * Custom error classes and error utilities
 */

import { ERROR_CODES, HTTP_STATUS } from './constants';

/**
 * Error codes enum (re-exported from constants)
 */
export { ERROR_CODES };

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(
      message,
      ERROR_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      true,
      details
    );
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access forbidden', details?: any) {
    super(
      message,
      ERROR_CODES.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN,
      true,
      details
    );
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(
      message,
      ERROR_CODES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST,
      true,
      details
    );
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(
      message,
      ERROR_CODES.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      true,
      details
    );
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(
      message,
      ERROR_CODES.RESOURCE_CONFLICT,
      HTTP_STATUS.CONFLICT,
      true,
      details
    );
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(
      message,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      true,
      details
    );
  }
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends AppError {
  constructor(message: string = 'Quota exceeded', details?: any) {
    super(
      message,
      ERROR_CODES.QUOTA_EXCEEDED,
      HTTP_STATUS.FORBIDDEN,
      true,
      details
    );
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = 'External service error',
    serviceName?: string,
    details?: any
  ) {
    super(
      message,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      HTTP_STATUS.BAD_GATEWAY,
      true,
      { serviceName, ...details }
    );
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', details?: any) {
    super(
      message,
      ERROR_CODES.DATABASE_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      false,
      details
    );
  }
}

/**
 * Creates a standardized error object
 *
 * @param error - Error to standardize
 * @returns Standardized error object
 *
 * @example
 * const error = createError(new Error('Something went wrong'));
 */
export function createError(error: Error | AppError | unknown): {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  stack?: string;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An unknown error occurred',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
  };
}

/**
 * Checks if an error is operational (expected) or programmer error
 *
 * @param error - Error to check
 * @returns True if operational, false otherwise
 */
export function isOperationalError(error: Error | AppError | unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Creates a validation error with field errors
 *
 * @param fieldErrors - Array of field errors
 * @returns ValidationError
 *
 * @example
 * const error = createValidationError([
 *   { field: 'email', message: 'Invalid email' },
 *   { field: 'password', message: 'Too short' }
 * ]);
 */
export function createValidationError(
  fieldErrors: { field: string; message: string }[]
): ValidationError {
  const message = 'Validation failed';
  return new ValidationError(message, { fieldErrors });
}

/**
 * Wraps an async function with error handling
 *
 * @param fn - Async function to wrap
 * @returns Wrapped function
 *
 * @example
 * const safeFunction = catchAsync(async (req, res) => {
 *   // Your code here
 * });
 */
export function catchAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>) => {
    try {
      await fn(...args);
    } catch (error) {
      // Re-throw to be handled by error middleware
      throw error;
    }
  };
}

/**
 * Error handler middleware helper
 *
 * @param error - Error to handle
 * @param includeStack - Whether to include stack trace
 * @returns Error response object
 */
export function handleError(
  error: Error | AppError | unknown,
  includeStack: boolean = false
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
} {
  const standardizedError = createError(error);

  return {
    success: false,
    error: {
      code: standardizedError.code,
      message: standardizedError.message,
      details: standardizedError.details,
      stack: includeStack ? standardizedError.stack : undefined
    }
  };
}

/**
 * Logs an error with proper formatting
 *
 * @param error - Error to log
 * @param context - Additional context
 */
export function logError(error: Error | AppError | unknown, context?: any): void {
  const standardizedError = createError(error);

  console.error('[ERROR]', {
    code: standardizedError.code,
    message: standardizedError.message,
    statusCode: standardizedError.statusCode,
    details: standardizedError.details,
    context,
    stack: standardizedError.stack,
    timestamp: new Date().toISOString()
  });
}

/**
 * Asserts a condition and throws an error if false
 *
 * @param condition - Condition to check
 * @param error - Error to throw if condition is false
 *
 * @example
 * assert(user !== null, new NotFoundError('User not found'));
 */
export function assert(
  condition: boolean,
  error: AppError | Error
): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Asserts a value is defined (not null or undefined)
 *
 * @param value - Value to check
 * @param message - Error message
 *
 * @example
 * assertDefined(user, 'User not found');
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is required'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
}
