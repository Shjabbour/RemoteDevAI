/**
 * Error classes and utilities for RemoteDevAI
 *
 * All errors exported from this module integrate with Sentry
 * for automatic error tracking and reporting.
 */

export {
  TrackedError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  PaymentError,
  SubscriptionError,
  AIServiceError,
  AgentError,
  SessionError,
  isOperationalError,
  toTrackedError,
  type ErrorContext,
  type ErrorTags,
} from './TrackedError';

export { captureTrackedError, setupErrorHandler } from './sentry-integration';
