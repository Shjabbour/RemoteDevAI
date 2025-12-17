import { PrismaClient, AuditStatus, SubscriptionTier } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Audit action types
 */
export enum AuditAction {
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  AUTH_PASSWORD_RESET = 'auth.password_reset',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_MFA_DISABLED = 'auth.mfa_disabled',
  AUTH_FAILED_LOGIN = 'auth.failed_login',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',

  // User actions
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_EMAIL_CHANGED = 'user.email_changed',
  USER_PROFILE_UPDATED = 'user.profile_updated',
  USER_PREFERENCES_UPDATED = 'user.preferences_updated',

  // Project actions
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',
  PROJECT_ARCHIVED = 'project.archived',
  PROJECT_SHARED = 'project.shared',
  PROJECT_SETTINGS_UPDATED = 'project.settings_updated',

  // Session actions
  SESSION_STARTED = 'session.started',
  SESSION_ENDED = 'session.ended',
  SESSION_PAUSED = 'session.paused',
  SESSION_RESUMED = 'session.resumed',
  SESSION_ARCHIVED = 'session.archived',

  // Recording actions
  RECORDING_CREATED = 'recording.created',
  RECORDING_DELETED = 'recording.deleted',
  RECORDING_DOWNLOADED = 'recording.downloaded',
  RECORDING_SHARED = 'recording.shared',

  // Agent actions
  AGENT_CONNECTED = 'agent.connected',
  AGENT_DISCONNECTED = 'agent.disconnected',
  AGENT_REGISTERED = 'agent.registered',
  AGENT_UPDATED = 'agent.updated',
  AGENT_REMOVED = 'agent.removed',

  // Subscription actions
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_TIER_CHANGED = 'subscription.tier_changed',

  // Payment actions
  PAYMENT_PROCESSED = 'payment.processed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',

  // API Key actions
  API_KEY_CREATED = 'api_key.created',
  API_KEY_REVOKED = 'api_key.revoked',
  API_KEY_USED = 'api_key.used',

  // Webhook actions
  WEBHOOK_CREATED = 'webhook.created',
  WEBHOOK_UPDATED = 'webhook.updated',
  WEBHOOK_DELETED = 'webhook.deleted',

  // Data actions
  EXPORT_REQUESTED = 'export.requested',
  EXPORT_COMPLETED = 'export.completed',
  IMPORT_STARTED = 'import.started',
  IMPORT_COMPLETED = 'import.completed',

  // Admin actions
  ADMIN_USER_IMPERSONATED = 'admin.user_impersonated',
  ADMIN_USER_BANNED = 'admin.user_banned',
  ADMIN_USER_UNBANNED = 'admin.user_unbanned',
  ADMIN_SETTINGS_CHANGED = 'admin.settings_changed',
  ADMIN_DATA_ACCESS = 'admin.data_access',

  // Settings actions
  SETTINGS_CHANGED = 'settings.changed',
  SETTINGS_EXPORT = 'settings.export',
  SETTINGS_IMPORT = 'settings.import',

  // Security actions
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  SECURITY_UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
}

/**
 * Resource types for audit logs
 */
export enum AuditResource {
  USER = 'user',
  PROJECT = 'project',
  SESSION = 'session',
  RECORDING = 'recording',
  AGENT = 'agent',
  API_KEY = 'api_key',
  SUBSCRIPTION = 'subscription',
  PAYMENT = 'payment',
  WEBHOOK = 'webhook',
  SETTINGS = 'settings',
  SYSTEM = 'system',
}

/**
 * Audit log data interface
 */
export interface AuditLogData {
  userId?: string;
  action: AuditAction | string;
  resource: AuditResource | string;
  resourceId?: string;
  details?: Record<string, any>;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status?: AuditStatus;
  errorMessage?: string;
  isSuspicious?: boolean;
  isAdminAction?: boolean;
}

/**
 * Audit log filters for querying
 */
export interface AuditLogFilters {
  userId?: string;
  action?: string | string[];
  resource?: string | string[];
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  isSuspicious?: boolean;
  isAdminAction?: boolean;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

/**
 * AuditService - Comprehensive audit logging service
 */
export class AuditService {
  /**
   * Retention periods by subscription tier (in days)
   */
  private static retentionPeriods: Record<SubscriptionTier, number> = {
    FREE: 7,
    PRO: 90,
    ENTERPRISE: 365,
  };

  /**
   * Sensitive fields to mask in audit logs
   */
  private static sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'privateKey',
  ];

  /**
   * Create an audit log entry
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      // Mask sensitive data
      const maskedBefore = data.before ? this.maskSensitiveData(data.before) : null;
      const maskedAfter = data.after ? this.maskSensitiveData(data.after) : null;
      const maskedDetails = data.details ? this.maskSensitiveData(data.details) : null;

      // Calculate expiration based on user's tier
      let expiresAt: Date | null = null;
      if (data.userId) {
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { subscriptionTier: true },
        });

        if (user) {
          const retentionDays = this.retentionPeriods[user.subscriptionTier];
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + retentionDays);
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId || null,
          details: maskedDetails || null,
          before: maskedBefore || null,
          after: maskedAfter || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          requestId: data.requestId || null,
          status: data.status || AuditStatus.SUCCESS,
          errorMessage: data.errorMessage || null,
          isSuspicious: data.isSuspicious || false,
          isAdminAction: data.isAdminAction || false,
          expiresAt,
        },
      });
    } catch (error) {
      // Log to console but don't throw - audit logging should not break the app
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log a successful action
   */
  static async logSuccess(data: Omit<AuditLogData, 'status'>): Promise<void> {
    await this.log({ ...data, status: AuditStatus.SUCCESS });
  }

  /**
   * Log a failed action
   */
  static async logFailure(
    data: Omit<AuditLogData, 'status'>,
    errorMessage: string
  ): Promise<void> {
    await this.log({
      ...data,
      status: AuditStatus.FAILURE,
      errorMessage,
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspicious(data: Omit<AuditLogData, 'isSuspicious'>): Promise<void> {
    await this.log({ ...data, isSuspicious: true });
  }

  /**
   * Log admin action
   */
  static async logAdminAction(data: Omit<AuditLogData, 'isAdminAction'>): Promise<void> {
    await this.log({ ...data, isAdminAction: true });
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(filters: AuditLogFilters = {}) {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      if (Array.isArray(filters.action)) {
        where.action = { in: filters.action };
      } else {
        where.action = filters.action;
      }
    }

    if (filters.resource) {
      if (Array.isArray(filters.resource)) {
        where.resource = { in: filters.resource };
      } else {
        where.resource = filters.resource;
      }
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    if (filters.isSuspicious !== undefined) {
      where.isSuspicious = filters.isSuspicious;
    }

    if (filters.isAdminAction !== undefined) {
      where.isAdminAction = filters.isAdminAction;
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  /**
   * Get audit log by ID
   */
  static async getLogById(id: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!log) {
      throw new Error('Audit log not found');
    }

    return log;
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getLogsForResource(resource: string, resourceId: string) {
    return this.getLogs({ resource, resourceId });
  }

  /**
   * Get suspicious activities
   */
  static async getSuspiciousActivities(limit = 100) {
    return this.getLogs({ isSuspicious: true, limit });
  }

  /**
   * Get admin actions
   */
  static async getAdminActions(limit = 100) {
    return this.getLogs({ isAdminAction: true, limit });
  }

  /**
   * Delete expired audit logs
   */
  static async deleteExpired(): Promise<number> {
    const result = await prisma.auditLog.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Export audit logs to JSON
   */
  static async exportLogs(filters: AuditLogFilters = {}) {
    const { logs } = await this.getLogs({ ...filters, limit: 10000 });

    return {
      exportDate: new Date().toISOString(),
      filters,
      totalRecords: logs.length,
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        userId: log.userId,
        userEmail: log.user?.email,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        status: log.status,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        details: log.details,
        before: log.before,
        after: log.after,
        isSuspicious: log.isSuspicious,
        isAdminAction: log.isAdminAction,
      })),
    };
  }

  /**
   * Detect suspicious patterns
   */
  static async detectSuspiciousPatterns(userId: string, timeWindowMinutes = 15) {
    const since = new Date();
    since.setMinutes(since.getMinutes() - timeWindowMinutes);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });

    const patterns = {
      multipleFailedLogins: false,
      rapidActions: false,
      multipleIpAddresses: false,
      suspiciousActions: false,
    };

    // Check for multiple failed login attempts
    const failedLogins = logs.filter((log) => log.action === AuditAction.AUTH_FAILED_LOGIN);
    if (failedLogins.length >= 3) {
      patterns.multipleFailedLogins = true;
    }

    // Check for rapid actions (more than 100 in time window)
    if (logs.length > 100) {
      patterns.rapidActions = true;
    }

    // Check for multiple IP addresses
    const uniqueIps = new Set(logs.map((log) => log.ipAddress).filter(Boolean));
    if (uniqueIps.size > 3) {
      patterns.multipleIpAddresses = true;
    }

    // Check for already flagged suspicious actions
    const suspicious = logs.filter((log) => log.isSuspicious);
    if (suspicious.length > 0) {
      patterns.suspiciousActions = true;
    }

    return patterns;
  }

  /**
   * Mask sensitive data in objects
   */
  private static maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const masked = { ...data };

    for (const field of this.sensitiveFields) {
      if (field in masked) {
        masked[field] = '***REDACTED***';
      }
    }

    // Recursively mask nested objects
    for (const key in masked) {
      if (typeof masked[key] === 'object' && masked[key] !== null && !Array.isArray(masked[key])) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Get audit statistics
   */
  static async getStatistics(userId?: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      timestamp: { gte: since },
    };

    if (userId) {
      where.userId = userId;
    }

    const [
      totalLogs,
      successfulActions,
      failedActions,
      suspiciousActions,
      adminActions,
      uniqueUsers,
      actionsByType,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, status: AuditStatus.SUCCESS } }),
      prisma.auditLog.count({ where: { ...where, status: AuditStatus.FAILURE } }),
      prisma.auditLog.count({ where: { ...where, isSuspicious: true } }),
      prisma.auditLog.count({ where: { ...where, isAdminAction: true } }),
      prisma.auditLog.findMany({
        where,
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      successfulActions,
      failedActions,
      suspiciousActions,
      adminActions,
      uniqueUsers: uniqueUsers.length,
      actionsByType: actionsByType.map((item) => ({
        action: item.action,
        count: item._count,
      })),
    };
  }
}

export default AuditService;
