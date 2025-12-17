import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.middleware';
import UsageTrackingService from '../services/UsageTrackingService';

const prisma = new PrismaClient();
const usageService = new UsageTrackingService();

// Subscription limits per tier
const LIMITS = {
  FREE: {
    maxProjects: 3,
    maxSessions: 10,
    maxRecordings: 5,
    maxStorageMB: 500,
    maxAgents: 1,
  },
  PRO: {
    maxProjects: 50,
    maxSessions: 1000,
    maxRecordings: 500,
    maxStorageMB: 50000, // 50GB
    maxAgents: 5,
  },
  ENTERPRISE: {
    maxProjects: -1, // Unlimited
    maxSessions: -1,
    maxRecordings: -1,
    maxStorageMB: -1,
    maxAgents: -1,
  },
};

/**
 * Check if user has an active subscription
 */
export const requireActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
    });

    if (!subscription) {
      res.status(403).json({
        success: false,
        error: 'No subscription found',
        message: 'Please subscribe to use this feature',
      });
      return;
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      res.status(403).json({
        success: false,
        error: 'Subscription inactive',
        message: 'Your subscription is not active. Please update your payment method.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Check if user can create a new project
 */
export const checkProjectLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const tier = req.user.tier as keyof typeof LIMITS;
    const limit = LIMITS[tier]?.maxProjects ?? LIMITS.FREE.maxProjects;

    // Unlimited
    if (limit === -1) {
      next();
      return;
    }

    const projectCount = await prisma.project.count({
      where: {
        userId: req.user.userId,
        isActive: true,
      },
    });

    if (projectCount >= limit) {
      res.status(403).json({
        success: false,
        error: 'Project limit reached',
        message: `Your ${tier} plan allows ${limit} active projects. Please upgrade or delete existing projects.`,
        limit,
        current: projectCount,
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check project limit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Check if user can create a new session
 */
export const checkSessionLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const tier = req.user.tier as keyof typeof LIMITS;
    const limit = LIMITS[tier]?.maxSessions ?? LIMITS.FREE.maxSessions;

    // Unlimited
    if (limit === -1) {
      next();
      return;
    }

    const sessionCount = await prisma.session.count({
      where: {
        userId: req.user.userId,
      },
    });

    if (sessionCount >= limit) {
      res.status(403).json({
        success: false,
        error: 'Session limit reached',
        message: `Your ${tier} plan allows ${limit} sessions. Please upgrade or delete old sessions.`,
        limit,
        current: sessionCount,
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check session limit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Check if user can create a new recording (uses usage tracking)
 */
export const checkRecordingLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const monthlyUsage = await usageService.getMonthlyUsage(req.user.userId);

    // Unlimited
    if (monthlyUsage.recordingQuota === -1) {
      next();
      return;
    }

    if (monthlyUsage.recordingCount >= monthlyUsage.recordingQuota) {
      res.status(403).json({
        success: false,
        error: 'Recording limit reached',
        message: `Your monthly recording limit has been reached. Please upgrade or try again next month.`,
        limit: monthlyUsage.recordingQuota,
        current: monthlyUsage.recordingCount,
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check recording limit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Check if user has enough storage (uses usage tracking)
 */
export const checkStorageLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const monthlyUsage = await usageService.getMonthlyUsage(req.user.userId);

    if (monthlyUsage.storageUsed >= monthlyUsage.storageQuota) {
      res.status(403).json({
        success: false,
        error: 'Storage limit reached',
        message: `Your storage limit has been reached. Please upgrade or delete old files.`,
        limit: Number(monthlyUsage.storageQuota),
        current: Number(monthlyUsage.storageUsed),
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check storage limit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Check if user can register more agents
 */
export const checkAgentLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const tier = req.user.tier as keyof typeof LIMITS;
    const limit = LIMITS[tier]?.maxAgents ?? LIMITS.FREE.maxAgents;

    // Unlimited
    if (limit === -1) {
      next();
      return;
    }

    const agentCount = await prisma.desktopAgent.count({
      where: {
        userId: req.user.userId,
      },
    });

    if (agentCount >= limit) {
      res.status(403).json({
        success: false,
        error: 'Agent limit reached',
        message: `Your ${tier} plan allows ${limit} desktop agents. Please upgrade.`,
        limit,
        current: agentCount,
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check agent limit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default {
  requireActiveSubscription,
  checkProjectLimit,
  checkSessionLimit,
  checkRecordingLimit,
  checkStorageLimit,
  checkAgentLimit,
};
