import { Request, Response, NextFunction } from 'express';
import UsageTrackingService from '../services/UsageTrackingService';
import getRateLimitService from '../services/RateLimitService';

/**
 * Middleware to check if user has exceeded their subscription usage limits
 */
export async function checkUsageLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const usageTrackingService = new UsageTrackingService();
    const limits = await usageTrackingService.checkLimits(user.userId);

    // Check which limits are exceeded
    const exceededLimits = Object.entries(limits)
      .filter(([_, exceeded]) => exceeded)
      .map(([limit]) => limit);

    if (exceededLimits.length > 0) {
      // Get current usage to include in response
      const dailyUsage = await usageTrackingService.getDailyUsage(user.userId);
      const monthlyUsage = await usageTrackingService.getMonthlyUsage(user.userId);

      return res.status(429).json({
        success: false,
        error: 'usage_limit_exceeded',
        message: `You have exceeded your ${exceededLimits.join(', ')} limit. Please upgrade your plan.`,
        exceededLimits,
        usage: {
          daily: {
            apiCalls: {
              current: dailyUsage.apiCalls,
              limit: dailyUsage.apiQuota,
            },
            agentConnections: {
              current: dailyUsage.agentConnections,
              limit: dailyUsage.agentQuota,
            },
          },
          monthly: {
            voiceMinutes: {
              current: monthlyUsage.voiceMinutes,
              limit: monthlyUsage.voiceQuota,
            },
            recordings: {
              current: monthlyUsage.recordingCount,
              limit: monthlyUsage.recordingQuota,
            },
            storage: {
              current: Number(monthlyUsage.storageUsed),
              limit: Number(monthlyUsage.storageQuota),
            },
          },
        },
      });
    }

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    // On error, allow the request (fail open)
    next();
  }
}

/**
 * Middleware specifically for API call limits
 */
export async function checkApiCallLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user) {
      return next();
    }

    const usageTrackingService = new UsageTrackingService();
    const dailyUsage = await usageTrackingService.getDailyUsage(user.userId);

    if (dailyUsage.apiQuota !== -1 && dailyUsage.apiCalls >= dailyUsage.apiQuota) {
      return res.status(429).json({
        success: false,
        error: 'api_limit_exceeded',
        message: 'Daily API call limit exceeded. Please upgrade your plan or try again tomorrow.',
        current: dailyUsage.apiCalls,
        limit: dailyUsage.apiQuota,
        retryAfter: getSecondsUntilMidnight(),
      });
    }

    // Track the API call
    await usageTrackingService.trackApiCall(
      user.userId,
      req.path,
      req.method,
      200, // Will be updated in response
      req.ip,
      req.get('user-agent')
    );

    // Add usage headers
    res.setHeader('X-Usage-Remaining', Math.max(0, dailyUsage.apiQuota - dailyUsage.apiCalls - 1));
    res.setHeader('X-Usage-Limit', dailyUsage.apiQuota);
    res.setHeader('X-Usage-Reset', getMidnightTimestamp());

    next();
  } catch (error) {
    console.error('API call limit check error:', error);
    next();
  }
}

/**
 * Middleware to add rate limit headers to all responses
 */
export async function addRateLimitHeaders(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (user) {
      const rateLimitService = getRateLimitService();
      const usage = await rateLimitService.getUserUsage(user.userId, user.tier, 'api');

      res.setHeader('X-RateLimit-Limit', usage.limit);
      res.setHeader('X-RateLimit-Remaining', usage.remaining);
      res.setHeader('X-RateLimit-Reset', usage.reset);

      // Add usage percentage as well
      if (usage.limit > 0) {
        res.setHeader('X-RateLimit-Percentage', usage.percentage.toFixed(2));
      }
    }

    next();
  } catch (error) {
    console.error('Error adding rate limit headers:', error);
    next();
  }
}

/**
 * Middleware to check storage limits before file upload
 */
export async function checkStorageLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const usageTrackingService = new UsageTrackingService();
    const monthlyUsage = await usageTrackingService.getMonthlyUsage(user.userId);

    // Check if storage limit is exceeded
    if (monthlyUsage.storageUsed >= monthlyUsage.storageQuota) {
      return res.status(429).json({
        success: false,
        error: 'storage_limit_exceeded',
        message: 'Storage limit exceeded. Please delete some files or upgrade your plan.',
        current: Number(monthlyUsage.storageUsed),
        limit: Number(monthlyUsage.storageQuota),
      });
    }

    // Check if the upload would exceed the limit
    const contentLength = parseInt(req.get('content-length') || '0');
    if (contentLength > 0) {
      const newTotal = Number(monthlyUsage.storageUsed) + contentLength;
      if (newTotal > Number(monthlyUsage.storageQuota)) {
        return res.status(429).json({
          success: false,
          error: 'storage_limit_exceeded',
          message: 'This upload would exceed your storage limit. Please upgrade your plan.',
          current: Number(monthlyUsage.storageUsed),
          limit: Number(monthlyUsage.storageQuota),
          uploadSize: contentLength,
        });
      }
    }

    next();
  } catch (error) {
    console.error('Storage limit check error:', error);
    next();
  }
}

/**
 * Middleware to check recording limits
 */
export async function checkRecordingLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const usageTrackingService = new UsageTrackingService();
    const monthlyUsage = await usageTrackingService.getMonthlyUsage(user.userId);

    if (
      monthlyUsage.recordingQuota !== -1 &&
      monthlyUsage.recordingCount >= monthlyUsage.recordingQuota
    ) {
      return res.status(429).json({
        success: false,
        error: 'recording_limit_exceeded',
        message: 'Monthly recording limit exceeded. Please upgrade your plan.',
        current: monthlyUsage.recordingCount,
        limit: monthlyUsage.recordingQuota,
      });
    }

    next();
  } catch (error) {
    console.error('Recording limit check error:', error);
    next();
  }
}

/**
 * Middleware to check agent connection limits
 */
export async function checkAgentConnectionLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const usageTrackingService = new UsageTrackingService();
    const dailyUsage = await usageTrackingService.getDailyUsage(user.userId);

    if (
      dailyUsage.agentQuota !== -1 &&
      dailyUsage.agentConnections >= dailyUsage.agentQuota
    ) {
      return res.status(429).json({
        success: false,
        error: 'agent_connection_limit_exceeded',
        message: 'Daily agent connection limit exceeded. Please upgrade your plan.',
        current: dailyUsage.agentConnections,
        limit: dailyUsage.agentQuota,
        retryAfter: getSecondsUntilMidnight(),
      });
    }

    next();
  } catch (error) {
    console.error('Agent connection limit check error:', error);
    next();
  }
}

/**
 * Helper function to get seconds until midnight
 */
function getSecondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Helper function to get midnight timestamp
 */
function getMidnightTimestamp(): number {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  return Math.floor(tomorrow.getTime() / 1000);
}
