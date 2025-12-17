import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import UsageTrackingService from '../services/UsageTrackingService';
import getRateLimitService from '../services/RateLimitService';
import { readRateLimiter } from '../utils/rateLimiters';

const router = express.Router();

/**
 * GET /usage/current
 * Get current usage for the authenticated user
 */
router.get('/current', authenticateToken, readRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const usageService = new UsageTrackingService();

    const [dailyUsage, monthlyUsage] = await Promise.all([
      usageService.getDailyUsage(user.userId),
      usageService.getMonthlyUsage(user.userId),
    ]);

    // Calculate percentages
    const apiPercentage = dailyUsage.apiQuota > 0
      ? (dailyUsage.apiCalls / dailyUsage.apiQuota) * 100
      : 0;

    const voicePercentage = monthlyUsage.voiceQuota > 0
      ? (monthlyUsage.voiceMinutes / monthlyUsage.voiceQuota) * 100
      : 0;

    const storagePercentage = Number(monthlyUsage.storageQuota) > 0
      ? (Number(monthlyUsage.storageUsed) / Number(monthlyUsage.storageQuota)) * 100
      : 0;

    const recordingPercentage = monthlyUsage.recordingQuota > 0
      ? (monthlyUsage.recordingCount / monthlyUsage.recordingQuota) * 100
      : 0;

    res.json({
      success: true,
      data: {
        daily: {
          apiCalls: {
            current: dailyUsage.apiCalls,
            limit: dailyUsage.apiQuota,
            remaining: Math.max(0, dailyUsage.apiQuota - dailyUsage.apiCalls),
            percentage: apiPercentage,
          },
          agentConnections: {
            current: dailyUsage.agentConnections,
            limit: dailyUsage.agentQuota,
            remaining: Math.max(0, dailyUsage.agentQuota - dailyUsage.agentConnections),
            percentage: dailyUsage.agentQuota > 0
              ? (dailyUsage.agentConnections / dailyUsage.agentQuota) * 100
              : 0,
          },
          date: dailyUsage.date,
        },
        monthly: {
          voiceMinutes: {
            current: monthlyUsage.voiceMinutes,
            limit: monthlyUsage.voiceQuota,
            remaining: Math.max(0, monthlyUsage.voiceQuota - monthlyUsage.voiceMinutes),
            percentage: voicePercentage,
          },
          storage: {
            current: Number(monthlyUsage.storageUsed),
            limit: Number(monthlyUsage.storageQuota),
            remaining: Math.max(0, Number(monthlyUsage.storageQuota) - Number(monthlyUsage.storageUsed)),
            percentage: storagePercentage,
            currentFormatted: formatBytes(Number(monthlyUsage.storageUsed)),
            limitFormatted: formatBytes(Number(monthlyUsage.storageQuota)),
          },
          recordings: {
            current: monthlyUsage.recordingCount,
            limit: monthlyUsage.recordingQuota,
            remaining: Math.max(0, monthlyUsage.recordingQuota - monthlyUsage.recordingCount),
            percentage: recordingPercentage,
          },
          year: monthlyUsage.year,
          month: monthlyUsage.month,
        },
        tier: user.tier,
      },
    });
  } catch (error) {
    console.error('Error fetching current usage:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch current usage',
    });
  }
});

/**
 * GET /usage/history
 * Get usage history for the authenticated user
 */
router.get('/history', authenticateToken, readRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate, limit = 100 } = req.query;

    const usageService = new UsageTrackingService();

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    const end = endDate
      ? new Date(endDate as string)
      : new Date();

    const history = await usageService.getUsageHistory(
      user.userId,
      start,
      end,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        history,
        startDate: start,
        endDate: end,
        count: history.length,
      },
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch usage history',
    });
  }
});

/**
 * GET /usage/limits
 * Get current limits for the authenticated user's subscription tier
 */
router.get('/limits', authenticateToken, readRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const tier = user.tier || 'FREE';

    const quotas = UsageTrackingService.getTierQuotas(tier);

    res.json({
      success: true,
      data: {
        tier,
        limits: {
          apiCallsPerDay: quotas.apiCallsPerDay,
          voiceMinutesPerMonth: quotas.voiceMinutesPerMonth,
          storageBytes: quotas.storageBytes,
          storageFormatted: formatBytes(quotas.storageBytes),
          recordingsPerMonth: quotas.recordingsPerMonth,
          agentConnectionsPerDay: quotas.agentConnectionsPerDay,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching usage limits:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch usage limits',
    });
  }
});

/**
 * GET /usage/breakdown
 * Get usage breakdown by category for a date range
 */
router.get('/breakdown', authenticateToken, readRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate } = req.query;

    const usageService = new UsageTrackingService();

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    const end = endDate
      ? new Date(endDate as string)
      : new Date();

    const breakdown = await usageService.getUsageBreakdown(user.userId, start, end);

    res.json({
      success: true,
      data: {
        breakdown,
        startDate: start,
        endDate: end,
      },
    });
  } catch (error) {
    console.error('Error fetching usage breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch usage breakdown',
    });
  }
});

/**
 * GET /usage/rate-limits
 * Get current rate limit status
 */
router.get('/rate-limits', authenticateToken, readRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const rateLimitService = getRateLimitService();

    const [apiUsage, authUsage, uploadUsage] = await Promise.all([
      rateLimitService.getUserUsage(user.userId, user.tier, 'api'),
      rateLimitService.getUserUsage(user.userId, user.tier, 'auth'),
      rateLimitService.getUserUsage(user.userId, user.tier, 'upload'),
    ]);

    res.json({
      success: true,
      data: {
        api: {
          current: apiUsage.current,
          limit: apiUsage.limit,
          remaining: apiUsage.remaining,
          reset: apiUsage.reset,
          resetDate: new Date(apiUsage.reset * 1000),
          percentage: apiUsage.percentage,
        },
        auth: {
          current: authUsage.current,
          limit: authUsage.limit,
          remaining: authUsage.remaining,
          reset: authUsage.reset,
          resetDate: new Date(authUsage.reset * 1000),
          percentage: authUsage.percentage,
        },
        upload: {
          current: uploadUsage.current,
          limit: uploadUsage.limit,
          remaining: uploadUsage.remaining,
          reset: uploadUsage.reset,
          resetDate: new Date(uploadUsage.reset * 1000),
          percentage: uploadUsage.percentage,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching rate limits:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch rate limits',
    });
  }
});

/**
 * GET /usage/alerts
 * Get usage alerts for the authenticated user
 */
router.get('/alerts', authenticateToken, readRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user;
    const usageService = new UsageTrackingService();

    // Check and create any new alerts
    await usageService.checkAndCreateAlerts(user.userId);

    // Get all recent alerts (last 30 days)
    const alerts = await (usageService as any).prisma.usageAlert.findMany({
      where: {
        userId: user.userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
    });
  } catch (error) {
    console.error('Error fetching usage alerts:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to fetch usage alerts',
    });
  }
});

/**
 * Helper function to format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes === -1) return 'Unlimited';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default router;
