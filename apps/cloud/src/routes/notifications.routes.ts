import { Router } from 'express';
import { NotificationDispatcher } from '../services/NotificationDispatcher';
import { NotificationPreferencesService } from '../services/NotificationPreferencesService';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailDigest: z.enum(['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER']).optional(),
  pushEnabled: z.boolean().optional(),
  pushSound: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  sessionStarted: z.boolean().optional(),
  sessionEnded: z.boolean().optional(),
  agentConnected: z.boolean().optional(),
  agentDisconnected: z.boolean().optional(),
  recordingReady: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/).nullable().optional(),
  quietHoursTimezone: z.string().optional(),
});

const subscribePushSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  deviceType: z.enum(['WEB', 'MOBILE_IOS', 'MOBILE_ANDROID', 'DESKTOP_WINDOWS', 'DESKTOP_MACOS', 'DESKTOP_LINUX']),
  userAgent: z.string().optional(),
  platform: z.string().optional(),
});

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await NotificationDispatcher.getNotifications(req.user!.userId, {
      limit,
      offset,
      unreadOnly,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const count = await NotificationDispatcher.getUnreadCount(req.user!.userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    await NotificationDispatcher.markAsRead(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req: AuthRequest, res) => {
  try {
    const result = await NotificationDispatcher.markAllAsRead(req.user!.userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { count: result.count },
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await NotificationDispatcher.deleteNotification(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications for user
 */
router.delete('/', async (req: AuthRequest, res) => {
  try {
    await NotificationDispatcher.deleteAllNotifications(req.user!.userId);

    res.json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', async (req: AuthRequest, res) => {
  try {
    const preferences = await NotificationPreferencesService.getPreferences(req.user!.userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', async (req: AuthRequest, res) => {
  try {
    const validatedData = updatePreferencesSchema.parse(req.body);
    const preferences = await NotificationPreferencesService.updatePreferences(
      req.user!.userId,
      validatedData
    );

    res.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update preferences error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.errors[0].message,
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/notifications/preferences/reset
 * Reset preferences to defaults
 */
router.post('/preferences/reset', async (req: AuthRequest, res) => {
  try {
    const preferences = await NotificationPreferencesService.resetToDefaults(req.user!.userId);

    res.json({
      success: true,
      data: preferences,
      message: 'Preferences reset to defaults',
    });
  } catch (error) {
    console.error('Reset preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/notifications/push/subscribe
 * Subscribe to push notifications
 */
router.post('/push/subscribe', async (req: AuthRequest, res) => {
  try {
    const validatedData = subscribePushSchema.parse(req.body);

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: validatedData.endpoint },
      update: {
        p256dh: validatedData.p256dh,
        auth: validatedData.auth,
        userAgent: validatedData.userAgent,
        platform: validatedData.platform,
        isActive: true,
        failureCount: 0,
        lastUsedAt: new Date(),
      },
      create: {
        userId: req.user!.userId,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.p256dh,
        auth: validatedData.auth,
        deviceType: validatedData.deviceType,
        userAgent: validatedData.userAgent,
        platform: validatedData.platform,
      },
    });

    res.json({
      success: true,
      data: subscription,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    console.error('Subscribe push error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.errors[0].message,
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to push notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/notifications/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.delete('/push/unsubscribe', async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required',
      });
    }

    await prisma.pushSubscription.updateMany({
      where: {
        userId: req.user!.userId,
        endpoint,
      },
      data: {
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('Unsubscribe push error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from push notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/notifications/push/subscriptions
 * Get user's push subscriptions
 */
router.get('/push/subscriptions', async (req: AuthRequest, res) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: req.user!.userId,
      },
      select: {
        id: true,
        deviceType: true,
        platform: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error('Get push subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get push subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/notifications/test
 * Send a test notification to verify settings
 */
router.post('/test', async (req: AuthRequest, res) => {
  try {
    const result = await NotificationDispatcher.send(req.user!.userId, {
      type: 'PRODUCT_UPDATE',
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings are working correctly.',
      priority: 'NORMAL',
      actionUrl: '/dashboard/settings/notifications',
      actionText: 'View Settings',
    });

    res.json({
      success: true,
      data: result,
      message: 'Test notification sent',
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
