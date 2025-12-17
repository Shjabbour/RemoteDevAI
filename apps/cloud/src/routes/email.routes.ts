import { Router, Request, Response } from 'express';
import { EmailService } from '../services/EmailService';
import { previewEmail, listTemplates } from '../utils/emailRenderer';
import { getQueueStats, retryFailedJobs, pauseQueue, resumeQueue } from '../jobs/emailQueue';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Send email (admin only)
 * POST /api/email/send
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, template, variables, userId } = req.body;

    // Validate required fields
    if (!to || !subject || !template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, template',
      });
    }

    // Send email
    const result = await EmailService.sendEmail({
      to,
      subject,
      template,
      variables,
      userId,
    });

    return res.json(result);
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Queue email for async delivery (admin only)
 * POST /api/email/queue
 */
router.post('/queue', async (req: Request, res: Response) => {
  try {
    const { to, subject, template, variables, userId } = req.body;

    // Validate required fields
    if (!to || !subject || !template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, template',
      });
    }

    // Queue email
    const result = await EmailService.queueEmail({
      to,
      subject,
      template,
      variables,
      userId,
    });

    return res.json(result);
  } catch (error) {
    console.error('Error queuing email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to queue email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get list of available email templates
 * GET /api/email/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await listTemplates();

    return res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list templates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Preview email template
 * POST /api/email/preview
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { template, variables } = req.body;

    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: template',
      });
    }

    // Render preview
    const html = await previewEmail(template, variables || {});

    return res.json({
      success: true,
      html,
    });
  } catch (error) {
    console.error('Error previewing email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to preview email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get email queue statistics (admin only)
 * GET /api/email/queue/stats
 */
router.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Retry failed email jobs (admin only)
 * POST /api/email/queue/retry
 */
router.post('/queue/retry', async (req: Request, res: Response) => {
  try {
    const count = await retryFailedJobs();

    return res.json({
      success: true,
      message: `Retried ${count} failed jobs`,
      count,
    });
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retry jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Pause email queue (admin only)
 * POST /api/email/queue/pause
 */
router.post('/queue/pause', async (req: Request, res: Response) => {
  try {
    await pauseQueue();

    return res.json({
      success: true,
      message: 'Email queue paused',
    });
  } catch (error) {
    console.error('Error pausing queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Resume email queue (admin only)
 * POST /api/email/queue/resume
 */
router.post('/queue/resume', async (req: Request, res: Response) => {
  try {
    await resumeQueue();

    return res.json({
      success: true,
      message: 'Email queue resumed',
    });
  } catch (error) {
    console.error('Error resuming queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Track email open
 * GET /api/email/track/open/:messageId
 */
router.get('/track/open/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    await EmailService.trackOpen(messageId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    return res.end(pixel);
  } catch (error) {
    console.error('Error tracking email open:', error);
    return res.status(500).end();
  }
});

/**
 * Track email click
 * GET /api/email/track/click/:messageId
 */
router.get('/track/click/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { url } = req.query;

    await EmailService.trackClick(messageId);

    // Redirect to actual URL
    if (url && typeof url === 'string') {
      return res.redirect(url);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error tracking email click:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track click',
    });
  }
});

/**
 * Unsubscribe from emails
 * GET /api/email/unsubscribe/:token
 */
router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { type } = req.query;

    const result = await EmailService.unsubscribe(
      token,
      type as 'marketing' | 'product' | 'digest' | 'all' | undefined
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Return success page (or redirect to unsubscribe confirmation page)
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - RemoteDevAI</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 48px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            text-align: center;
          }
          h1 {
            color: #111827;
            margin: 0 0 16px 0;
          }
          p {
            color: #6b7280;
            line-height: 1.6;
          }
          a {
            display: inline-block;
            margin-top: 24px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ Unsubscribed Successfully</h1>
          <p>You've been unsubscribed from our emails. We're sorry to see you go!</p>
          <p>You can update your email preferences anytime from your account settings.</p>
          <a href="${process.env.WEB_URL || 'https://remotedevai.com'}/dashboard/settings">Go to Settings</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update email preferences
 * POST /api/email/preferences
 */
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    // Assuming req.user is set by auth middleware
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { marketingEmails, productUpdates, weeklyDigest } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        marketingEmails: marketingEmails !== undefined ? marketingEmails : undefined,
        productUpdates: productUpdates !== undefined ? productUpdates : undefined,
        weeklyDigest: weeklyDigest !== undefined ? weeklyDigest : undefined,
      },
      select: {
        marketingEmails: true,
        productUpdates: true,
        weeklyDigest: true,
      },
    });

    return res.json({
      success: true,
      preferences: user,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get email logs (admin only)
 * GET /api/email/logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, template, status, userId } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (template) where.template = template;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailLog.count({ where }),
    ]);

    return res.json({
      success: true,
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error getting email logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get email logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
