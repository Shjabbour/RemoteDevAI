import { PrismaClient, EventCategory, ErrorSeverity } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrackEventParams {
  eventType: string;
  eventName: string;
  category?: EventCategory;
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  responseSize?: number;
  agentId?: string;
  agentStatus?: string;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  metadata?: Record<string, any>;
  anonymized?: boolean;
}

export interface TrackErrorParams {
  errorType: string;
  errorCode?: string;
  message: string;
  stack?: string;
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  requestBody?: any;
  requestHeaders?: any;
  requestQuery?: any;
  environment?: string;
  version?: string;
  userAgent?: string;
  ipAddress?: string;
  severity?: ErrorSeverity;
}

class AnalyticsService {
  /**
   * Track an analytics event
   */
  async trackEvent(params: TrackEventParams): Promise<void> {
    try {
      // Check if user has analytics enabled
      if (params.userId) {
        const preferences = await prisma.userPreferences.findUnique({
          where: { userId: params.userId },
        });

        if (preferences && !preferences.analyticsEnabled) {
          return; // User has opted out
        }

        // Anonymize data if requested
        if (preferences?.anonymizeData) {
          params.anonymized = true;
          params.ipAddress = undefined;
          params.country = undefined;
          params.city = undefined;
        }
      }

      await prisma.analyticsEvent.create({
        data: {
          eventType: params.eventType,
          eventName: params.eventName,
          category: params.category || EventCategory.USER,
          userId: params.userId,
          sessionId: params.sessionId,
          endpoint: params.endpoint,
          method: params.method,
          statusCode: params.statusCode,
          duration: params.duration,
          responseSize: params.responseSize,
          agentId: params.agentId,
          agentStatus: params.agentStatus,
          errorType: params.errorType,
          errorMessage: params.errorMessage,
          errorStack: params.errorStack,
          userAgent: params.userAgent,
          ipAddress: params.ipAddress,
          country: params.country,
          city: params.city,
          metadata: params.metadata || {},
          anonymized: params.anonymized || false,
        },
      });

      // Update user stats if userId is provided
      if (params.userId && params.eventType === 'login') {
        await this.updateUserStats(params.userId, { loginIncrement: true });
      }
    } catch (error) {
      console.error('Failed to track event:', error);
      // Don't throw error - analytics should not break the app
    }
  }

  /**
   * Track an API request
   */
  async trackApiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    responseSize: number,
    userId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'api_request',
      eventName: `${method} ${endpoint}`,
      category: EventCategory.API,
      endpoint,
      method,
      statusCode,
      duration,
      responseSize,
      userId,
      userAgent,
      ipAddress,
    });
  }

  /**
   * Track a user event (login, logout, signup, etc.)
   */
  async trackUserEvent(
    eventType: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      eventType,
      eventName: eventType.replace(/_/g, ' '),
      category: EventCategory.USER,
      userId,
      metadata,
    });
  }

  /**
   * Track an agent event (connected, disconnected, etc.)
   */
  async trackAgentEvent(
    eventType: string,
    agentId: string,
    userId: string,
    agentStatus?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      eventType,
      eventName: eventType.replace(/_/g, ' '),
      category: EventCategory.AGENT,
      userId,
      agentId,
      agentStatus,
      metadata,
    });
  }

  /**
   * Track an error
   */
  async trackError(params: TrackErrorParams): Promise<void> {
    try {
      // Check if user has error reporting enabled
      if (params.userId) {
        const preferences = await prisma.userPreferences.findUnique({
          where: { userId: params.userId },
        });

        if (preferences && !preferences.errorReportingEnabled) {
          return; // User has opted out
        }
      }

      // Check if similar error exists
      const existingError = await prisma.errorLog.findFirst({
        where: {
          errorType: params.errorType,
          message: params.message,
          endpoint: params.endpoint,
          resolved: false,
        },
      });

      if (existingError) {
        // Update existing error
        await prisma.errorLog.update({
          where: { id: existingError.id },
          data: {
            occurrences: existingError.occurrences + 1,
            lastSeenAt: new Date(),
          },
        });
      } else {
        // Create new error log
        await prisma.errorLog.create({
          data: {
            errorType: params.errorType,
            errorCode: params.errorCode,
            message: params.message,
            stack: params.stack,
            userId: params.userId,
            sessionId: params.sessionId,
            endpoint: params.endpoint,
            method: params.method,
            requestBody: params.requestBody,
            requestHeaders: params.requestHeaders,
            requestQuery: params.requestQuery,
            environment: params.environment || process.env.NODE_ENV || 'production',
            version: params.version,
            userAgent: params.userAgent,
            ipAddress: params.ipAddress,
            severity: params.severity || ErrorSeverity.ERROR,
          },
        });
      }

      // Also track as analytics event
      await this.trackEvent({
        eventType: 'error',
        eventName: params.message,
        category: EventCategory.ERROR,
        userId: params.userId,
        endpoint: params.endpoint,
        method: params.method,
        errorType: params.errorType,
        errorMessage: params.message,
        errorStack: params.stack,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
      });
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    userId: string,
    updates: {
      loginIncrement?: boolean;
      sessionIncrement?: boolean;
      projectIncrement?: boolean;
      apiRequestIncrement?: boolean;
      sessionTimeIncrement?: number;
      storageIncrement?: number;
      recordingIncrement?: boolean;
      agentIncrement?: boolean;
    }
  ): Promise<void> {
    try {
      const stats = await prisma.userStats.upsert({
        where: { userId },
        create: {
          userId,
          totalLogins: updates.loginIncrement ? 1 : 0,
          totalSessions: updates.sessionIncrement ? 1 : 0,
          totalProjects: updates.projectIncrement ? 1 : 0,
          totalApiRequests: updates.apiRequestIncrement ? 1 : 0,
          totalSessionTime: updates.sessionTimeIncrement || 0,
          totalStorageUsed: BigInt(updates.storageIncrement || 0),
          recordingsCreated: updates.recordingIncrement ? 1 : 0,
          agentsConnected: updates.agentIncrement ? 1 : 0,
          lastLoginAt: updates.loginIncrement ? new Date() : undefined,
          lastActiveAt: new Date(),
        },
        update: {
          totalLogins: updates.loginIncrement ? { increment: 1 } : undefined,
          totalSessions: updates.sessionIncrement ? { increment: 1 } : undefined,
          totalProjects: updates.projectIncrement ? { increment: 1 } : undefined,
          totalApiRequests: updates.apiRequestIncrement ? { increment: 1 } : undefined,
          totalSessionTime: updates.sessionTimeIncrement
            ? { increment: updates.sessionTimeIncrement }
            : undefined,
          totalStorageUsed: updates.storageIncrement
            ? { increment: BigInt(updates.storageIncrement) }
            : undefined,
          recordingsCreated: updates.recordingIncrement ? { increment: 1 } : undefined,
          agentsConnected: updates.agentIncrement ? { increment: 1 } : undefined,
          lastLoginAt: updates.loginIncrement ? new Date() : undefined,
          lastActiveAt: new Date(),
        },
      });

      // Calculate average session time
      if (stats.totalSessions > 0) {
        await prisma.userStats.update({
          where: { userId },
          data: {
            avgSessionTime: stats.totalSessionTime / stats.totalSessions,
          },
        });
      }
    } catch (error) {
      console.error('Failed to update user stats:', error);
    }
  }

  /**
   * Update daily statistics
   */
  async updateDailyStats(
    date: Date,
    updates: {
      requestIncrement?: boolean;
      successfulRequestIncrement?: boolean;
      failedRequestIncrement?: boolean;
      responseTime?: number;
      responseSize?: number;
      activeUserIncrement?: string; // userId
      newUserIncrement?: boolean;
      loginIncrement?: boolean;
      projectIncrement?: boolean;
      sessionStartIncrement?: boolean;
      sessionCompleteIncrement?: boolean;
      sessionTimeIncrement?: number;
      agentConnectIncrement?: boolean;
      agentDisconnectIncrement?: boolean;
      errorIncrement?: boolean;
      criticalErrorIncrement?: boolean;
      revenueIncrement?: number;
      subscriptionIncrement?: boolean;
      subscriptionCancelIncrement?: boolean;
    }
  ): Promise<void> {
    try {
      const dateOnly = new Date(date.toISOString().split('T')[0]);

      const stats = await prisma.dailyStats.upsert({
        where: { date: dateOnly },
        create: {
          date: dateOnly,
          totalRequests: updates.requestIncrement ? 1 : 0,
          successfulRequests: updates.successfulRequestIncrement ? 1 : 0,
          failedRequests: updates.failedRequestIncrement ? 1 : 0,
          avgResponseTime: updates.responseTime || 0,
          totalResponseSize: BigInt(updates.responseSize || 0),
          activeUsers: updates.activeUserIncrement ? 1 : 0,
          newUsers: updates.newUserIncrement ? 1 : 0,
          totalLogins: updates.loginIncrement ? 1 : 0,
          projectsCreated: updates.projectIncrement ? 1 : 0,
          sessionsStarted: updates.sessionStartIncrement ? 1 : 0,
          sessionsCompleted: updates.sessionCompleteIncrement ? 1 : 0,
          totalSessionTime: updates.sessionTimeIncrement || 0,
          agentsConnected: updates.agentConnectIncrement ? 1 : 0,
          agentsDisconnected: updates.agentDisconnectIncrement ? 1 : 0,
          totalErrors: updates.errorIncrement ? 1 : 0,
          criticalErrors: updates.criticalErrorIncrement ? 1 : 0,
          revenue: BigInt(updates.revenueIncrement || 0),
          newSubscriptions: updates.subscriptionIncrement ? 1 : 0,
          canceledSubscriptions: updates.subscriptionCancelIncrement ? 1 : 0,
        },
        update: {
          totalRequests: updates.requestIncrement ? { increment: 1 } : undefined,
          successfulRequests: updates.successfulRequestIncrement ? { increment: 1 } : undefined,
          failedRequests: updates.failedRequestIncrement ? { increment: 1 } : undefined,
          totalResponseSize: updates.responseSize
            ? { increment: BigInt(updates.responseSize) }
            : undefined,
          totalLogins: updates.loginIncrement ? { increment: 1 } : undefined,
          projectsCreated: updates.projectIncrement ? { increment: 1 } : undefined,
          sessionsStarted: updates.sessionStartIncrement ? { increment: 1 } : undefined,
          sessionsCompleted: updates.sessionCompleteIncrement ? { increment: 1 } : undefined,
          totalSessionTime: updates.sessionTimeIncrement
            ? { increment: updates.sessionTimeIncrement }
            : undefined,
          agentsConnected: updates.agentConnectIncrement ? { increment: 1 } : undefined,
          agentsDisconnected: updates.agentDisconnectIncrement ? { increment: 1 } : undefined,
          totalErrors: updates.errorIncrement ? { increment: 1 } : undefined,
          criticalErrors: updates.criticalErrorIncrement ? { increment: 1 } : undefined,
          revenue: updates.revenueIncrement ? { increment: BigInt(updates.revenueIncrement) } : undefined,
          newSubscriptions: updates.subscriptionIncrement ? { increment: 1 } : undefined,
          canceledSubscriptions: updates.subscriptionCancelIncrement ? { increment: 1 } : undefined,
        },
      });

      // Calculate average response time
      if (updates.responseTime && stats.totalRequests > 0) {
        const currentTotal = stats.avgResponseTime * (stats.totalRequests - 1);
        const newAvg = (currentTotal + updates.responseTime) / stats.totalRequests;

        await prisma.dailyStats.update({
          where: { date: dateOnly },
          data: { avgResponseTime: newAvg },
        });
      }
    } catch (error) {
      console.error('Failed to update daily stats:', error);
    }
  }

  /**
   * Get analytics overview
   */
  async getOverview(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalSessions,
      dailyStats,
      errorStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastSeenAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.project.count(),
      prisma.session.count(),
      prisma.dailyStats.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.errorLog.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),
    ]);

    // Calculate totals from daily stats
    const totals = dailyStats.reduce(
      (acc, stat) => ({
        requests: acc.requests + stat.totalRequests,
        errors: acc.errors + stat.totalErrors,
        sessions: acc.sessions + stat.sessionsStarted,
        avgResponseTime:
          (acc.avgResponseTime * acc.days + stat.avgResponseTime) / (acc.days + 1),
        days: acc.days + 1,
      }),
      { requests: 0, errors: 0, sessions: 0, avgResponseTime: 0, days: 0 }
    );

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalProjects,
        totalSessions,
        totalRequests: totals.requests,
        totalErrors: totals.errors,
        avgResponseTime: totals.avgResponseTime,
      },
      dailyStats,
      errorStats: errorStats.map((stat) => ({
        severity: stat.severity,
        count: stat._count.id,
      })),
    };
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [newUsers, activeUsers, usersByTier] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.user.count({
        where: {
          lastSeenAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.user.groupBy({
        by: ['subscriptionTier'],
        _count: { id: true },
      }),
    ]);

    return {
      newUsers,
      activeUsers,
      usersByTier: usersByTier.map((tier) => ({
        tier: tier.subscriptionTier,
        count: tier._count.id,
      })),
    };
  }

  /**
   * Get error metrics
   */
  async getErrorMetrics(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [recentErrors, errorsByType, unresolvedErrors] = await Promise.all([
      prisma.errorLog.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.errorLog.groupBy({
        by: ['errorType'],
        _count: { id: true },
        _sum: { occurrences: true },
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
      prisma.errorLog.count({
        where: {
          resolved: false,
        },
      }),
    ]);

    return {
      recentErrors,
      errorsByType: errorsByType.map((type) => ({
        type: type.errorType,
        count: type._count.id,
        occurrences: type._sum.occurrences || 0,
      })),
      unresolvedErrors,
    };
  }
}

export default new AnalyticsService();
