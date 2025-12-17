import { PrismaClient, DigestFrequency, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationPreferencesInput {
  // Email notifications
  emailEnabled?: boolean;
  emailDigest?: DigestFrequency;

  // Push notifications
  pushEnabled?: boolean;
  pushSound?: boolean;

  // In-app notifications
  inAppEnabled?: boolean;

  // Specific notification types
  sessionStarted?: boolean;
  sessionEnded?: boolean;
  agentConnected?: boolean;
  agentDisconnected?: boolean;
  recordingReady?: boolean;
  paymentReminders?: boolean;
  productUpdates?: boolean;
  weeklyReport?: boolean;
  securityAlerts?: boolean;

  // Quiet hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursTimezone?: string;
}

export class NotificationPreferencesService {
  /**
   * Get user's notification preferences
   * Creates default preferences if they don't exist
   */
  static async getPreferences(userId: string) {
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(userId: string, data: NotificationPreferencesInput) {
    // Validate quiet hours if provided
    if (data.quietHoursEnabled && (data.quietHoursStart || data.quietHoursEnd)) {
      if (!data.quietHoursStart || !data.quietHoursEnd) {
        throw new Error('Both quietHoursStart and quietHoursEnd must be provided when quiet hours are enabled');
      }

      if (!this.isValidTime(data.quietHoursStart) || !this.isValidTime(data.quietHoursEnd)) {
        throw new Error('Invalid time format. Use HH:MM format (e.g., "22:00")');
      }
    }

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return preferences;
  }

  /**
   * Check if a notification should be sent based on user preferences
   */
  static async shouldSendNotification(
    userId: string,
    notificationType: NotificationType,
    channel: 'email' | 'push' | 'inApp'
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Check if the channel is enabled
    if (channel === 'email' && !preferences.emailEnabled) return false;
    if (channel === 'push' && !preferences.pushEnabled) return false;
    if (channel === 'inApp' && !preferences.inAppEnabled) return false;

    // Check quiet hours for push and email (but not in-app)
    if (channel !== 'inApp' && preferences.quietHoursEnabled) {
      if (this.isInQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd, preferences.quietHoursTimezone)) {
        // Always allow urgent notifications during quiet hours
        if (notificationType === 'SECURITY_ALERT' || notificationType === 'PAYMENT_FAILED') {
          return true;
        }
        return false;
      }
    }

    // Check specific notification type preference
    const typePreference = this.getNotificationTypePreference(preferences, notificationType);
    if (typePreference === false) return false;

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private static isInQuietHours(start: string | null, end: string | null, timezone: string): boolean {
    if (!start || !end) return false;

    try {
      const now = new Date().toLocaleString('en-US', { timeZone: timezone });
      const currentTime = new Date(now);
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      const [startHours, startMinutes] = start.split(':').map(Number);
      const startTimeInMinutes = startHours * 60 + startMinutes;

      const [endHours, endMinutes] = end.split(':').map(Number);
      const endTimeInMinutes = endHours * 60 + endMinutes;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTimeInMinutes > endTimeInMinutes) {
        return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes;
      }

      // Normal quiet hours within same day
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Get preference for specific notification type
   */
  private static getNotificationTypePreference(
    preferences: any,
    notificationType: NotificationType
  ): boolean {
    const typeMap: Record<NotificationType, keyof typeof preferences> = {
      SESSION_STARTED: 'sessionStarted',
      SESSION_ENDED: 'sessionEnded',
      AGENT_CONNECTED: 'agentConnected',
      AGENT_DISCONNECTED: 'agentDisconnected',
      RECORDING_READY: 'recordingReady',
      PAYMENT_REMINDER: 'paymentReminders',
      PAYMENT_FAILED: 'paymentReminders',
      PRODUCT_UPDATE: 'productUpdates',
      WEEKLY_REPORT: 'weeklyReport',
      SECURITY_ALERT: 'securityAlerts',
      SUBSCRIPTION_CHANGED: 'paymentReminders',
      SYSTEM_MAINTENANCE: 'productUpdates',
    };

    const prefKey = typeMap[notificationType];
    return prefKey ? preferences[prefKey] : true;
  }

  /**
   * Validate time format (HH:MM)
   */
  private static isValidTime(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  }

  /**
   * Get users who should receive email digest
   */
  static async getUsersForEmailDigest(frequency: DigestFrequency) {
    const preferences = await prisma.notificationPreferences.findMany({
      where: {
        emailEnabled: true,
        emailDigest: frequency,
      },
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

    return preferences.map((pref) => ({
      userId: pref.userId,
      email: pref.user.email,
      name: pref.user.name,
      timezone: pref.quietHoursTimezone,
    }));
  }

  /**
   * Bulk update preferences for multiple users (admin only)
   */
  static async bulkUpdatePreferences(userIds: string[], data: NotificationPreferencesInput) {
    const result = await prisma.notificationPreferences.updateMany({
      where: {
        userId: { in: userIds },
      },
      data,
    });

    return result;
  }

  /**
   * Reset preferences to defaults
   */
  static async resetToDefaults(userId: string) {
    const defaultPreferences = {
      emailEnabled: true,
      emailDigest: 'DAILY' as DigestFrequency,
      pushEnabled: true,
      pushSound: true,
      inAppEnabled: true,
      sessionStarted: true,
      sessionEnded: true,
      agentConnected: true,
      agentDisconnected: true,
      recordingReady: true,
      paymentReminders: true,
      productUpdates: true,
      weeklyReport: true,
      securityAlerts: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      quietHoursTimezone: 'UTC',
    };

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: defaultPreferences,
      create: {
        userId,
        ...defaultPreferences,
      },
    });

    return preferences;
  }

  /**
   * Delete user preferences (cleanup on user deletion)
   */
  static async deletePreferences(userId: string) {
    await prisma.notificationPreferences.delete({
      where: { userId },
    });
  }
}

export default NotificationPreferencesService;
