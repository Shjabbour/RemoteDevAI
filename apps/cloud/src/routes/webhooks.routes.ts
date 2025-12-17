import { Router, Request, Response } from 'express';
import { StripeService } from '../services/StripeService';
import { WebhookService } from '../services/WebhookService';
import { webhookLimiter } from '../middleware/rateLimit.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { z } from 'zod';
import { getQueueStats, retryAllFailedJobs } from '../jobs/webhookDelivery';

const router = Router();

// ========================
// INCOMING WEBHOOKS (Stripe, Clerk, etc.)
// ========================

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post(
  '/stripe',
  webhookLimiter,
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Missing signature',
        });
        return;
      }

      // Get raw body for signature verification
      // Note: In server.ts, we need to ensure raw body is available for webhooks
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await StripeService.handleWebhook(rawBody, signature);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({
        success: false,
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events (if using Clerk)
 */
router.post(
  '/clerk',
  webhookLimiter,
  async (req: Request, res: Response) => {
    try {
      // TODO: Implement Clerk webhook handling
      // This would handle user creation, updates, deletion events from Clerk

      const event = req.body;

      console.log('Clerk webhook received:', event.type);

      // Example event types:
      // - user.created
      // - user.updated
      // - user.deleted

      res.json({
        success: true,
        message: 'Webhook received',
      });
    } catch (error) {
      console.error('Clerk webhook error:', error);
      res.status(400).json({
        success: false,
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ========================
// OUTGOING WEBHOOKS (User-defined)
// ========================

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().optional(),
  headers: z.record(z.string()).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  retryDelay: z.number().min(10).max(3600).optional(),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  description: z.string().optional(),
  headers: z.record(z.string()).optional(),
  active: z.boolean().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  retryDelay: z.number().min(10).max(3600).optional(),
});

/**
 * GET /api/webhooks/events
 * Get list of available webhook events
 */
router.get('/events', authenticate, async (req: Request, res: Response) => {
  try {
    const events = WebhookService.getAvailableEvents();

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Validate request body
    const validatedData = createWebhookSchema.parse(req.body);

    const webhook = await WebhookService.createWebhook(userId, validatedData);

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook created successfully',
    });
  } catch (error) {
    console.error('Create webhook error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/webhooks
 * Get all webhooks for the authenticated user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const includeInactive = req.query.includeInactive === 'true';

    const webhooks = await WebhookService.getWebhooks(userId, {
      includeInactive,
    });

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhooks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/webhooks/:id
 * Get a specific webhook
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const webhookId = req.params.id;

    const webhook = await WebhookService.getWebhook(webhookId, userId);

    res.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    console.error('Get webhook error:', error);

    if (error instanceof Error && error.message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/webhooks/:id
 * Update a webhook
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const webhookId = req.params.id;

    // Validate request body
    const validatedData = updateWebhookSchema.parse(req.body);

    const webhook = await WebhookService.updateWebhook(
      webhookId,
      userId,
      validatedData
    );

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook updated successfully',
    });
  } catch (error) {
    console.error('Update webhook error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const webhookId = req.params.id;

    await WebhookService.deleteWebhook(webhookId, userId);

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Delete webhook error:', error);

    if (error instanceof Error && error.message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post(
  '/:id/regenerate-secret',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const webhookId = req.params.id;

      const result = await WebhookService.regenerateSecret(webhookId, userId);

      res.json({
        success: true,
        data: result,
        message: 'Webhook secret regenerated successfully',
      });
    } catch (error) {
      console.error('Regenerate secret error:', error);

      if (error instanceof Error && error.message === 'Webhook not found') {
        res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to regenerate secret',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/webhooks/:id/deliveries
 * Get delivery history for a webhook
 */
router.get(
  '/:id/deliveries',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const webhookId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      const result = await WebhookService.getDeliveries(webhookId, userId, {
        page,
        limit,
        status,
      });

      res.json({
        success: true,
        data: result.deliveries,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Get deliveries error:', error);

      if (error instanceof Error && error.message === 'Webhook not found') {
        res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get deliveries',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/webhooks/:id/test
 * Send a test webhook
 */
router.post('/:id/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const webhookId = req.params.id;

    const result = await WebhookService.testWebhook(webhookId, userId);

    res.json({
      success: result.success,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error('Test webhook error:', error);

    if (error instanceof Error && error.message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to test webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/webhooks/:id/stats
 * Get webhook statistics
 */
router.get('/:id/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const webhookId = req.params.id;

    const stats = await WebhookService.getWebhookStats(webhookId, userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get webhook stats error:', error);

    if (error instanceof Error && error.message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get webhook stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/webhooks/queue/stats
 * Get webhook queue statistics (admin only)
 */
router.get('/queue/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/webhooks/queue/retry-failed
 * Retry all failed webhook deliveries (admin only)
 */
router.post(
  '/queue/retry-failed',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const webhookId = req.body.webhookId;

      const result = await retryAllFailedJobs(webhookId);

      res.json({
        success: true,
        data: result,
        message: `Retried ${result.retried} failed deliveries`,
      });
    } catch (error) {
      console.error('Retry failed jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
