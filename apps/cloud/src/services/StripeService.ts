import Stripe from 'stripe';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import config from '../config';

const prisma = new PrismaClient();

let stripe: Stripe | null = null;

if (config.stripeSecretKey) {
  stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

export interface CreateCheckoutSessionData {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionData {
  userId: string;
  returnUrl: string;
}

export class StripeService {
  /**
   * Ensure Stripe is initialized
   */
  private static ensureStripe(): Stripe {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
    return stripe;
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(data: CreateCheckoutSessionData) {
    const stripeClient = this.ensureStripe();

    const { userId, priceId, successUrl, cancelUrl } = data;

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripeClient.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update subscription with customer ID
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          tier: 'FREE',
          status: 'ACTIVE',
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create a portal session for managing subscription
   */
  static async createPortalSession(data: CreatePortalSessionData) {
    const stripeClient = this.ensureStripe();

    const { userId, returnUrl } = data;

    // Get Stripe customer ID
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No active subscription found');
    }

    // Create portal session
    const session = await stripeClient.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  }

  /**
   * Handle webhook events from Stripe
   */
  static async handleWebhook(rawBody: string, signature: string) {
    const stripeClient = this.ensureStripe();

    if (!config.stripeWebhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    let event: Stripe.Event;

    try {
      event = stripeClient.webhooks.constructEvent(
        rawBody,
        signature,
        config.stripeWebhookSecret
      );
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`);
    }

    // Log webhook event
    await prisma.webhookEvent.create({
      data: {
        source: 'stripe',
        eventType: event.type,
        payload: event.data.object as any,
      },
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    await prisma.webhookEvent.updateMany({
      where: {
        source: 'stripe',
        eventType: event.type,
        processed: false,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return { received: true };
  }

  /**
   * Handle subscription creation/update
   */
  private static async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    // Determine tier from price ID
    let tier: SubscriptionTier = 'FREE';
    const priceId = subscription.items.data[0]?.price.id;

    if (priceId === config.stripePrice.proMonthly || priceId === config.stripePrice.proYearly) {
      tier = 'PRO';
    } else if (priceId === config.stripePrice.enterpriseMonthly || priceId === config.stripePrice.enterpriseYearly) {
      tier = 'ENTERPRISE';
    }

    // Map Stripe status to our status
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
      trialing: 'TRIALING',
    };

    const status = statusMap[subscription.status] || 'ACTIVE';

    // Update subscription
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        tier,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        tier,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Update user tier
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
    });
  }

  /**
   * Handle subscription deletion
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    // Downgrade to free tier
    await prisma.subscription.update({
      where: { userId },
      data: {
        tier: 'FREE',
        status: 'CANCELED',
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'FREE' },
    });
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    // Update subscription status
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    // Update subscription status
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'PAST_DUE' },
    });
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string, cancelImmediately = false) {
    const stripeClient = this.ensureStripe();

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel in Stripe
    if (cancelImmediately) {
      await stripeClient.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update in database
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: !cancelImmediately,
        status: cancelImmediately ? 'CANCELED' : subscription.status,
      },
    });

    return { success: true };
  }

  /**
   * Get subscription details
   */
  static async getSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
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

    return subscription;
  }
}

export default StripeService;
