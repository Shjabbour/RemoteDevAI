import { Router, Request, Response } from 'express';
import { StripeService } from '../services/StripeService';
import { webhookLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

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

export default router;
