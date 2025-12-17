import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from './auth.middleware';

/**
 * Extended request interface with audit context
 */
export interface AuditRequest extends AuthRequest {
  auditContext?: {
    requestId: string;
    ipAddress: string;
    userAgent: string;
    startTime: number;
  };
}

/**
 * Middleware to capture audit context from requests
 * This should be applied early in the middleware chain
 */
export const captureAuditContext = (
  req: AuditRequest,
  res: Response,
  next: NextFunction
): void => {
  // Generate a unique request ID for correlating audit entries
  const requestId = uuidv4();

  // Extract IP address (handle proxies)
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // Extract user agent
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Attach audit context to request
  req.auditContext = {
    requestId,
    ipAddress,
    userAgent,
    startTime: Date.now(),
  };

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', requestId);

  next();
};

/**
 * Get audit context from request
 */
export const getAuditContext = (req: AuditRequest) => {
  return {
    userId: req.user?.userId,
    ipAddress: req.auditContext?.ipAddress,
    userAgent: req.auditContext?.userAgent,
    requestId: req.auditContext?.requestId,
  };
};

/**
 * Middleware to detect suspicious activity
 */
export const detectSuspiciousActivity = (
  req: AuditRequest,
  res: Response,
  next: NextFunction
): void => {
  const suspiciousPatterns = [
    // Check for SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
    // Check for XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    // Check for path traversal
    /\.\.\//g,
    // Check for command injection
    /[;&|`$()]/,
  ];

  let isSuspicious = false;

  // Check URL, query params, and body for suspicious patterns
  const checkString = (str: string): boolean => {
    return suspiciousPatterns.some((pattern) => pattern.test(str));
  };

  // Check URL
  if (checkString(req.url)) {
    isSuspicious = true;
  }

  // Check query parameters
  if (req.query) {
    for (const value of Object.values(req.query)) {
      if (typeof value === 'string' && checkString(value)) {
        isSuspicious = true;
        break;
      }
    }
  }

  // Check body (only for string values)
  if (req.body && typeof req.body === 'object') {
    const checkObject = (obj: any): boolean => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && checkString(value)) {
          return true;
        }
        if (typeof value === 'object' && value !== null) {
          if (checkObject(value)) {
            return true;
          }
        }
      }
      return false;
    };

    if (checkObject(req.body)) {
      isSuspicious = true;
    }
  }

  // Attach suspicious flag to request
  if (isSuspicious && req.auditContext) {
    (req.auditContext as any).isSuspicious = true;
  }

  next();
};

/**
 * Middleware to log API request completion
 */
export const logRequestCompletion = (
  req: AuditRequest,
  res: Response,
  next: NextFunction
): void => {
  // Capture response finish event
  const originalSend = res.send;

  res.send = function (data): Response {
    // Calculate request duration
    const duration = req.auditContext ? Date.now() - req.auditContext.startTime : 0;

    // Log to console for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[${req.method}] ${req.path} - ${res.statusCode} - ${duration}ms - ${req.auditContext?.ipAddress}`
      );
    }

    // You can add analytics logging here if needed
    // AnalyticsService.logApiRequest({ ... })

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Rate limiting detection for suspicious activity
 */
export const detectRateLimitAbuse = (
  req: AuditRequest,
  res: Response,
  next: NextFunction
): void => {
  // This is a simple in-memory rate limit detector
  // In production, use Redis or a proper rate limiting solution
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  const key = req.auditContext?.ipAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // Create new record
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
  } else {
    // Increment count
    record.count++;

    if (record.count > maxRequests) {
      // Mark as suspicious
      if (req.auditContext) {
        (req.auditContext as any).isSuspicious = true;
        (req.auditContext as any).rateLimitExceeded = true;
      }
    }
  }

  next();
};

export default captureAuditContext;
