/**
 * API v1 Type Definitions
 *
 * Type definitions for API version 1 requests and responses
 */

/**
 * Common response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Auth response (v1)
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  token: string;
}

// ============================================================================
// User Types
// ============================================================================

/**
 * User object (v1)
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

/**
 * User statistics
 */
export interface UserStatistics {
  projectCount: number;
  sessionCount: number;
  recordingCount: number;
  storageUsed: number;
}

// ============================================================================
// Project Types
// ============================================================================

/**
 * Project object (v1)
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create project request
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

/**
 * Update project request
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

/**
 * Get projects request
 */
export interface GetProjectsRequest extends PaginationParams {
  includeArchived?: boolean;
}

/**
 * Project statistics
 */
export interface ProjectStatistics {
  sessionCount: number;
  recordingCount: number;
  totalDuration: number;
  lastActivity: string;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session object (v1)
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
 * Create session request
 */
export interface CreateSessionRequest {
  projectId: string;
  metadata?: Record<string, any>;
}

/**
 * Update session request
 */
export interface UpdateSessionRequest {
  status?: 'active' | 'idle' | 'ended';
  metadata?: Record<string, any>;
}

// ============================================================================
// Recording Types
// ============================================================================

/**
 * Recording object (v1)
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
 * Get recordings request
 */
export interface GetRecordingsRequest extends PaginationParams {
  projectId?: string;
  sessionId?: string;
}

// ============================================================================
// Payment Types
// ============================================================================

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
}

/**
 * Create checkout session request
 */
export interface CreateCheckoutSessionRequest {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error (v1)
 */
export interface ApiError {
  success: false;
  error: string;
  message: string;
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
  return response.success === true;
}

/**
 * Check if response is error
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiError {
  return response.success === false;
}
