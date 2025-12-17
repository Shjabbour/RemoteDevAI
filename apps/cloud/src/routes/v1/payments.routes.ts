import { Router } from 'express';
import { StripeService } from '../services/StripeService';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import config from '../config';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/payments/subscription
 * Get current subscription details
 */
router.get('/subscription', async (req: AuthRequest, res) => {
  try {
    const subscription = await StripeService.getSubscription(req.user!.userId);

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payments/checkout
 * Create a checkout session
 */
router.post('/checkout', async (req: AuthRequest, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId || !successUrl || !cancelUrl) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'priceId, successUrl, and cancelUrl are required',
      });
      return;
    }

    const result = await StripeService.createCheckoutSession({
      userId: req.user!.userId,
      priceId,
      successUrl,
      cancelUrl,
    });

    res.json({
      success: true,
      data: result,
      message: 'Checkout session created',
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payments/portal
 * Create a portal session for managing subscription
 */
router.post('/portal', async (req: AuthRequest, res) => {
  try {
    const { returnUrl } = req.body;

    if (!returnUrl) {
      res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'returnUrl is required',
      });
      return;
    }

    const result = await StripeService.createPortalSession({
      userId: req.user!.userId,
      returnUrl,
    });

    res.json({
      success: true,
      data: result,
      message: 'Portal session created',
    });
  } catch (error) {
    console.error('Create portal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payments/cancel
 * Cancel subscription
 */
router.post('/cancel', async (req: AuthRequest, res) => {
  try {
    const { immediate } = req.body;

    const result = await StripeService.cancelSubscription(
      req.user!.userId,
      immediate === true
    );

    res.json({
      success: true,
      data: result,
      message: immediate
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payments/prices
 * Get available pricing plans
 */
router.get('/prices', (req: AuthRequest, res) => {
  try {
    const prices = {
      pro: {
        monthly: config.stripePrice.proMonthly,
        yearly: config.stripePrice.proYearly,
      },
      enterprise: {
        monthly: config.stripePrice.enterpriseMonthly,
        yearly: config.stripePrice.enterpriseYearly,
      },
    };

    res.json({
      success: true,
      data: prices,
    });
  } catch (error) {
    console.error('Get prices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
