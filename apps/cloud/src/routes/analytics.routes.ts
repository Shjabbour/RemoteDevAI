import { Router, Request, Response } from 'express';
import AnalyticsService from '../services/AnalyticsService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Middleware to check if user is admin
 * In production, replace with proper admin authentication
 */
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  // For now, allow ENTERPRISE tier users to access analytics
  // In production, implement proper admin roles
  if (user?.subscriptionTier !== 'ENTERPRISE') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }

  next();
};

/**
 * GET /analytics/overview
 * Get analytics overview with key metrics
 */
router.get('/overview', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const overview = await AnalyticsService.getOverview(start, end);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/users
 * Get user metrics
 */
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const userMetrics = await AnalyticsService.getUserMetrics(start, end);

    res.json({
      success: true,
      data: userMetrics,
    });
  } catch (error: any) {
    console.error('Error fetching user metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user metrics',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/usage
 * Get usage metrics (API requests, sessions, etc.)
 */
router.get('/usage', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = dailyStats.reduce(
      (acc, stat) => ({
        totalRequests: acc.totalRequests + stat.totalRequests,
        successfulRequests: acc.successfulRequests + stat.successfulRequests,
        failedRequests: acc.failedRequests + stat.failedRequests,
        totalSessions: acc.totalSessions + stat.sessionsStarted,
        completedSessions: acc.completedSessions + stat.sessionsCompleted,
        totalProjects: acc.totalProjects + stat.projectsCreated,
      }),
      {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalSessions: 0,
        completedSessions: 0,
        totalProjects: 0,
      }
    );

    res.json({
      success: true,
      data: {
        dailyStats,
        totals,
      },
    });
  } catch (error: any) {
    console.error('Error fetching usage metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage metrics',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/errors
 * Get error metrics and logs
 */
router.get('/errors', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const errorMetrics = await AnalyticsService.getErrorMetrics(start, end);

    res.json({
      success: true,
      data: errorMetrics,
    });
  } catch (error: any) {
    console.error('Error fetching error metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error metrics',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/revenue
 * Get revenue metrics (admin only)
 */
router.get('/revenue', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        date: true,
        revenue: true,
        newSubscriptions: true,
        canceledSubscriptions: true,
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = dailyStats.reduce(
      (acc, stat) => ({
        totalRevenue: acc.totalRevenue + Number(stat.revenue),
        totalNewSubscriptions: acc.totalNewSubscriptions + stat.newSubscriptions,
        totalCanceledSubscriptions: acc.totalCanceledSubscriptions + stat.canceledSubscriptions,
      }),
      {
        totalRevenue: 0,
        totalNewSubscriptions: 0,
        totalCanceledSubscriptions: 0,
      }
    );

    // Get current subscription counts
    const subscriptionCounts = await prisma.subscription.groupBy({
      by: ['tier', 'status'],
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        dailyStats,
        totals,
        subscriptionCounts: subscriptionCounts.map((s) => ({
          tier: s.tier,
          status: s.status,
          count: s._count.id,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue metrics',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/events
 * Get recent analytics events (admin only)
 */
router.get('/events', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      category,
      eventType,
      userId,
      limit = '100',
      offset = '0',
    } = req.query;

    const events = await prisma.analyticsEvent.findMany({
      where: {
        ...(category && { category: category as any }),
        ...(eventType && { eventType: eventType as string }),
        ...(userId && { userId: userId as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.analyticsEvent.count({
      where: {
        ...(category && { category: category as any }),
        ...(eventType && { eventType: eventType as string }),
        ...(userId && { userId: userId as string }),
      },
    });

    res.json({
      success: true,
      data: {
        events,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics events',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/user/:userId
 * Get analytics for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.id;

    // Users can only view their own stats, unless they're admin
    if (userId !== currentUserId) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { subscriptionTier: true },
      });

      if (user?.subscriptionTier !== 'ENTERPRISE') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only view your own analytics',
        });
      }
    }

    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'User stats not found',
      });
    }

    res.json({
      success: true,
      data: userStats,
    });
  } catch (error: any) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics',
      message: error.message,
    });
  }
});

/**
 * POST /analytics/preferences
 * Update user analytics preferences
 */
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const {
      analyticsEnabled,
      trackingEnabled,
      errorReportingEnabled,
      anonymizeData,
      shareUsageData,
    } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        analyticsEnabled,
        trackingEnabled,
        errorReportingEnabled,
        anonymizeData,
        shareUsageData,
      },
      update: {
        analyticsEnabled,
        trackingEnabled,
        errorReportingEnabled,
        anonymizeData,
        shareUsageData,
      },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('Error updating analytics preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message,
    });
  }
});

/**
 * GET /analytics/preferences
 * Get user analytics preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    res.json({
      success: true,
      data: preferences || {
        analyticsEnabled: true,
        trackingEnabled: true,
        errorReportingEnabled: true,
        anonymizeData: false,
        shareUsageData: true,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      message: error.message,
    });
  }
});

export default router;
