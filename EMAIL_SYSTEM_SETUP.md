# Email System Setup Guide

This guide explains how to configure and use the complete email system for RemoteDevAI.

## Overview

The email system includes:
- **EmailService.ts** - Send transactional emails via SendGrid/Resend/SMTP
- **Email Queue** - Async email delivery with retry logic (BullMQ)
- **Template Engine** - Handlebars-based email templates with variable rendering
- **Email Tracking** - Track opens and clicks
- **Unsubscribe Management** - Handle user email preferences
- **Admin Dashboard** - Preview and test email templates

## Installation

The required dependencies have been installed:
```bash
npm install nodemailer handlebars juice bullmq @types/nodemailer
```

## Environment Variables

Add these to your `.env` file:

```bash
# ====================================================================
# EMAIL CONFIGURATION
# ====================================================================
# Email Provider (smtp, sendgrid, resend)
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@remotedevai.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid (alternative)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Resend (alternative)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Queue Configuration
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_RATE_LIMIT_MAX=100
EMAIL_RATE_LIMIT_DURATION=60000

# Email Support
SUPPORT_EMAIL=support@remotedevai.com
WEB_URL=http://localhost:3000

# Redis (required for email queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Database Updates

The Prisma schema has been updated with:

### User Model - Email Preferences
```prisma
model User {
  // ... existing fields ...

  // Email Preferences
  marketingEmails   Boolean   @default(true)
  productUpdates    Boolean   @default(true)
  weeklyDigest      Boolean   @default(true)
  emailVerified     Boolean   @default(false)
  unsubscribeToken  String?   @unique
}
```

### EmailLog Model - Email Tracking
```prisma
model EmailLog {
  id          String    @id @default(uuid())
  to          String
  userId      String?
  template    String
  subject     String
  status      EmailStatus @default(PENDING)
  provider    String?
  messageId   String?
  sentAt      DateTime?
  openedAt    DateTime?
  clickedAt   DateTime?
  bouncedAt   DateTime?
  error       String?
  retryCount  Int        @default(0)
  metadata    Json       @default("{}")
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum EmailStatus {
  PENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  BOUNCED
  FAILED
}
```

**Run migrations:**
```bash
cd apps/cloud
npx prisma migrate dev --name add_email_system
npx prisma generate
```

## File Structure

```
apps/cloud/src/
├── services/
│   └── EmailService.ts              # Main email service
├── utils/
│   └── emailRenderer.ts             # Template rendering engine
├── jobs/
│   └── emailQueue.ts                # BullMQ email queue
├── routes/
│   └── email.routes.ts              # Email API endpoints
└── templates/
    └── emails/
        ├── base.html                 # Base template layout
        ├── components/
        │   ├── header.html           # Email header
        │   ├── footer.html           # Email footer
        │   ├── button.html           # CTA button component
        │   └── card.html             # Content card component
        ├── welcome.html              # Welcome email
        ├── verify-email.html         # Email verification
        ├── password-reset.html       # Password reset
        ├── subscription-created.html # New subscription
        ├── subscription-cancelled.html # Cancelled subscription
        ├── payment-success.html      # Payment receipt
        ├── payment-failed.html       # Payment failure
        ├── trial-ending.html         # Trial ending reminder
        ├── agent-offline.html        # Agent offline notification
        ├── weekly-summary.html       # Weekly usage summary
        └── feature-announcement.html # New features

apps/web/src/app/admin/emails/
└── page.tsx                          # Admin email preview page
```

## Usage

### 1. Initialize Email Service

In your `server.ts`:

```typescript
import { EmailService } from './services/EmailService';
import { startEmailWorker } from './jobs/emailQueue';

// Initialize email service
await EmailService.initialize();

// Start email queue worker
startEmailWorker();
```

### 2. Register Email Routes

In your `server.ts`:

```typescript
import emailRoutes from './routes/email.routes';

app.use('/api/email', emailRoutes);
```

### 3. Send Emails

```typescript
import { EmailService } from './services/EmailService';

// Send welcome email
await EmailService.sendWelcomeEmail(
  userId,
  'John Doe',
  'john@example.com'
);

// Send verification email
await EmailService.sendVerificationEmail(
  'user@example.com',
  'verification-token-123',
  userId
);

// Send password reset
await EmailService.sendPasswordResetEmail(
  'user@example.com',
  'reset-token-456',
  userId
);

// Send subscription confirmation
await EmailService.sendSubscriptionCreatedEmail(
  userId,
  'user@example.com',
  'PRO'
);

// Send payment receipt
await EmailService.sendPaymentSuccessEmail(
  userId,
  'user@example.com',
  4900, // amount in cents
  new Date()
);

// Send custom email
await EmailService.sendEmail({
  to: 'user@example.com',
  subject: 'Your subject',
  template: 'template-name',
  variables: {
    key: 'value',
  },
  userId: 'user-id',
});
```

### 4. Queue Emails (Recommended for Bulk)

```typescript
// Queue for async delivery
await EmailService.queueEmail({
  to: 'user@example.com',
  subject: 'Your subject',
  template: 'template-name',
  variables: { key: 'value' },
  userId: 'user-id',
});
```

## API Endpoints

### Send Email (Admin)
```
POST /api/email/send
Body: {
  to: string,
  subject: string,
  template: string,
  variables?: object,
  userId?: string
}
```

### Queue Email (Admin)
```
POST /api/email/queue
Body: {
  to: string,
  subject: string,
  template: string,
  variables?: object,
  userId?: string
}
```

### List Templates
```
GET /api/email/templates
```

### Preview Template
```
POST /api/email/preview
Body: {
  template: string,
  variables?: object
}
```

### Get Queue Stats (Admin)
```
GET /api/email/queue/stats
```

### Retry Failed Jobs (Admin)
```
POST /api/email/queue/retry
```

### Track Email Open
```
GET /api/email/track/open/:messageId
```

### Track Email Click
```
GET /api/email/track/click/:messageId?url=...
```

### Unsubscribe
```
GET /api/email/unsubscribe/:token?type=marketing|product|digest|all
```

### Update Email Preferences
```
POST /api/email/preferences
Body: {
  marketingEmails?: boolean,
  productUpdates?: boolean,
  weeklyDigest?: boolean
}
```

### Get Email Logs (Admin)
```
GET /api/email/logs?page=1&limit=50&template=welcome&status=SENT&userId=...
```

## Admin Dashboard

Access the email preview and testing dashboard at:
```
http://localhost:3000/admin/emails
```

Features:
- Select any email template
- Edit template variables (JSON)
- Live preview of rendered email
- Send test emails to any address
- View email queue statistics
- Retry failed jobs

## Email Templates

All emails are:
- **Mobile responsive** - Optimized for all screen sizes
- **Dark mode compatible** - Automatic dark theme support
- **Accessible** - WCAG compliant
- **Beautiful design** - Modern gradient design matching RemoteDevAI brand

### Available Templates

1. **welcome** - Welcome email after signup
2. **verify-email** - Email verification link
3. **password-reset** - Password reset link
4. **subscription-created** - New subscription confirmation
5. **subscription-cancelled** - Subscription cancellation notice
6. **payment-success** - Payment receipt
7. **payment-failed** - Payment failure notification
8. **trial-ending** - Trial ending reminder
9. **agent-offline** - Desktop agent offline alert
10. **weekly-summary** - Weekly activity summary
11. **feature-announcement** - New feature announcements

### Creating New Templates

1. Create a new `.html` file in `apps/cloud/src/templates/emails/`
2. Use Handlebars syntax for variables: `{{variableName}}`
3. Include components: `{{> header}}`, `{{> footer}}`
4. Use helper functions: `{{formatDate date}}`, `{{formatCurrency amount}}`
5. Add to email routes if needed

Example template:
```html
{{> header}}

<tr>
  <td class="email-content">
    <h1>Hello {{userName}}!</h1>
    <p>Your custom message here.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{actionUrl}}" class="button">Take Action</a>
    </div>
  </td>
</tr>

{{> footer}}
```

## Email Preferences

Users can manage their email preferences from:
```
/dashboard/settings
```

Types of emails:
- **Transactional** - Always sent (verification, password reset, payment)
- **Marketing** - Feature announcements (can unsubscribe)
- **Product Updates** - Trial reminders, agent alerts (can unsubscribe)
- **Weekly Digest** - Weekly summaries (can unsubscribe)

## Monitoring

### Queue Monitoring
Monitor the email queue with:
```typescript
import { getQueueStats } from './jobs/emailQueue';

const stats = await getQueueStats();
// { waiting, active, completed, failed, delayed, total }
```

### Email Logs
All emails are logged in the `EmailLog` table with:
- Delivery status
- Open/click tracking
- Error messages
- Retry attempts

Query logs:
```typescript
const logs = await prisma.emailLog.findMany({
  where: {
    template: 'welcome',
    status: 'SENT',
  },
  orderBy: { createdAt: 'desc' },
});
```

## Troubleshooting

### Emails not sending
1. Check email service is initialized: `EmailService.initialize()`
2. Check email queue worker is running: `startEmailWorker()`
3. Verify Redis is running
4. Check environment variables
5. Check email service credentials

### Template errors
1. Check template exists in `apps/cloud/src/templates/emails/`
2. Verify JSON variables are valid
3. Check Handlebars syntax
4. Use admin preview page to debug

### Queue issues
1. Check Redis connection
2. View queue stats: `GET /api/email/queue/stats`
3. Check failed jobs logs
4. Retry failed jobs: `POST /api/email/queue/retry`

## Production Checklist

- [ ] Set up production email provider (SendGrid/Resend recommended)
- [ ] Configure DNS records (SPF, DKIM, DMARC)
- [ ] Set up Redis for email queue
- [ ] Configure rate limiting
- [ ] Set up email monitoring/alerts
- [ ] Test all email templates
- [ ] Verify unsubscribe links work
- [ ] Set up email bounce handling
- [ ] Configure webhook for email events (if using SendGrid/Resend)
- [ ] Add email analytics tracking

## Next Steps

1. **Webhook Integration**: Set up webhooks from SendGrid/Resend to track delivery, opens, clicks
2. **Email Analytics**: Track email performance metrics
3. **A/B Testing**: Test different email variations
4. **Personalization**: Add more dynamic content based on user behavior
5. **Automated Campaigns**: Set up drip campaigns, onboarding sequences

## Support

For issues or questions about the email system:
- Check the logs in `apps/cloud/src/services/EmailService.ts`
- View email queue stats at `/api/email/queue/stats`
- Test templates at `/admin/emails`
- Contact support at support@remotedevai.com
