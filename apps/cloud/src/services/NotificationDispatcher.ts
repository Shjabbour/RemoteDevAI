import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { EmailService } from './EmailService';

const prisma = new PrismaClient();

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

export class NotificationDispatcher {
  private static io: SocketServer | null = null;

  /**
   * Initialize with Socket.IO instance
   */
  static initialize(io: SocketServer) {
    this.io = io;
  }

  /**
   * Send notification to user across all enabled channels
   */
  static async send(userId: string, payload: NotificationPayload) {
    const results = {
      inApp: false,
      push: false,
      email: false,
    };

    // Always create in-app notification (for notification center)
    const notification = await this.createInAppNotification(userId, payload);
    results.inApp = true;

    // Check preferences and send to appropriate channels
    const [shouldSendPush, shouldSendEmail] = await Promise.all([
      NotificationPreferencesService.shouldSendNotification(userId, payload.type, 'push'),
      NotificationPreferencesService.shouldSendNotification(userId, payload.type, 'email'),
    ]);

    // Send push notification
    if (shouldSendPush) {
      try {
        await this.sendPushNotification(userId, payload);
        results.push = true;
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }

    // Send email notification
    if (shouldSendEmail) {
      try {
        const preferences = await NotificationPreferencesService.getPreferences(userId);

        // If realtime email, send immediately, otherwise it will be included in digest
        if (preferences.emailDigest === 'REALTIME') {
          await this.sendEmailNotification(userId, payload);
          results.email = true;
        }
      } catch (error) {
        console.error('Error sending email notification:', error);
      }
    }

    // Send real-time socket notification
    this.sendSocketNotification(userId, notification);

    return {
      notification,
      sent: results,
    };
  }

  /**
   * Create in-app notification in database
   */
  private static async createInAppNotification(userId: string, payload: NotificationPayload) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        actionUrl: payload.actionUrl,
        actionText: payload.actionText,
        priority: payload.priority || 'NORMAL',
        expiresAt: payload.expiresAt,
      },
    });

    return notification;
  }

  /**
   * Send real-time notification via WebSocket
   */
  private static sendSocketNotification(userId: string, notification: any) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(userId: string, payload: NotificationPayload) {
    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      return;
    }

    const preferences = await NotificationPreferencesService.getPreferences(userId);

    // Send to each subscription
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        if (subscription.deviceType === 'WEB') {
          await this.sendWebPush(subscription, payload, preferences.pushSound);
        } else if (subscription.deviceType.includes('MOBILE')) {
          await this.sendMobilePush(subscription, payload, preferences.pushSound);
        } else if (subscription.deviceType.includes('DESKTOP')) {
          await this.sendDesktopPush(subscription, payload, preferences.pushSound);
        }

        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date(), failureCount: 0 },
        });
      } catch (error) {
        console.error(`Error sending push to subscription ${subscription.id}:`, error);

        // Increment failure count
        const updatedSubscription = await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { failureCount: { increment: 1 } },
        });

        // Disable subscription after 5 consecutive failures
        if (updatedSubscription.failureCount >= 5) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false },
          });
        }
      }
    });

    await Promise.allSettled(pushPromises);
  }

  /**
   * Send web push notification (VAPID)
   */
  private static async sendWebPush(subscription: any, payload: NotificationPayload, sound: boolean) {
    // TODO: Implement Web Push using web-push library
    // This would use VAPID keys to send notifications to browsers
    console.log('Web push not yet implemented:', { subscription, payload, sound });
  }

  /**
   * Send mobile push notification (Expo Push)
   */
  private static async sendMobilePush(subscription: any, payload: NotificationPayload, sound: boolean) {
    // TODO: Implement Expo Push notifications for mobile apps
    console.log('Mobile push not yet implemented:', { subscription, payload, sound });
  }

  /**
   * Send desktop push notification
   */
  private static async sendDesktopPush(subscription: any, payload: NotificationPayload, sound: boolean) {
    // TODO: Implement desktop notifications via Electron IPC
    console.log('Desktop push not yet implemented:', { subscription, payload, sound });
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(userId: string, payload: NotificationPayload) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user || !user.email) {
      return;
    }

    const emailTemplate = this.getEmailTemplate(payload);

    await EmailService.sendEmail({
      to: user.email,
      subject: payload.title,
      template: emailTemplate.template,
      data: {
        name: user.name || 'User',
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
        actionText: payload.actionText || 'View Details',
        ...payload.data,
      },
    });
  }

  /**
   * Get email template for notification type
   */
  private static getEmailTemplate(payload: NotificationPayload) {
    const templates: Record<NotificationType, { template: string }> = {
      SESSION_STARTED: { template: 'session-started' },
      SESSION_ENDED: { template: 'session-ended' },
      AGENT_CONNECTED: { template: 'agent-connected' },
      AGENT_DISCONNECTED: { template: 'agent-disconnected' },
      RECORDING_READY: { template: 'recording-ready' },
      PAYMENT_REMINDER: { template: 'payment-reminder' },
      PAYMENT_FAILED: { template: 'payment-failed' },
      PRODUCT_UPDATE: { template: 'product-update' },
      WEEKLY_REPORT: { template: 'weekly-report' },
      SECURITY_ALERT: { template: 'security-alert' },
      SUBSCRIPTION_CHANGED: { template: 'subscription-changed' },
      SYSTEM_MAINTENANCE: { template: 'system-maintenance' },
    };

    return templates[payload.type] || { template: 'notification-generic' };
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMany(userIds: string[], payload: NotificationPayload) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.send(userId, payload))
    );

    return results;
  }

  /**
   * Broadcast notification to all users
   */
  static async broadcast(payload: NotificationPayload) {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    return this.sendToMany(
      users.map((u) => u.id),
      payload
    );
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return notification;
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return result;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return count;
  }

  /**
   * Get user notifications with pagination
   */
  static async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { read: false }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({
        where: {
          userId,
          ...(unreadOnly && { read: false }),
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  /**
   * Delete all notifications for user
   */
  static async deleteAllNotifications(userId: string) {
    await prisma.notification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Clean up expired notifications (run as cron job)
   */
  static async cleanupExpiredNotifications() {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Send digest email to users
   */
  static async sendDigestEmails(frequency: 'HOURLY' | 'DAILY' | 'WEEKLY') {
    const users = await NotificationPreferencesService.getUsersForEmailDigest(frequency);

    const results = await Promise.allSettled(
      users.map(async (user) => {
        // Get unread notifications since last digest
        const timeframe = this.getDigestTimeframe(frequency);
        const notifications = await prisma.notification.findMany({
          where: {
            userId: user.userId,
            read: false,
            createdAt: {
              gte: timeframe,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (notifications.length === 0) {
          return null;
        }

        // Send digest email
        await EmailService.sendEmail({
          to: user.email,
          subject: `Your ${frequency.toLowerCase()} digest - ${notifications.length} new notifications`,
          template: 'notification-digest',
          data: {
            name: user.name || 'User',
            frequency,
            notifications,
            count: notifications.length,
          },
        });

        return user.userId;
      })
    );

    return results;
  }

  /**
   * Get timeframe for digest based on frequency
   */
  private static getDigestTimeframe(frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'): Date {
    const now = new Date();

    switch (frequency) {
      case 'HOURLY':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'DAILY':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

export default NotificationDispatcher;
