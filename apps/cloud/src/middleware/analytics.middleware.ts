import { Request, Response, NextFunction } from 'express';
import AnalyticsService from '../services/AnalyticsService';
import MetricsService from '../services/MetricsService';

/**
 * Analytics middleware to track API requests
 */
export const analyticsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startUsage = process.cpuUsage();

  // Capture request details
  const method = req.method;
  const endpoint = req.path;
  const userAgent = req.get('user-agent');
  const ipAddress = getClientIp(req);

  // Get user ID from request (if authenticated)
  const userId = (req as any).user?.id;

  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  let responseSize = 0;

  res.json = function (data: any) {
    // Calculate response size
    responseSize = JSON.stringify(data).length;
    return originalJson(data);
  };

  // Track response
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    try {
      // Track in analytics
      await AnalyticsService.trackApiRequest(
        endpoint,
        method,
        statusCode,
        duration,
        responseSize,
        userId,
        userAgent,
        ipAddress
      );

      // Track in Prometheus metrics
      MetricsService.recordHttpRequest(
        method,
        endpoint,
        statusCode,
        duration,
        parseInt(req.get('content-length') || '0'),
        responseSize
      );

      // Update daily stats
      await AnalyticsService.updateDailyStats(new Date(), {
        requestIncrement: true,
        successfulRequestIncrement: statusCode < 400,
        failedRequestIncrement: statusCode >= 400,
        responseTime: duration,
        responseSize,
      });

      // Update user stats if authenticated
      if (userId) {
        await AnalyticsService.updateUserStats(userId, {
          apiRequestIncrement: true,
        });
      }
    } catch (error) {
      console.error('Analytics middleware error:', error);
      // Don't throw - analytics should not break the app
    }
  });

  next();
};

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Parse user agent to extract useful information
 */
export function parseUserAgent(userAgent?: string): {
  browser?: string;
  os?: string;
  device?: string;
} {
  if (!userAgent) {
    return {};
  }

  const result: { browser?: string; os?: string; device?: string } = {};

  // Detect browser
  if (userAgent.includes('Chrome')) {
    result.browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    result.browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    result.browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    result.browser = 'Edge';
  } else if (userAgent.includes('Opera')) {
    result.browser = 'Opera';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    result.os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    result.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    result.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    result.os = 'Android';
  } else if (userAgent.includes('iOS')) {
    result.os = 'iOS';
  }

  // Detect device type
  if (userAgent.includes('Mobile')) {
    result.device = 'Mobile';
  } else if (userAgent.includes('Tablet')) {
    result.device = 'Tablet';
  } else {
    result.device = 'Desktop';
  }

  return result;
}

/**
 * Get geo-location from IP address (placeholder - requires external service)
 */
export async function getGeoLocation(
  ipAddress: string
): Promise<{ country?: string; city?: string }> {
  // In production, you would use a service like MaxMind GeoIP, ipapi.co, or ip-api.com
  // For now, return empty object
  return {};

  // Example with ipapi.co (requires external API call):
  /*
  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
    const data = await response.json();
    return {
      country: data.country_name,
      city: data.city,
    };
  } catch (error) {
    console.error('Geo-location lookup failed:', error);
    return {};
  }
  */
}

/**
 * Middleware to update system metrics periodically
 */
export function startMetricsCollection(intervalMs: number = 60000) {
  // Update system metrics every interval
  setInterval(() => {
    MetricsService.updateSystemMetrics();
  }, intervalMs);

  // Initial update
  MetricsService.updateSystemMetrics();
}

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id;
  const sessionId = (req as any).session?.id;

  // Track error
  AnalyticsService.trackError({
    errorType: err.name || 'Error',
    message: err.message,
    stack: err.stack,
    userId,
    sessionId,
    endpoint: req.path,
    method: req.method,
    requestBody: req.body,
    requestHeaders: sanitizeHeaders(req.headers),
    requestQuery: req.query,
    userAgent: req.get('user-agent'),
    ipAddress: getClientIp(req),
    severity: determineErrorSeverity(err, res.statusCode),
  });

  // Update daily stats
  AnalyticsService.updateDailyStats(new Date(), {
    errorIncrement: true,
    criticalErrorIncrement: res.statusCode >= 500,
  });

  next(err);
};

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  return sanitized;
}

/**
 * Determine error severity based on error type and status code
 */
function determineErrorSeverity(err: Error, statusCode: number): any {
  if (statusCode >= 500) {
    return 'CRITICAL';
  }
  if (statusCode >= 400) {
    return 'ERROR';
  }
  if (err.name === 'ValidationError') {
    return 'WARNING';
  }
  return 'ERROR';
}
