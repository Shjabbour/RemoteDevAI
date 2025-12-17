import { PrismaClient, UsageType, SubscriptionTier } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service for tracking and managing user usage across different resources
 */
export class UsageTrackingService {
  // Subscription tier quotas
  private static readonly TIER_QUOTAS = {
    FREE: {
      apiCallsPerDay: 100,
      voiceMinutesPerMonth: 10,
      storageBytes: 500 * 1024 * 1024, // 500MB
      recordingsPerMonth: 5,
      agentConnectionsPerDay: 1,
    },
    PRO: {
      apiCallsPerDay: 10000,
      voiceMinutesPerMonth: 100,
      storageBytes: 50 * 1024 * 1024 * 1024, // 50GB
      recordingsPerMonth: 500,
      agentConnectionsPerDay: 10,
    },
    ENTERPRISE: {
      apiCallsPerDay: -1, // Unlimited
      voiceMinutesPerMonth: 1000,
      storageBytes: 500 * 1024 * 1024 * 1024, // 500GB
      recordingsPerMonth: -1, // Unlimited
      agentConnectionsPerDay: -1, // Unlimited
    },
  };

  /**
   * Track an API call
   */
  async trackApiCall(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    await prisma.usageRecord.create({
      data: {
        userId,
        type: UsageType.API_CALL,
        category: 'api_call',
        endpoint,
        method,
        statusCode,
        ipAddress,
        userAgent,
        quantity: 1,
      },
    });

    // Update daily usage
    await this.updateDailyUsage(userId, 'apiCalls', 1);
  }

  /**
   * Track voice minutes used
   */
  async trackVoiceMinutes(userId: string, minutes: number) {
    await prisma.usageRecord.create({
      data: {
        userId,
        type: UsageType.VOICE_MINUTE,
        category: 'voice_minute',
        quantity: minutes,
      },
    });

    // Update daily and monthly usage
    await this.updateDailyUsage(userId, 'voiceMinutes', minutes);
    await this.updateMonthlyUsage(userId, 'voiceMinutes', minutes);
  }

  /**
   * Track storage used
   */
  async trackStorage(userId: string, bytes: number) {
    await prisma.usageRecord.create({
      data: {
        userId,
        type: UsageType.STORAGE,
        category: 'storage',
        quantity: bytes,
      },
    });

    // Update storage in both daily and monthly
    await this.updateDailyUsage(userId, 'storageUsed', bytes);
    await this.updateMonthlyUsage(userId, 'storageUsed', bytes);
  }

  /**
   * Track a new recording
   */
  async trackRecording(userId: string) {
    await prisma.usageRecord.create({
      data: {
        userId,
        type: UsageType.RECORDING,
        category: 'recording',
        quantity: 1,
      },
    });

    // Update monthly usage
    await this.updateMonthlyUsage(userId, 'recordingCount', 1);
  }

  /**
   * Track agent connection
   */
  async trackAgentConnection(userId: string) {
    await prisma.usageRecord.create({
      data: {
        userId,
        type: UsageType.AGENT_CONNECTION,
        category: 'agent_connection',
        quantity: 1,
      },
    });

    // Update daily usage
    await this.updateDailyUsage(userId, 'agentConnections', 1);
  }

  /**
   * Update daily usage stats
   */
  private async updateDailyUsage(
    userId: string,
    field: string,
    increment: number
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) return;

    const quotas = UsageTrackingService.TIER_QUOTAS[user.subscriptionTier];

    // Upsert daily usage
    await prisma.dailyUsage.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        [field]: {
          increment,
        },
      },
      create: {
        userId,
        date: today,
        [field]: increment,
        apiQuota: quotas.apiCallsPerDay,
        voiceQuota: 0, // Voice is monthly
        storageQuota: quotas.storageBytes,
        recordingQuota: 0, // Recordings are monthly
        agentQuota: quotas.agentConnectionsPerDay,
      },
    });
  }

  /**
   * Update monthly usage stats
   */
  private async updateMonthlyUsage(
    userId: string,
    field: string,
    increment: number
  ) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) return;

    const quotas = UsageTrackingService.TIER_QUOTAS[user.subscriptionTier];

    // Upsert monthly usage
    await prisma.monthlyUsage.upsert({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
      update: {
        [field]: {
          increment,
        },
      },
      create: {
        userId,
        year,
        month,
        [field]: increment,
        apiQuota: quotas.apiCallsPerDay * 30, // Approximate
        voiceQuota: quotas.voiceMinutesPerMonth,
        storageQuota: quotas.storageBytes,
        recordingQuota: quotas.recordingsPerMonth,
        agentQuota: quotas.agentConnectionsPerDay * 30,
      },
    });
  }

  /**
   * Get current daily usage for a user
   */
  async getDailyUsage(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.dailyUsage.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!usage) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (!user) throw new Error('User not found');

      const quotas = UsageTrackingService.TIER_QUOTAS[user.subscriptionTier];

      return {
        date: today,
        apiCalls: 0,
        apiQuota: quotas.apiCallsPerDay,
        voiceMinutes: 0,
        voiceQuota: 0,
        storageUsed: BigInt(0),
        storageQuota: BigInt(quotas.storageBytes),
        recordingCount: 0,
        recordingQuota: 0,
        agentConnections: 0,
        agentQuota: quotas.agentConnectionsPerDay,
      };
    }

    return usage;
  }

  /**
   * Get current monthly usage for a user
   */
  async getMonthlyUsage(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const usage = await prisma.monthlyUsage.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month,
        },
      },
    });

    if (!usage) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (!user) throw new Error('User not found');

      const quotas = UsageTrackingService.TIER_QUOTAS[user.subscriptionTier];

      return {
        year,
        month,
        apiCalls: 0,
        apiQuota: quotas.apiCallsPerDay * 30,
        voiceMinutes: 0,
        voiceQuota: quotas.voiceMinutesPerMonth,
        storageUsed: BigInt(0),
        storageQuota: BigInt(quotas.storageBytes),
        recordingCount: 0,
        recordingQuota: quotas.recordingsPerMonth,
        agentConnections: 0,
        agentQuota: quotas.agentConnectionsPerDay * 30,
        estimatedCost: 0,
      };
    }

    return usage;
  }

  /**
   * Check if user has exceeded any limits
   */
  async checkLimits(userId: string): Promise<{
    apiCalls: boolean;
    voiceMinutes: boolean;
    storage: boolean;
    recordings: boolean;
    agentConnections: boolean;
  }> {
    const dailyUsage = await this.getDailyUsage(userId);
    const monthlyUsage = await this.getMonthlyUsage(userId);

    return {
      apiCalls: dailyUsage.apiQuota !== -1 && dailyUsage.apiCalls >= dailyUsage.apiQuota,
      voiceMinutes: monthlyUsage.voiceQuota !== -1 && monthlyUsage.voiceMinutes >= monthlyUsage.voiceQuota,
      storage: monthlyUsage.storageUsed >= monthlyUsage.storageQuota,
      recordings: monthlyUsage.recordingQuota !== -1 && monthlyUsage.recordingCount >= monthlyUsage.recordingQuota,
      agentConnections: dailyUsage.agentQuota !== -1 && dailyUsage.agentConnections >= dailyUsage.agentQuota,
    };
  }

  /**
   * Get usage breakdown by category
   */
  async getUsageBreakdown(userId: string, startDate: Date, endDate: Date) {
    const records = await prisma.usageRecord.groupBy({
      by: ['type', 'category'],
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    return records.map((record) => ({
      type: record.type,
      category: record.category,
      totalQuantity: record._sum.quantity || 0,
      count: record._count.id,
    }));
  }

  /**
   * Get usage history for a user
   */
  async getUsageHistory(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ) {
    return prisma.usageRecord.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Check and create usage alerts if thresholds are exceeded
   */
  async checkAndCreateAlerts(userId: string) {
    const dailyUsage = await this.getDailyUsage(userId);
    const monthlyUsage = await this.getMonthlyUsage(userId);

    const alerts = [];

    // Check API calls (80% and 100%)
    if (dailyUsage.apiQuota !== -1) {
      const apiPercentage = (dailyUsage.apiCalls / dailyUsage.apiQuota) * 100;
      if (apiPercentage >= 80) {
        alerts.push(
          this.createAlert(
            userId,
            UsageType.API_CALL,
            apiPercentage >= 100 ? 100 : 80,
            dailyUsage.apiCalls,
            dailyUsage.apiQuota
          )
        );
      }
    }

    // Check voice minutes (80% and 100%)
    if (monthlyUsage.voiceQuota !== -1) {
      const voicePercentage = (monthlyUsage.voiceMinutes / monthlyUsage.voiceQuota) * 100;
      if (voicePercentage >= 80) {
        alerts.push(
          this.createAlert(
            userId,
            UsageType.VOICE_MINUTE,
            voicePercentage >= 100 ? 100 : 80,
            monthlyUsage.voiceMinutes,
            monthlyUsage.voiceQuota
          )
        );
      }
    }

    // Check storage (80% and 100%)
    const storagePercentage = (Number(monthlyUsage.storageUsed) / Number(monthlyUsage.storageQuota)) * 100;
    if (storagePercentage >= 80) {
      alerts.push(
        this.createAlert(
          userId,
          UsageType.STORAGE,
          storagePercentage >= 100 ? 100 : 80,
          Number(monthlyUsage.storageUsed),
          Number(monthlyUsage.storageQuota)
        )
      );
    }

    // Check recordings (80% and 100%)
    if (monthlyUsage.recordingQuota !== -1) {
      const recordingPercentage = (monthlyUsage.recordingCount / monthlyUsage.recordingQuota) * 100;
      if (recordingPercentage >= 80) {
        alerts.push(
          this.createAlert(
            userId,
            UsageType.RECORDING,
            recordingPercentage >= 100 ? 100 : 80,
            monthlyUsage.recordingCount,
            monthlyUsage.recordingQuota
          )
        );
      }
    }

    await Promise.all(alerts);
  }

  /**
   * Create a usage alert
   */
  private async createAlert(
    userId: string,
    type: UsageType,
    threshold: number,
    currentUsage: number,
    limit: number
  ) {
    // Check if alert already exists and is not notified
    const existingAlert = await prisma.usageAlert.findFirst({
      where: {
        userId,
        type,
        threshold,
        notified: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (existingAlert) {
      return existingAlert;
    }

    return prisma.usageAlert.create({
      data: {
        userId,
        type,
        threshold,
        currentUsage,
        limit,
      },
    });
  }

  /**
   * Get tier quotas for a subscription tier
   */
  static getTierQuotas(tier: SubscriptionTier) {
    return UsageTrackingService.TIER_QUOTAS[tier];
  }
}

export default new UsageTrackingService();
