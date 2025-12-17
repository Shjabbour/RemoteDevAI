import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter configurations for different endpoint types
 */

/**
 * Strict rate limiter for authentication endpoints
 * - 10 requests per hour per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for webhook endpoints
    return req.path.includes('/webhooks/');
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'too_many_requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Relaxed rate limiter for read endpoints (GET requests)
 * - 100 requests per minute per IP
 */
export const readRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip for authenticated admin users
    const user = (req as any).user;
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  },
});

/**
 * Moderate rate limiter for write endpoints (POST, PUT, DELETE)
 * - 30 requests per minute per IP
 */
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many write requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  },
});

/**
 * Strict rate limiter for file upload endpoints
 * - 10 uploads per hour per user
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'upload_limit_exceeded',
    message: 'Upload limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user?.userId || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.subscriptionTier === 'ENTERPRISE';
  },
});

/**
 * Very strict rate limiter for password reset endpoints
 * - 3 requests per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many password reset attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for webhook endpoints
 * - 100 requests per minute per source
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Webhook rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use webhook source (Stripe, Clerk, etc.) as key
    const source = req.headers['webhook-source'] as string;
    return source || req.ip || 'unknown';
  },
});

/**
 * General API rate limiter
 * - 60 requests per minute per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'API rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  },
});

/**
 * Create a custom rate limiter with specific settings
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipCondition?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: 'too_many_requests',
      message: options.message || 'Rate limit exceeded. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skipCondition,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'too_many_requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });
}

/**
 * Rate limiter for specific subscription tiers
 */
export function tierBasedRateLimiter(limits: {
  FREE: number;
  PRO: number;
  ENTERPRISE: number;
  windowMs?: number;
}) {
  const windowMs = limits.windowMs || 60 * 1000; // Default 1 minute

  return rateLimit({
    windowMs,
    max: async (req: Request) => {
      const user = (req as any).user;
      const tier = user?.subscriptionTier || 'FREE';
      return limits[tier as keyof typeof limits] || limits.FREE;
    },
    message: {
      success: false,
      error: 'tier_limit_exceeded',
      message: 'Request limit for your subscription tier has been exceeded.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user?.userId || req.ip || 'unknown';
    },
  });
}

export default {
  auth: authRateLimiter,
  read: readRateLimiter,
  write: writeRateLimiter,
  upload: uploadRateLimiter,
  passwordReset: passwordResetRateLimiter,
  webhook: webhookRateLimiter,
  api: apiRateLimiter,
  createRateLimiter,
  tierBasedRateLimiter,
};
