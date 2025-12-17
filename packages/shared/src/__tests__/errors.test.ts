/**
 * Tests for error classes and error utilities
 */

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  QuotaExceededError,
  ExternalServiceError,
  DatabaseError,
  createError,
  isOperationalError,
  createValidationError,
  handleError,
  assert,
  assertDefined,
  ERROR_CODES
} from '../utils/errors';

describe('error classes', () => {
  describe('AppError', () => {
    it('should create an app error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create an app error with custom values', () => {
      const error = new AppError(
        'Custom error',
        'CUSTOM_CODE',
        400,
        false,
        { extra: 'data' }
      );
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ extra: 'data' });
    });

    it('should have a proper stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an authentication error', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
      expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message and details', () => {
      const error = new AuthenticationError('Invalid token', { token: 'abc' });
      expect(error.message).toBe('Invalid token');
      expect(error.details).toEqual({ token: 'abc' });
    });
  });

  describe('AuthorizationError', () => {
    it('should create an authorization error', () => {
      const error = new AuthorizationError();
      expect(error.message).toBe('Access forbidden');
      expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError();
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
    });

    it('should accept field errors', () => {
      const error = new ValidationError('Invalid fields', {
        fields: ['email', 'password']
      });
      expect(error.details).toEqual({ fields: ['email', 'password'] });
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError();
      expect(error.message).toBe('Resource conflict');
      expect(error.code).toBe(ERROR_CODES.RESOURCE_CONFLICT);
      expect(error.statusCode).toBe(409);
    });
  });

  describe('RateLimitError', () => {
    it('should create a rate limit error', () => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
    });
  });

  describe('QuotaExceededError', () => {
    it('should create a quota exceeded error', () => {
      const error = new QuotaExceededError();
      expect(error.message).toBe('Quota exceeded');
      expect(error.code).toBe(ERROR_CODES.QUOTA_EXCEEDED);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an external service error', () => {
      const error = new ExternalServiceError();
      expect(error.message).toBe('External service error');
      expect(error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(error.statusCode).toBe(502);
    });

    it('should include service name', () => {
      const error = new ExternalServiceError('API failed', 'StripeAPI');
      expect(error.details).toEqual({ serviceName: 'StripeAPI' });
    });
  });

  describe('DatabaseError', () => {
    it('should create a database error', () => {
      const error = new DatabaseError();
      expect(error.message).toBe('Database error');
      expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });
});

describe('error utilities', () => {
  describe('createError', () => {
    it('should create standardized error from AppError', () => {
      const appError = new ValidationError('Invalid input', { field: 'email' });
      const error = createError(appError);

      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create standardized error from Error', () => {
      const normalError = new Error('Something went wrong');
      const error = createError(normalError);

      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
    });

    it('should create standardized error from unknown', () => {
      const error = createError('some string');

      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.message).toBe('An unknown error occurred');
      expect(error.statusCode).toBe(500);
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = createError(new Error('Test'));
      expect(error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = createError(new Error('Test'));
      expect(error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new ValidationError();
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational errors', () => {
      const error = new DatabaseError();
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for normal errors', () => {
      const error = new Error('Test');
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for unknown errors', () => {
      expect(isOperationalError('string')).toBe(false);
      expect(isOperationalError(null)).toBe(false);
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with field errors', () => {
      const error = createValidationError([
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ]);

      expect(error.message).toBe('Validation failed');
      expect(error.details.fieldErrors).toHaveLength(2);
      expect(error.details.fieldErrors[0]).toEqual({
        field: 'email',
        message: 'Invalid email'
      });
    });
  });

  describe('handleError', () => {
    it('should handle AppError', () => {
      const appError = new ValidationError('Invalid input');
      const response = handleError(appError);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(response.error.message).toBe('Invalid input');
    });

    it('should handle normal Error', () => {
      const error = new Error('Test error');
      const response = handleError(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(response.error.message).toBe('Test error');
    });

    it('should include stack trace when requested', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test');
      const response = handleError(error, true);
      expect(response.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude stack trace by default', () => {
      const error = new Error('Test');
      const response = handleError(error, false);
      expect(response.error.stack).toBeUndefined();
    });
  });

  describe('assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => {
        assert(true, new ValidationError('Test'));
      }).not.toThrow();
    });

    it('should throw when condition is false', () => {
      expect(() => {
        assert(false, new ValidationError('Test'));
      }).toThrow(ValidationError);
    });

    it('should throw the provided error', () => {
      const error = new NotFoundError('User not found');
      expect(() => {
        assert(false, error);
      }).toThrow('User not found');
    });
  });

  describe('assertDefined', () => {
    it('should not throw when value is defined', () => {
      expect(() => {
        assertDefined('value');
      }).not.toThrow();

      expect(() => {
        assertDefined(0);
      }).not.toThrow();

      expect(() => {
        assertDefined(false);
      }).not.toThrow();
    });

    it('should throw when value is null', () => {
      expect(() => {
        assertDefined(null);
      }).toThrow(ValidationError);
    });

    it('should throw when value is undefined', () => {
      expect(() => {
        assertDefined(undefined);
      }).toThrow(ValidationError);
    });

    it('should throw with custom message', () => {
      expect(() => {
        assertDefined(null, 'User is required');
      }).toThrow('User is required');
    });
  });
});
