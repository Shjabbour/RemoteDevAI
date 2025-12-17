import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { renderEmail } from '../utils/emailRenderer';
import { emailQueue } from '../jobs/emailQueue';

const prisma = new PrismaClient();

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initialize email transporter based on configuration
   */
  static async initialize() {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';

    if (provider === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY || '',
        },
      });
    } else if (provider === 'resend') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY || '',
        },
      });
    } else {
      // Default SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }

    // Verify connection
    try {
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send email directly (synchronous)
   */
  static async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      await this.initialize();
    }

    const { to, subject, template, variables = {}, userId, metadata = {} } = options;

    try {
      // Check if user has unsubscribed
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            marketingEmails: true,
            productUpdates: true,
            weeklyDigest: true,
          },
        });

        // Check email preferences based on template type
        if (user && !this.canSendEmail(template, user)) {
          console.log(`User ${userId} has unsubscribed from ${template} emails`);
          return { success: false, error: 'User unsubscribed' };
        }
      }

      // Render email template
      const { html, text } = await renderEmail(template, variables);

      // Send email
      const info = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@remotedevai.com',
        to,
        subject,
        html,
        text,
      });

      // Log email in database
      await this.logEmail({
        to,
        userId,
        template,
        subject,
        status: 'SENT',
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        messageId: info.messageId,
        metadata,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Error sending email:', error);

      // Log failed email
      await this.logEmail({
        to,
        userId,
        template,
        subject,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Queue email for async delivery (recommended for bulk emails)
   */
  static async queueEmail(options: EmailOptions): Promise<{ success: boolean; jobId?: string }> {
    try {
      const job = await emailQueue.add('send-email', options, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      return {
        success: true,
        jobId: job.id?.toString(),
      };
    } catch (error) {
      console.error('Error queuing email:', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Check if email can be sent based on user preferences
   */
  private static canSendEmail(
    template: string,
    preferences: { marketingEmails: boolean; productUpdates: boolean; weeklyDigest: boolean }
  ): boolean {
    // Transactional emails (always send)
    const transactionalTemplates = [
      'verify-email',
      'password-reset',
      'payment-success',
      'payment-failed',
      'subscription-created',
      'subscription-cancelled',
    ];

    if (transactionalTemplates.includes(template)) {
      return true;
    }

    // Marketing emails
    if (template === 'feature-announcement' && !preferences.marketingEmails) {
      return false;
    }

    // Product updates
    if (template === 'trial-ending' && !preferences.productUpdates) {
      return false;
    }

    // Weekly digest
    if (template === 'weekly-summary' && !preferences.weeklyDigest) {
      return false;
    }

    // Agent offline notifications
    if (template === 'agent-offline' && !preferences.productUpdates) {
      return false;
    }

    return true;
  }

  /**
   * Log email in database
   */
  private static async logEmail(data: {
    to: string;
    userId?: string;
    template: string;
    subject: string;
    status: string;
    provider?: string;
    messageId?: string;
    error?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await prisma.emailLog.create({
        data: {
          to: data.to,
          userId: data.userId,
          template: data.template,
          subject: data.subject,
          status: data.status as any,
          provider: data.provider,
          messageId: data.messageId,
          error: data.error,
          metadata: data.metadata || {},
          sentAt: data.status === 'SENT' ? new Date() : null,
        },
      });
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  /**
   * Track email open (called when user opens tracking pixel)
   */
  static async trackOpen(messageId: string) {
    try {
      await prisma.emailLog.updateMany({
        where: { messageId },
        data: { openedAt: new Date() },
      });
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  /**
   * Track email click (called when user clicks tracked link)
   */
  static async trackClick(messageId: string) {
    try {
      await prisma.emailLog.updateMany({
        where: { messageId },
        data: { clickedAt: new Date() },
      });
    } catch (error) {
      console.error('Error tracking email click:', error);
    }
  }

  /**
   * Handle unsubscribe
   */
  static async unsubscribe(token: string, type?: 'marketing' | 'product' | 'digest' | 'all') {
    try {
      const user = await prisma.user.findUnique({
        where: { unsubscribeToken: token },
      });

      if (!user) {
        throw new Error('Invalid unsubscribe token');
      }

      const updateData: any = {};

      if (type === 'all' || !type) {
        updateData.marketingEmails = false;
        updateData.productUpdates = false;
        updateData.weeklyDigest = false;
      } else if (type === 'marketing') {
        updateData.marketingEmails = false;
      } else if (type === 'product') {
        updateData.productUpdates = false;
      } else if (type === 'digest') {
        updateData.weeklyDigest = false;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return { success: true, userId: user.id };
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unsubscribe' };
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(userId: string, userName: string, email: string) {
    return this.queueEmail({
      to: email,
      subject: 'Welcome to RemoteDevAI!',
      template: 'welcome',
      variables: {
        userName,
      },
      userId,
    });
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(email: string, verificationToken: string, userId?: string) {
    const verificationUrl = `${process.env.WEB_URL || 'https://remotedevai.com'}/verify-email?token=${verificationToken}`;

    return this.queueEmail({
      to: email,
      subject: 'Verify your email address',
      template: 'verify-email',
      variables: {
        verificationUrl,
      },
      userId,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string, userId?: string) {
    const resetUrl = `${process.env.WEB_URL || 'https://remotedevai.com'}/reset-password?token=${resetToken}`;

    return this.queueEmail({
      to: email,
      subject: 'Reset your password',
      template: 'password-reset',
      variables: {
        resetUrl,
      },
      userId,
    });
  }

  /**
   * Send subscription created email
   */
  static async sendSubscriptionCreatedEmail(userId: string, email: string, tier: string) {
    return this.queueEmail({
      to: email,
      subject: `Welcome to RemoteDevAI ${tier}!`,
      template: 'subscription-created',
      variables: {
        tier,
      },
      userId,
    });
  }

  /**
   * Send subscription cancelled email
   */
  static async sendSubscriptionCancelledEmail(userId: string, email: string, tier: string, endDate: Date) {
    return this.queueEmail({
      to: email,
      subject: 'Your subscription has been cancelled',
      template: 'subscription-cancelled',
      variables: {
        tier,
        endDate: endDate.toLocaleDateString(),
      },
      userId,
    });
  }

  /**
   * Send payment success email
   */
  static async sendPaymentSuccessEmail(userId: string, email: string, amount: number, date: Date) {
    return this.queueEmail({
      to: email,
      subject: 'Payment received - RemoteDevAI',
      template: 'payment-success',
      variables: {
        amount: (amount / 100).toFixed(2), // Convert cents to dollars
        date: date.toLocaleDateString(),
      },
      userId,
    });
  }

  /**
   * Send payment failed email
   */
  static async sendPaymentFailedEmail(userId: string, email: string) {
    return this.queueEmail({
      to: email,
      subject: 'Payment failed - Action required',
      template: 'payment-failed',
      variables: {},
      userId,
    });
  }

  /**
   * Send trial ending reminder
   */
  static async sendTrialEndingEmail(userId: string, email: string, daysLeft: number) {
    return this.queueEmail({
      to: email,
      subject: `Your trial ends in ${daysLeft} days`,
      template: 'trial-ending',
      variables: {
        daysLeft,
      },
      userId,
    });
  }

  /**
   * Send agent offline notification
   */
  static async sendAgentOfflineEmail(userId: string, email: string, agentName: string, lastSeen: Date) {
    return this.queueEmail({
      to: email,
      subject: 'Your desktop agent went offline',
      template: 'agent-offline',
      variables: {
        agentName,
        lastSeen: lastSeen.toLocaleString(),
      },
      userId,
    });
  }

  /**
   * Send weekly summary
   */
  static async sendWeeklySummaryEmail(
    userId: string,
    email: string,
    stats: {
      sessions: number;
      projects: number;
      totalTime: number;
      recordings: number;
    }
  ) {
    return this.queueEmail({
      to: email,
      subject: 'Your weekly RemoteDevAI summary',
      template: 'weekly-summary',
      variables: {
        ...stats,
      },
      userId,
    });
  }

  /**
   * Send feature announcement
   */
  static async sendFeatureAnnouncementEmail(
    email: string,
    featureName: string,
    featureDescription: string,
    userId?: string
  ) {
    return this.queueEmail({
      to: email,
      subject: `New feature: ${featureName}`,
      template: 'feature-announcement',
      variables: {
        featureName,
        featureDescription,
      },
      userId,
    });
  }
}

export default EmailService;
