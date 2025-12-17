/**
 * NotificationAgent - Handles all types of notifications
 *
 * Features:
 * - Push notifications
 * - Email notifications
 * - In-app notifications
 * - Configurable triggers and quiet hours
 */

import notifier from 'node-notifier';
import nodemailer from 'nodemailer';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  NotificationPayload,
  NotificationPriority,
} from '../types';

interface NotificationResult {
  sent: boolean;
  channels: string[];
  timestamp: string;
  error?: string;
}

/**
 * Notification Agent
 */
export class NotificationAgent extends BaseAgent {
  private emailTransporter: nodemailer.Transporter | null = null;
  private notificationQueue: NotificationPayload[] = [];

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Notification Agent',
      type: AgentType.NOTIFICATION,
      enabled: true,
      retryAttempts: 3,
      timeout: 10000,
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize email transporter
   */
  protected async onInitialize(): Promise<void> {
    // Setup email transporter if credentials are available
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      this.logger.info('Email transporter initialized');
    } else {
      this.logger.warn('Email credentials not found. Email notifications disabled.');
    }
  }

  /**
   * Process notification request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<NotificationResult>> {
    if (message.type !== MessageType.NOTIFICATION) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected NOTIFICATION, got ${message.type}`
      );
    }

    const notification = message.payload as NotificationPayload;

    try {
      this.logger.info('Processing notification', {
        title: notification.title,
        priority: notification.priority,
        channels: notification.channels,
      });

      // Check if we should send notification (quiet hours, etc.)
      if (!this.shouldSendNotification(notification, context)) {
        this.logger.info('Notification queued for later (quiet hours)', {
          title: notification.title,
        });
        this.notificationQueue.push(notification);

        return this.createSuccessResponse({
          sent: false,
          channels: [],
          timestamp: new Date().toISOString(),
        });
      }

      const result = await this.sendNotification(notification, context);

      this.logger.info('Notification sent', {
        title: notification.title,
        channels: result.channels,
      });

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logger.error('Notification failed', { error });
      return this.createErrorResponse(
        'NOTIFICATION_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Check if notification should be sent now
   */
  private shouldSendNotification(
    notification: NotificationPayload,
    context: AgentContext
  ): boolean {
    // Always send critical notifications
    if (notification.priority === NotificationPriority.CRITICAL) {
      return true;
    }

    // Check quiet hours
    const quietHours = context.userPreferences.notifications.quietHours;
    if (quietHours) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = quietHours.start.split(':').map(Number);
      const [endHour, endMin] = quietHours.end.split(':').map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      // Check if current time is within quiet hours
      if (startTime <= currentTime && currentTime < endTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send notification through requested channels
   */
  private async sendNotification(
    notification: NotificationPayload,
    context: AgentContext
  ): Promise<NotificationResult> {
    const sentChannels: string[] = [];
    const preferences = context.userPreferences.notifications;

    // Send through each requested channel
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'email':
            if (preferences.email) {
              await this.sendEmail(notification, context);
              sentChannels.push('email');
            }
            break;

          case 'push':
            if (preferences.push) {
              await this.sendPush(notification);
              sentChannels.push('push');
            }
            break;

          case 'inApp':
            if (preferences.inApp) {
              await this.sendInApp(notification, context);
              sentChannels.push('inApp');
            }
            break;
        }
      } catch (error) {
        this.logger.warn(`Failed to send notification via ${channel}`, { error });
      }
    }

    return {
      sent: sentChannels.length > 0,
      channels: sentChannels,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    notification: NotificationPayload,
    context: AgentContext
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    // Get user email from environment or context
    const userEmail = process.env.USER_EMAIL || context.metadata?.userEmail;

    if (!userEmail) {
      throw new Error('User email not configured');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: userEmail,
      subject: `[${notification.priority.toUpperCase()}] ${notification.title}`,
      html: this.buildEmailTemplate(notification),
    };

    await this.emailTransporter.sendMail(mailOptions);
    this.logger.debug('Email sent', { to: userEmail, subject: mailOptions.subject });
  }

  /**
   * Build HTML email template
   */
  private buildEmailTemplate(notification: NotificationPayload): string {
    const priorityColors: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: '#6b7280',
      [NotificationPriority.MEDIUM]: '#3b82f6',
      [NotificationPriority.HIGH]: '#f59e0b',
      [NotificationPriority.CRITICAL]: '#ef4444',
    };

    const color = priorityColors[notification.priority];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: ${color}; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">View Details</a>` : ''}
            ${notification.data ? `<pre>${JSON.stringify(notification.data, null, 2)}</pre>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send push notification (desktop)
   */
  private async sendPush(notification: NotificationPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      notifier.notify(
        {
          title: notification.title,
          message: notification.message,
          sound: notification.priority === NotificationPriority.CRITICAL,
          wait: false,
          timeout: 10,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Send in-app notification
   * This would typically emit to a WebSocket connection
   */
  private async sendInApp(
    notification: NotificationPayload,
    context: AgentContext
  ): Promise<void> {
    // Emit in-app notification event
    this.emit('in-app-notification', {
      sessionId: context.sessionId,
      userId: context.userId,
      notification: {
        id: require('uuid').v4(),
        ...notification,
        timestamp: new Date().toISOString(),
        read: false,
      },
    });

    this.logger.debug('In-app notification emitted', {
      sessionId: context.sessionId,
      title: notification.title,
    });
  }

  /**
   * Send bulk notifications
   */
  public async sendBulkNotifications(
    notifications: NotificationPayload[],
    context: AgentContext
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification, context);
        results.push(result);
      } catch (error) {
        this.logger.error('Bulk notification failed', { error, notification });
        results.push({
          sent: false,
          channels: [],
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Process queued notifications
   * Call this periodically to send notifications that were queued during quiet hours
   */
  public async processQueue(context: AgentContext): Promise<void> {
    if (this.notificationQueue.length === 0) {
      return;
    }

    this.logger.info('Processing queued notifications', {
      count: this.notificationQueue.length,
    });

    const toSend = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of toSend) {
      try {
        await this.sendNotification(notification, context);
      } catch (error) {
        this.logger.error('Failed to send queued notification', { error });
        // Re-queue if failed
        this.notificationQueue.push(notification);
      }
    }
  }

  /**
   * Get queued notifications count
   */
  public getQueueSize(): number {
    return this.notificationQueue.length;
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    if (this.emailTransporter) {
      this.emailTransporter.close();
      this.emailTransporter = null;
    }
  }
}
