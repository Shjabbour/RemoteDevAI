/**
 * API v2 Type Definitions
 *
 * Type definitions for API version 2 requests and responses
 * Includes enhancements and new features over v1
 */

/**
 * Common response structure (v2)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  _deprecation?: DeprecationWarning;
  _compatibility?: CompatibilityWarning;
}

/**
 * Enhanced error structure (v2)
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Deprecation warning
 */
export interface DeprecationWarning {
  deprecated: boolean;
  version: string;
  endpoint?: string;
  reason?: string;
  deprecatedIn?: string;
  sunsetDate?: string;
  daysUntilSunset?: number;
  alternative?: string;
  migrationGuide?: string;
  message?: string;
  fields?: FieldDeprecationWarning[];
}

/**
 * Field deprecation warning
 */
export interface FieldDeprecationWarning {
  field: string;
  deprecated: boolean;
  deprecatedIn: string;
  alternative?: string;
  reason?: string;
  sunsetDate?: string;
}

/**
 * Compatibility warning
 */
export interface CompatibilityWarning {
  warnings: string[];
  recommendations: string[];
  currentVersion: string;
  latestVersion: string;
  upgradeRecommended: boolean;
}

/**
 * Enhanced pagination (v2)
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Enhanced pagination metadata (v2)
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response (v2)
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// Authentication Types (v2)
// ============================================================================

/**
 * Login request (same as v1)
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request (same as v1)
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Enhanced auth response (v2)
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/**
 * Token refresh request (v2)
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Token refresh response (v2)
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/**
 * Verify email request
 */
export interface VerifyEmailRequest {
  token: string;
}

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ============================================================================
// User Types (v2)
// ============================================================================

/**
 * Enhanced user object (v2)
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  subscription?: UserSubscription;
}

/**
 * User subscription info
 */
export interface UserSubscription {
  active: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  expiresAt?: string;
}

/**
 * User permissions
 */
export type UserPermission = 'read' | 'write' | 'admin';

/**
 * Enhanced me response (v2)
 */
export interface MeResponse {
  user: User;
  permissions: UserPermission[];
  subscription: UserSubscription;
}

/**
 * Update profile request (same as v1)
 */
export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

/**
 * User statistics (same as v1)
 */
export interface UserStatistics {
  projectCount: number;
  sessionCount: number;
  recordingCount: number;
  storageUsed: number;
}

// ============================================================================
// Project Types (v2)
// ============================================================================

/**
 * Enhanced project object (v2)
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: ProjectMetadata;
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  tags?: string[];
  color?: string;
  icon?: string;
  settings?: Record<string, any>;
}

/**
 * Create project request (v2)
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  metadata?: ProjectMetadata;
}

/**
 * Update project request (v2)
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  metadata?: ProjectMetadata;
}

/**
 * Get projects request (same as v1)
 */
export interface GetProjectsRequest extends PaginationParams {
  includeArchived?: boolean;
}

/**
 * Project statistics (same as v1)
 */
export interface ProjectStatistics {
  sessionCount: number;
  recordingCount: number;
  totalDuration: number;
  lastActivity: string;
}

// ============================================================================
// Session Types (v2)
// ============================================================================

/**
 * Session object (same as v1)
 */
export interface Session {
  id: string;
  projectId: string;
  userId: string;
  status: 'active' | 'idle' | 'ended';
  startedAt: string;
  endedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Create session request (same as v1)
 */
export interface CreateSessionRequest {
  projectId: string;
  metadata?: Record<string, any>;
}

/**
 * Update session request (same as v1)
 */
export interface UpdateSessionRequest {
  status?: 'active' | 'idle' | 'ended';
  metadata?: Record<string, any>;
}

// ============================================================================
// Recording Types (v2)
// ============================================================================

/**
 * Recording object (same as v1)
 */
export interface Recording {
  id: string;
  sessionId: string;
  projectId: string;
  userId: string;
  duration: number;
  size: number;
  url: string;
  createdAt: string;
}

/**
 * Get recordings request (same as v1)
 */
export interface GetRecordingsRequest extends PaginationParams {
  projectId?: string;
  sessionId?: string;
}

// ============================================================================
// Payment Types (v2)
// ============================================================================

/**
 * Subscription plan (same as v1)
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

/**
 * Create checkout session request (same as v1)
 */
export interface CreateCheckoutSessionRequest {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Checkout session response (same as v1)
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if response is error
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiResponse & { success: false; error: ApiError } {
  return response.success === false && response.error !== undefined;
}

/**
 * Check if response has deprecation warning
 */
export function hasDeprecationWarning(
  response: ApiResponse
): response is ApiResponse & { _deprecation: DeprecationWarning } {
  return response._deprecation?.deprecated === true;
}

/**
 * Check if response has compatibility warning
 */
export function hasCompatibilityWarning(
  response: ApiResponse
): response is ApiResponse & { _compatibility: CompatibilityWarning } {
  return (
    response._compatibility !== undefined &&
    response._compatibility.warnings.length > 0
  );
}

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Standard error codes
 */
export enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Version errors
  VERSION_INVALID = 'VERSION_INVALID',
  VERSION_DEPRECATED = 'VERSION_DEPRECATED',
  VERSION_SUNSET = 'VERSION_SUNSET',
  VERSION_INCOMPATIBLE = 'VERSION_INCOMPATIBLE',
}
