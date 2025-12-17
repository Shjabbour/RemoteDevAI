import { PrismaClient } from '@prisma/client';
import UsageTrackingService from '../services/UsageTrackingService';
import { sendEmail } from '../services/NotificationService';

const prisma = new PrismaClient();

/**
 * Job to check user usage and send alerts when thresholds are exceeded
 * Should run periodically (e.g., every hour)
 */
export async function checkUsageAlerts() {
  console.log('Starting usage alerts check...');

  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        subscription: {
          status: 'ACTIVE',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        preferences: {
          select: {
            emailNotifications: true,
          },
        },
      },
    });

    console.log(`Checking usage alerts for ${users.length} users...`);

    let alertsCreated = 0;
    let emailsSent = 0;

    for (const user of users) {
      try {
        // Check if email notifications are enabled
        const emailNotificationsEnabled = user.preferences?.emailNotifications !== false;

        const usageService = new UsageTrackingService();

        // Check and create alerts
        await usageService.checkAndCreateAlerts(user.id);

        // Get unnotified alerts
        const unnotifiedAlerts = await prisma.usageAlert.findMany({
          where: {
            userId: user.id,
            notified: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (unnotifiedAlerts.length > 0) {
          alertsCreated += unnotifiedAlerts.length;

          // Group alerts by type and threshold
          const alertGroups = groupAlerts(unnotifiedAlerts);

          // Send email if notifications are enabled
          if (emailNotificationsEnabled) {
            for (const [key, alerts] of Object.entries(alertGroups)) {
              const [type, threshold] = key.split('_');
              const alert = alerts[0]; // Use first alert in group

              try {
                await sendUsageAlertEmail(
                  user.email,
                  user.name || 'User',
                  type,
                  parseInt(threshold),
                  alert.currentUsage,
                  alert.limit,
                  user.subscriptionTier
                );

                emailsSent++;

                // Mark alerts as notified
                await prisma.usageAlert.updateMany({
                  where: {
                    id: {
                      in: alerts.map((a) => a.id),
                    },
                  },
                  data: {
                    notified: true,
                    notifiedAt: new Date(),
                    emailSent: true,
                  },
                });
              } catch (emailError) {
                console.error(`Error sending alert email to ${user.email}:`, emailError);

                // Mark as notified but not emailed
                await prisma.usageAlert.updateMany({
                  where: {
                    id: {
                      in: alerts.map((a) => a.id),
                    },
                  },
                  data: {
                    notified: true,
                    notifiedAt: new Date(),
                    emailSent: false,
                  },
                });
              }
            }
          } else {
            // Mark as notified without sending email
            await prisma.usageAlert.updateMany({
              where: {
                userId: user.id,
                notified: false,
              },
              data: {
                notified: true,
                notifiedAt: new Date(),
                emailSent: false,
              },
            });
          }
        }
      } catch (userError) {
        console.error(`Error checking alerts for user ${user.id}:`, userError);
      }
    }

    console.log(
      `Usage alerts check completed. ${alertsCreated} alerts created, ${emailsSent} emails sent.`
    );

    return {
      success: true,
      alertsCreated,
      emailsSent,
      usersChecked: users.length,
    };
  } catch (error) {
    console.error('Error in usage alerts job:', error);
    throw error;
  }
}

/**
 * Group alerts by type and threshold
 */
function groupAlerts(alerts: any[]) {
  return alerts.reduce((groups, alert) => {
    const key = `${alert.type}_${alert.threshold}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(alert);
    return groups;
  }, {} as Record<string, any[]>);
}

/**
 * Send usage alert email
 */
async function sendUsageAlertEmail(
  email: string,
  name: string,
  type: string,
  threshold: number,
  currentUsage: number,
  limit: number,
  tier: string
) {
  const percentage = (currentUsage / limit) * 100;
  const isAtLimit = threshold >= 100;

  const typeNames: Record<string, string> = {
    API_CALL: 'API Calls',
    VOICE_MINUTE: 'Voice Minutes',
    STORAGE: 'Storage',
    RECORDING: 'Recordings',
    AGENT_CONNECTION: 'Agent Connections',
  };

  const typeName = typeNames[type] || type;

  const subject = isAtLimit
    ? `Usage Limit Reached: ${typeName}`
    : `Usage Alert: ${threshold}% of ${typeName} Limit`;

  const message = isAtLimit
    ? `You have reached your ${typeName.toLowerCase()} limit for your ${tier} plan.`
    : `You have used ${percentage.toFixed(1)}% of your ${typeName.toLowerCase()} limit for your ${tier} plan.`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .alert-box {
            background: ${isAtLimit ? '#fee' : '#fef3cd'};
            border-left: 4px solid ${isAtLimit ? '#dc3545' : '#ffc107'};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .usage-stats {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
          }
          .progress-fill {
            height: 100%;
            background: ${isAtLimit ? '#dc3545' : percentage >= 80 ? '#ffc107' : '#28a745'};
            width: ${Math.min(percentage, 100)}%;
            transition: width 0.3s ease;
          }
          .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RemoteDevAI Usage Alert</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>

          <div class="alert-box">
            <strong>${isAtLimit ? 'Limit Reached!' : 'Usage Warning'}</strong>
            <p>${message}</p>
          </div>

          <div class="usage-stats">
            <h3>${typeName} Usage</h3>
            <p><strong>Current:</strong> ${formatUsage(type, currentUsage)}</p>
            <p><strong>Limit:</strong> ${formatUsage(type, limit)}</p>
            <p><strong>Percentage:</strong> ${percentage.toFixed(1)}%</p>

            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>

          ${
            isAtLimit
              ? `
            <p>Your usage has been limited. To continue using RemoteDevAI, please upgrade your plan.</p>
            <a href="https://remotedevai.com/dashboard/billing" class="cta-button">Upgrade Plan</a>
          `
              : `
            <p>Consider upgrading your plan to avoid hitting your limits.</p>
            <a href="https://remotedevai.com/dashboard/billing" class="cta-button">View Plans</a>
          `
          }

          <p>Current Plan: <strong>${tier}</strong></p>

          <p>If you have any questions, please contact our support team.</p>

          <p>Best regards,<br>The RemoteDevAI Team</p>
        </div>
        <div class="footer">
          <p>RemoteDevAI - Control AI coding assistants from your phone</p>
          <p>
            <a href="https://remotedevai.com/dashboard/settings">Manage Email Preferences</a>
          </p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Format usage value based on type
 */
function formatUsage(type: string, value: number): string {
  switch (type) {
    case 'STORAGE':
      return formatBytes(value);
    case 'VOICE_MINUTE':
      return `${value.toFixed(1)} minutes`;
    case 'API_CALL':
    case 'RECORDING':
    case 'AGENT_CONNECTION':
      return value.toString();
    default:
      return value.toString();
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Clean up old usage alerts (older than 90 days)
 */
export async function cleanupOldAlerts() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.usageAlert.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old usage alerts`);

    return {
      success: true,
      deletedCount: result.count,
    };
  } catch (error) {
    console.error('Error cleaning up old alerts:', error);
    throw error;
  }
}
