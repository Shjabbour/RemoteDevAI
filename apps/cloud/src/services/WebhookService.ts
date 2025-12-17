import { PrismaClient } from '@prisma/client';
import axios, { AxiosRequestConfig } from 'axios';
import {
  generateWebhookSecret,
  formatWebhookEventId,
  createWebhookHeaders,
  WebhookPayload,
} from '../utils/webhookSigner';

const prisma = new PrismaClient();

/**
 * Supported webhook events
 */
export const WEBHOOK_EVENTS = {
  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',

  // Session events
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',
  SESSION_MESSAGE: 'session.message',
  SESSION_PAUSED: 'session.paused',
  SESSION_RESUMED: 'session.resumed',

  // Recording events
  RECORDING_COMPLETED: 'recording.completed',
  RECORDING_FAILED: 'recording.failed',

  // Agent events
  AGENT_CONNECTED: 'agent.connected',
  AGENT_DISCONNECTED: 'agent.disconnected',
  AGENT_STATUS_CHANGED: 'agent.status_changed',

  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',

  // Storage events
  STORAGE_QUOTA_WARNING: 'storage.quota_warning',
  STORAGE_QUOTA_EXCEEDED: 'storage.quota_exceeded',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

export interface CreateWebhookData {
  name: string;
  url: string;
  events: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
  description?: string;
  headers?: Record<string, string>;
  active?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface TriggerWebhookEventData {
  eventType: WebhookEventType;
  userId: string;
  data: any;
  metadata?: Record<string, any>;
}

export class WebhookService {
  /**
   * Get all available webhook events
   */
  static getAvailableEvents(): { event: string; description: string }[] {
    return [
      { event: WEBHOOK_EVENTS.PROJECT_CREATED, description: 'Triggered when a project is created' },
      { event: WEBHOOK_EVENTS.PROJECT_UPDATED, description: 'Triggered when a project is updated' },
      { event: WEBHOOK_EVENTS.PROJECT_DELETED, description: 'Triggered when a project is deleted' },
      { event: WEBHOOK_EVENTS.SESSION_STARTED, description: 'Triggered when a session starts' },
      { event: WEBHOOK_EVENTS.SESSION_ENDED, description: 'Triggered when a session ends' },
      { event: WEBHOOK_EVENTS.SESSION_MESSAGE, description: 'Triggered when a message is sent in a session' },
      { event: WEBHOOK_EVENTS.SESSION_PAUSED, description: 'Triggered when a session is paused' },
      { event: WEBHOOK_EVENTS.SESSION_RESUMED, description: 'Triggered when a session is resumed' },
      { event: WEBHOOK_EVENTS.RECORDING_COMPLETED, description: 'Triggered when a recording is completed' },
      { event: WEBHOOK_EVENTS.RECORDING_FAILED, description: 'Triggered when a recording fails' },
      { event: WEBHOOK_EVENTS.AGENT_CONNECTED, description: 'Triggered when an agent connects' },
      { event: WEBHOOK_EVENTS.AGENT_DISCONNECTED, description: 'Triggered when an agent disconnects' },
      { event: WEBHOOK_EVENTS.AGENT_STATUS_CHANGED, description: 'Triggered when agent status changes' },
      { event: WEBHOOK_EVENTS.SUBSCRIPTION_CREATED, description: 'Triggered when a subscription is created' },
      { event: WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED, description: 'Triggered when a subscription is updated' },
      { event: WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED, description: 'Triggered when a subscription is cancelled' },
      { event: WEBHOOK_EVENTS.PAYMENT_SUCCEEDED, description: 'Triggered when a payment succeeds' },
      { event: WEBHOOK_EVENTS.PAYMENT_FAILED, description: 'Triggered when a payment fails' },
      { event: WEBHOOK_EVENTS.STORAGE_QUOTA_WARNING, description: 'Triggered when storage quota reaches warning threshold' },
      { event: WEBHOOK_EVENTS.STORAGE_QUOTA_EXCEEDED, description: 'Triggered when storage quota is exceeded' },
      { event: WEBHOOK_EVENTS.USER_CREATED, description: 'Triggered when a user is created' },
      { event: WEBHOOK_EVENTS.USER_UPDATED, description: 'Triggered when a user is updated' },
      { event: WEBHOOK_EVENTS.USER_DELETED, description: 'Triggered when a user is deleted' },
    ];
  }

  /**
   * Create a new webhook
   */
  static async createWebhook(userId: string, data: CreateWebhookData) {
    // Generate a secure secret for this webhook
    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        name: data.name,
        url: data.url,
        secret,
        events: data.events,
        description: data.description,
        headers: data.headers || {},
        maxRetries: data.maxRetries || 3,
        retryDelay: data.retryDelay || 60,
      },
    });

    // Return webhook with secret (only shown once during creation)
    return {
      ...webhook,
      secret, // Include secret in response for first-time setup
    };
  }

  /**
   * Get all webhooks for a user
   */
  static async getWebhooks(userId: string, options: { includeInactive?: boolean } = {}) {
    const { includeInactive = false } = options;

    const where: any = { userId };
    if (!includeInactive) {
      where.active = true;
    }

    const webhooks = await prisma.webhook.findMany({
      where,
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't include secret in list response
    return webhooks.map(webhook => {
      const { secret, ...rest } = webhook;
      return {
        ...rest,
        secretPreview: `${secret.substring(0, 8)}...`,
      };
    });
  }

  /**
   * Get a single webhook
   */
  static async getWebhook(webhookId: string, userId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Don't include full secret
    const { secret, ...rest } = webhook;
    return {
      ...rest,
      secretPreview: `${secret.substring(0, 8)}...`,
    };
  }

  /**
   * Update a webhook
   */
  static async updateWebhook(webhookId: string, userId: string, data: UpdateWebhookData) {
    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!existing) {
      throw new Error('Webhook not found');
    }

    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Don't include secret in response
    const { secret, ...rest } = webhook;
    return {
      ...rest,
      secretPreview: `${secret.substring(0, 8)}...`,
    };
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(webhookId: string, userId: string) {
    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!existing) {
      throw new Error('Webhook not found');
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return { success: true };
  }

  /**
   * Regenerate webhook secret
   */
  static async regenerateSecret(webhookId: string, userId: string) {
    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!existing) {
      throw new Error('Webhook not found');
    }

    const newSecret = generateWebhookSecret();

    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        secret: newSecret,
        updatedAt: new Date(),
      },
    });

    return {
      webhookId: webhook.id,
      secret: newSecret, // Return new secret (only shown once)
    };
  }

  /**
   * Get webhook deliveries
   */
  static async getDeliveries(
    webhookId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ) {
    const { page = 1, limit = 50, status } = options;
    const skip = (page - 1) * limit;

    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const where: any = { webhookId };
    if (status) {
      where.status = status;
    }

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    return {
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Trigger webhook event
   * This is called by other services when events occur
   */
  static async triggerEvent(data: TriggerWebhookEventData) {
    const { eventType, userId, data: eventData, metadata } = data;

    // Find all active webhooks for this user that are subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        active: true,
        events: {
          has: eventType,
        },
      },
    });

    if (webhooks.length === 0) {
      return { triggered: 0 };
    }

    // Create webhook deliveries for each webhook
    const deliveryPromises = webhooks.map(async (webhook) => {
      const eventId = formatWebhookEventId();

      const payload: WebhookPayload = {
        id: eventId,
        type: eventType,
        created: new Date().toISOString(),
        data: eventData,
      };

      // Create delivery record
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventId,
          eventType,
          payload: payload as any,
          status: 'PENDING',
          maxAttempts: webhook.maxRetries,
        },
      });

      // Queue delivery (this will be picked up by the job queue)
      // For now, we'll trigger immediately (in production, use Bull queue)
      this.deliverWebhook(delivery.id).catch((error) => {
        console.error(`Failed to deliver webhook ${delivery.id}:`, error);
      });

      return delivery;
    });

    await Promise.all(deliveryPromises);

    // Update last triggered timestamp
    await prisma.webhook.updateMany({
      where: {
        id: { in: webhooks.map(w => w.id) },
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    return { triggered: webhooks.length };
  }

  /**
   * Deliver a webhook
   * This is called by the job queue or directly
   */
  static async deliverWebhook(deliveryId: string) {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const { webhook } = delivery;

    try {
      // Update status to sending
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENDING',
          attempts: delivery.attempts + 1,
          lastAttemptAt: new Date(),
        },
      });

      // Create headers
      const headers = createWebhookHeaders(
        delivery.payload as WebhookPayload,
        webhook.secret,
        webhook.headers as Record<string, string>
      );

      // Send webhook
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: webhook.url,
        headers,
        data: delivery.payload,
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status >= 200 && status < 300,
      };

      const response = await axios(config);

      // Success
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          responseCode: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 10000), // Limit response size
          responseHeaders: response.headers as any,
          deliveredAt: new Date(),
        },
      });

      return { success: true };
    } catch (error: any) {
      const newAttempts = delivery.attempts + 1;
      const shouldRetry = newAttempts < delivery.maxAttempts;

      // Calculate next retry time with exponential backoff
      let nextRetryAt: Date | null = null;
      if (shouldRetry) {
        const backoffSeconds = webhook.retryDelay * Math.pow(2, newAttempts - 1);
        nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
      }

      // Update delivery record
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: shouldRetry ? 'RETRYING' : 'FAILED',
          responseCode: error.response?.status || null,
          responseBody: error.response?.data
            ? JSON.stringify(error.response.data).substring(0, 10000)
            : null,
          responseHeaders: error.response?.headers as any,
          errorMessage: error.message,
          nextRetryAt,
        },
      });

      // Schedule retry if needed
      if (shouldRetry) {
        // In production, this would queue the retry in Bull
        setTimeout(() => {
          this.deliverWebhook(deliveryId).catch(console.error);
        }, (nextRetryAt!.getTime() - Date.now()));
      }

      throw error;
    }
  }

  /**
   * Test a webhook
   * Sends a test payload to verify the webhook is working
   */
  static async testWebhook(webhookId: string, userId: string) {
    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Create test payload
    const eventId = formatWebhookEventId('test');
    const payload: WebhookPayload = {
      id: eventId,
      type: 'webhook.test',
      created: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from RemoteDevAI',
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
    };

    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventId,
        eventType: 'webhook.test',
        payload: payload as any,
        status: 'PENDING',
        maxAttempts: 1, // Only one attempt for test
      },
    });

    // Try to deliver
    try {
      await this.deliverWebhook(delivery.id);
      return {
        success: true,
        message: 'Test webhook sent successfully',
        deliveryId: delivery.id,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Test webhook failed',
        error: error.message,
        deliveryId: delivery.id,
      };
    }
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(webhookId: string, userId: string) {
    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const [
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      recentDeliveries,
    ] = await Promise.all([
      prisma.webhookDelivery.count({
        where: { webhookId },
      }),
      prisma.webhookDelivery.count({
        where: { webhookId, status: 'SUCCESS' },
      }),
      prisma.webhookDelivery.count({
        where: { webhookId, status: 'FAILED' },
      }),
      prisma.webhookDelivery.count({
        where: { webhookId, status: { in: ['PENDING', 'SENDING', 'RETRYING'] } },
      }),
      prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const successRate = totalDeliveries > 0
      ? (successfulDeliveries / totalDeliveries) * 100
      : 0;

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      successRate: Math.round(successRate * 100) / 100,
      recentDeliveries,
    };
  }
}

export default WebhookService;
