# Email System Integration Guide

Quick reference for integrating the email system into RemoteDevAI.

## Step 1: Update server.ts

Add these imports and initialization code to `apps/cloud/src/server.ts`:

```typescript
import { EmailService } from './services/EmailService';
import { startEmailWorker } from './jobs/emailQueue';
import emailRoutes from './routes/email.routes';

// ... existing imports ...

async function startServer() {
  // ... existing code ...

  // Initialize email service
  try {
    await EmailService.initialize();
    console.log('✅ Email service initialized');
  } catch (error) {
    console.error('❌ Email service initialization failed:', error);
  }

  // Start email queue worker
  try {
    startEmailWorker();
    console.log('✅ Email queue worker started');
  } catch (error) {
    console.error('❌ Email queue worker failed:', error);
  }

  // Register email routes
  app.use('/api/email', emailRoutes);

  // ... rest of server setup ...
}

startServer();
```

## Step 2: Update AuthService.ts

Integrate email sending into your authentication flow:

```typescript
import { EmailService } from './EmailService';

export class AuthService {
  // After user signup
  static async signUp(email: string, password: string, name: string) {
    // ... create user ...

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Save token to user record
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: false, unsubscribeToken: crypto.randomUUID() },
    });

    // Send welcome email
    await EmailService.sendWelcomeEmail(user.id, name, email);

    // Send verification email
    await EmailService.sendVerificationEmail(email, verificationToken, user.id);

    return user;
  }

  // Password reset request
  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomUUID();
      // ... save token ...

      await EmailService.sendPasswordResetEmail(email, resetToken, user.id);
    }
  }
}
```

## Step 3: Update StripeService.ts

Integrate payment and subscription emails:

```typescript
import { EmailService } from './EmailService';

export class StripeService {
  // After subscription created
  static async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (user) {
      await EmailService.sendSubscriptionCreatedEmail(
        user.id,
        user.email,
        subscription.items.data[0].price.product.name // tier
      );
    }
  }

  // After subscription cancelled
  static async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (user) {
      await EmailService.sendSubscriptionCancelledEmail(
        user.id,
        user.email,
        'PRO', // tier
        new Date(subscription.current_period_end * 1000)
      );
    }
  }

  // After payment succeeded
  static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (user) {
      await EmailService.sendPaymentSuccessEmail(
        user.id,
        user.email,
        paymentIntent.amount,
        new Date()
      );
    }
  }

  // After payment failed
  static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (user) {
      await EmailService.sendPaymentFailedEmail(user.id, user.email);
    }
  }
}
```

## Step 4: Create Scheduled Jobs

Create `apps/cloud/src/jobs/scheduledEmails.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/EmailService';

const prisma = new PrismaClient();

/**
 * Send trial ending reminders (run daily)
 */
export async function sendTrialEndingReminders() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const usersWithEndingTrials = await prisma.subscription.findMany({
    where: {
      status: 'TRIALING',
      trialEndsAt: {
        gte: new Date(),
        lte: threeDaysFromNow,
      },
    },
    include: {
      user: true,
    },
  });

  for (const subscription of usersWithEndingTrials) {
    const daysLeft = Math.ceil(
      (subscription.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    await EmailService.sendTrialEndingEmail(
      subscription.user.id,
      subscription.user.email,
      daysLeft
    );
  }

  console.log(`Sent ${usersWithEndingTrials.length} trial ending reminders`);
}

/**
 * Send weekly summaries (run weekly)
 */
export async function sendWeeklySummaries() {
  const users = await prisma.user.findMany({
    where: {
      weeklyDigest: true,
    },
  });

  for (const user of users) {
    // Get user stats for the week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [sessions, projects, recordings] = await Promise.all([
      prisma.session.count({
        where: {
          userId: user.id,
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.project.count({
        where: {
          userId: user.id,
          isActive: true,
        },
      }),
      prisma.recording.count({
        where: {
          session: {
            userId: user.id,
          },
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    // Calculate total time (example)
    const totalTime = sessions * 2; // Rough estimate

    if (sessions > 0) {
      await EmailService.sendWeeklySummaryEmail(user.id, user.email, {
        sessions,
        projects,
        totalTime,
        recordings,
      });
    }
  }

  console.log(`Sent ${users.length} weekly summaries`);
}

/**
 * Check for offline agents (run every hour)
 */
export async function checkOfflineAgents() {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const offlineAgents = await prisma.desktopAgent.findMany({
    where: {
      status: 'ONLINE',
      lastSeenAt: {
        lt: oneHourAgo,
      },
    },
    include: {
      user: true,
    },
  });

  for (const agent of offlineAgents) {
    // Update agent status
    await prisma.desktopAgent.update({
      where: { id: agent.id },
      data: { status: 'OFFLINE' },
    });

    // Send notification if user wants them
    if (agent.user.productUpdates) {
      await EmailService.sendAgentOfflineEmail(
        agent.user.id,
        agent.user.email,
        agent.name,
        agent.lastSeenAt
      );
    }
  }

  console.log(`Marked ${offlineAgents.length} agents as offline`);
}
```

## Step 5: Set up Cron Jobs

Add to `server.ts` or use a dedicated scheduler:

```typescript
import cron from 'node-cron';
import {
  sendTrialEndingReminders,
  sendWeeklySummaries,
  checkOfflineAgents,
} from './jobs/scheduledEmails';

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily email jobs...');
  await sendTrialEndingReminders();
});

// Run weekly on Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  console.log('Running weekly email jobs...');
  await sendWeeklySummaries();
});

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Checking for offline agents...');
  await checkOfflineAgents();
});
```

## Step 6: Add User Settings Page

Create `apps/web/src/app/dashboard/settings/page.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState({
    marketingEmails: true,
    productUpdates: true,
    weeklyDigest: true,
  });

  const updatePreferences = async (updates: Partial<typeof preferences>) => {
    const response = await fetch('/api/email/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const data = await response.json();
      setPreferences(data.preferences);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Email Preferences</h1>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.marketingEmails}
            onChange={(e) =>
              updatePreferences({ marketingEmails: e.target.checked })
            }
          />
          <div>
            <div className="font-medium">Marketing Emails</div>
            <div className="text-sm text-gray-600">
              Receive emails about new features and updates
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.productUpdates}
            onChange={(e) =>
              updatePreferences({ productUpdates: e.target.checked })
            }
          />
          <div>
            <div className="font-medium">Product Updates</div>
            <div className="text-sm text-gray-600">
              Important notifications about your account and services
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.weeklyDigest}
            onChange={(e) =>
              updatePreferences({ weeklyDigest: e.target.checked })
            }
          />
          <div>
            <div className="font-medium">Weekly Digest</div>
            <div className="text-sm text-gray-600">
              Weekly summary of your activity and achievements
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
```

## Environment Variables Checklist

Add to `.env`:

```bash
# Email Provider
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@remotedevai.com

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Queue
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_RATE_LIMIT_MAX=100
EMAIL_RATE_LIMIT_DURATION=60000

# Support
SUPPORT_EMAIL=support@remotedevai.com
WEB_URL=http://localhost:3000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Testing

1. **Initialize email service**: Start the server and check logs
2. **Test templates**: Visit `/admin/emails`
3. **Send test email**: Use the admin dashboard
4. **Check queue**: Visit `/api/email/queue/stats`
5. **Test unsubscribe**: Click unsubscribe link in any email

## Production Deployment

1. Set `EMAIL_PROVIDER=sendgrid` or `EMAIL_PROVIDER=resend`
2. Add API keys to environment variables
3. Configure DNS records for email domain
4. Set up Redis for production
5. Monitor email queue and logs
6. Set up webhooks for delivery tracking

## Common Issues

**Emails not sending:**
- Check Redis is running
- Verify email credentials
- Check email queue worker is started

**Templates not rendering:**
- Check template file exists
- Verify variable names match
- Use admin preview to debug

**High bounce rate:**
- Verify sender domain DNS records
- Use authenticated email provider
- Check email content for spam triggers
