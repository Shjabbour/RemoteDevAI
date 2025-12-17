# Comprehensive Notification System for RemoteDevAI

A complete, production-ready notification system with multi-channel support, user preferences, and real-time updates.

## Features

### Core Features
- **Multi-Channel Notifications**
  - In-app notifications with real-time WebSocket updates
  - Push notifications (Web Push via VAPID, Mobile via Expo)
  - Email notifications with digest support

- **User Preferences**
  - Granular control over notification types
  - Channel-specific settings (email, push, in-app)
  - Email digest frequency (realtime, hourly, daily, weekly, never)
  - Quiet hours with timezone support
  - Sound preferences for push notifications

- **Priority System**
  - LOW, NORMAL, HIGH, URGENT priority levels
  - Priority-based routing and handling
  - Urgent notifications bypass quiet hours

- **Smart Features**
  - Quiet hours that respect user timezone
  - Automatic retry for failed push notifications
  - Auto-disable subscriptions after repeated failures
  - Notification expiration
  - Mark as read/unread tracking

## System Components

### Backend Components

1. **Database Models** (`apps/cloud/prisma/schema.prisma`)
   - `NotificationPreferences` - User notification settings
   - `Notification` - In-app notification storage
   - `PushSubscription` - Push notification subscriptions
   - Enums: `DigestFrequency`, `NotificationType`, `NotificationPriority`, `DeviceType`

2. **Services**
   - `NotificationPreferencesService.ts` - Manage user preferences
   - `NotificationDispatcher.ts` - Central notification sending system
   - `WebPushService.ts` - Web Push (VAPID) integration
   - `ExpoPushService.ts` - Mobile push via Expo

3. **API Routes** (`apps/cloud/src/routes/notifications.routes.ts`)
   - `GET /api/notifications` - List notifications
   - `GET /api/notifications/unread-count` - Get unread count
   - `PUT /api/notifications/:id/read` - Mark as read
   - `PUT /api/notifications/read-all` - Mark all as read
   - `DELETE /api/notifications/:id` - Delete notification
   - `GET /api/notifications/preferences` - Get preferences
   - `PUT /api/notifications/preferences` - Update preferences
   - `POST /api/notifications/preferences/reset` - Reset to defaults
   - `POST /api/notifications/push/subscribe` - Subscribe to push
   - `DELETE /api/notifications/push/unsubscribe` - Unsubscribe from push
   - `POST /api/notifications/test` - Send test notification

4. **Email Templates** (`apps/cloud/src/templates/notifications/`)
   - `notification-generic.html` - Generic notification template
   - `notification-digest.html` - Email digest template
   - Individual templates for each notification type

### Frontend Components (Web)

1. **Settings Page** (`apps/web/src/app/dashboard/settings/notifications/page.tsx`)
   - Comprehensive notification preferences UI
   - Channel toggles (email, push, in-app)
   - Notification type toggles
   - Quiet hours configuration
   - Email digest frequency selector
   - Test notification button

2. **Notification Center** (`apps/web/src/components/NotificationCenter.tsx`)
   - Bell icon with unread badge
   - Dropdown with recent notifications
   - Mark as read/delete actions
   - Priority-based styling
   - Real-time updates via WebSocket

3. **Custom Hook** (`apps/web/src/hooks/useNotifications.ts`)
   - Fetch notifications with pagination
   - Real-time updates via WebSocket
   - Mark as read/unread
   - Delete notifications
   - Unread count tracking
   - Browser notification integration

### Mobile Components

1. **Settings Screen** (`apps/mobile/app/(tabs)/settings/notifications.tsx`)
   - Mobile-optimized notification preferences
   - Permission request handling
   - Channel toggles with native switches
   - Email frequency selection
   - Notification type toggles

2. **Notification Badge** (`apps/mobile/src/components/NotificationBadge.tsx`)
   - Badge component for tab navigation
   - Unread count display
   - Auto-updating count
   - Hook for notification count

## Quick Start

### 1. Database Setup

```bash
cd apps/cloud
npx prisma migrate dev --name add_notifications
npx prisma generate
```

### 2. Environment Variables

Add to `.env`:

```env
# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@remotedevai.com

# Expo (Mobile)
EXPO_PROJECT_ID=your_expo_project_id
```

### 3. Server Integration

Update `apps/cloud/src/server.ts`:

```typescript
import notificationRoutes from './routes/notifications.routes';
import { NotificationDispatcher } from './services/NotificationDispatcher';

app.use('/api/notifications', notificationRoutes);

// Initialize with Socket.IO
NotificationDispatcher.initialize(io);

// Socket connection handler
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
  }
});
```

### 4. Sending Notifications

```typescript
import { NotificationDispatcher } from '@/services/NotificationDispatcher';

await NotificationDispatcher.send(userId, {
  type: 'SESSION_STARTED',
  title: 'Session Started',
  message: 'Your coding session has begun',
  actionUrl: '/dashboard/sessions/123',
  actionText: 'View Session',
  priority: 'NORMAL',
});
```

### 5. Frontend Integration

Add NotificationCenter to your layout:

```tsx
import { NotificationCenter } from '@/components/NotificationCenter';
import { useSocket } from '@/hooks/useSocket';

function Layout() {
  const { socket } = useSocket(token);

  return (
    <nav>
      <NotificationCenter socket={socket} />
    </nav>
  );
}
```

## File Structure

```
RemoteDevAI/
├── apps/
│   ├── cloud/
│   │   ├── prisma/
│   │   │   └── schema.prisma (Notification models added)
│   │   └── src/
│   │       ├── routes/
│   │       │   └── notifications.routes.ts
│   │       ├── services/
│   │       │   ├── NotificationPreferencesService.ts
│   │       │   ├── NotificationDispatcher.ts
│   │       │   ├── WebPushService.ts
│   │       │   └── ExpoPushService.ts
│   │       └── templates/
│   │           └── notifications/
│   │               ├── notification-generic.html
│   │               └── notification-digest.html
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       │   └── dashboard/
│   │       │       └── settings/
│   │       │           └── notifications/
│   │       │               └── page.tsx
│   │       ├── components/
│   │       │   └── NotificationCenter.tsx
│   │       └── hooks/
│   │           └── useNotifications.ts
│   └── mobile/
│       ├── app/
│       │   └── (tabs)/
│       │       └── settings/
│       │           └── notifications.tsx
│       └── src/
│           └── components/
│               └── NotificationBadge.tsx
└── docs/
    ├── NOTIFICATIONS_SETUP.md
    └── NOTIFICATION_IMPLEMENTATION_GUIDE.md
```

## Notification Types

| Type | Description | Default Priority | Typical Use |
|------|-------------|------------------|-------------|
| `SESSION_STARTED` | Coding session began | NORMAL | Session lifecycle |
| `SESSION_ENDED` | Coding session completed | NORMAL | Session lifecycle |
| `AGENT_CONNECTED` | Desktop agent connected | LOW | Agent status |
| `AGENT_DISCONNECTED` | Desktop agent disconnected | NORMAL | Agent status |
| `RECORDING_READY` | Recording processed | HIGH | User action required |
| `PAYMENT_REMINDER` | Payment due soon | HIGH | Billing |
| `PAYMENT_FAILED` | Payment failed | URGENT | Critical billing |
| `PRODUCT_UPDATE` | New feature announcement | NORMAL | Marketing |
| `WEEKLY_REPORT` | Weekly activity summary | LOW | Engagement |
| `SECURITY_ALERT` | Security-related alert | URGENT | Security |
| `SUBSCRIPTION_CHANGED` | Subscription tier changed | NORMAL | Account |
| `SYSTEM_MAINTENANCE` | System maintenance notice | HIGH | Operations |

## User Preference Options

### Channels
- Email notifications (on/off)
- Email digest frequency (realtime, hourly, daily, weekly, never)
- Push notifications (on/off)
- Push sound (on/off)
- In-app notifications (on/off)

### Notification Types
Each notification type can be individually enabled/disabled:
- Session started/ended
- Agent connected/disconnected
- Recording ready
- Payment reminders
- Product updates
- Weekly report
- Security alerts (recommended to keep enabled)

### Quiet Hours
- Enable/disable quiet hours
- Start time (HH:MM format)
- End time (HH:MM format)
- Timezone selection
- Note: Security alerts bypass quiet hours

## API Endpoints

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (paginated) |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| DELETE | `/api/notifications` | Delete all notifications |

### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/preferences` | Get user preferences |
| PUT | `/api/notifications/preferences` | Update preferences |
| POST | `/api/notifications/preferences/reset` | Reset to defaults |

### Push Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/push/subscribe` | Subscribe to push notifications |
| DELETE | `/api/notifications/push/unsubscribe` | Unsubscribe from push |
| GET | `/api/notifications/push/subscriptions` | List user's subscriptions |

### Testing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/test` | Send test notification |

## Documentation

- **[Setup Guide](./docs/NOTIFICATIONS_SETUP.md)** - Complete setup instructions for all notification channels
- **[Implementation Guide](./docs/NOTIFICATION_IMPLEMENTATION_GUIDE.md)** - Practical examples and usage patterns

## Best Practices

1. **Always check preferences** before sending notifications
2. **Respect quiet hours** for non-urgent notifications
3. **Use appropriate priority levels** (URGENT only for critical alerts)
4. **Handle failures gracefully** and disable subscriptions after repeated failures
5. **Provide actionable notifications** with relevant URLs
6. **Test notifications** in development before deploying
7. **Monitor delivery rates** and adjust as needed
8. **Keep users in control** with comprehensive settings

## Testing

### Test Notification

```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Preferences

```bash
curl http://localhost:3001/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Unread Count

```bash
curl http://localhost:3001/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Notifications not appearing**
   - Check user preferences
   - Verify WebSocket connection
   - Check quiet hours settings
   - Verify browser/app permissions

2. **Push notifications failing**
   - Verify VAPID keys (Web)
   - Check Expo token (Mobile)
   - Verify subscription is active
   - Check for exceeded failure count

3. **Email not sending**
   - Verify EmailService configuration
   - Check email preferences
   - Verify digest frequency setting
   - Check cron jobs for digests

See [NOTIFICATIONS_SETUP.md](./docs/NOTIFICATIONS_SETUP.md#troubleshooting) for detailed troubleshooting steps.

## Future Enhancements

Potential improvements:
- [ ] SMS notifications
- [ ] Slack/Discord integrations
- [ ] Notification templates builder
- [ ] A/B testing for notification content
- [ ] Analytics dashboard for notification metrics
- [ ] Smart notification batching
- [ ] Machine learning for optimal send times
- [ ] Rich media notifications

## Contributing

When contributing to the notification system:
1. Test all notification channels
2. Respect user preferences
3. Document new notification types
4. Update type definitions
5. Add tests for new features

## License

Part of RemoteDevAI - See main LICENSE file.

---

**Built with:** TypeScript, Prisma, Socket.IO, Web Push, Expo Notifications

**Last Updated:** December 2024
