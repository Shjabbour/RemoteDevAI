# Notification System Setup Guide

This guide explains how to set up and configure the comprehensive notification system for RemoteDevAI.

## Table of Contents

1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Backend Configuration](#backend-configuration)
4. [Web Push Notifications](#web-push-notifications)
5. [Mobile Push Notifications](#mobile-push-notifications)
6. [Email Notifications](#email-notifications)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

The notification system supports three channels:
- **In-App Notifications**: Real-time notifications via WebSocket
- **Push Notifications**: Web Push (VAPID) and Mobile Push (Expo)
- **Email Notifications**: Immediate or digest emails

Features:
- User-configurable preferences for each notification type
- Quiet hours support
- Email digest frequency control (realtime, hourly, daily, weekly)
- Priority-based notification handling
- Real-time updates via WebSocket

## Database Setup

### 1. Run Prisma Migrations

The notification models have been added to the Prisma schema. Run migrations to create the database tables:

```bash
cd apps/cloud
npx prisma migrate dev --name add_notifications
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Verify Tables

Check that these tables were created:
- `NotificationPreferences`
- `Notification`
- `PushSubscription`

## Backend Configuration

### 1. Update Server Configuration

Add the notification routes to your server:

**apps/cloud/src/server.ts:**

```typescript
import notificationRoutes from './routes/notifications.routes';
import { NotificationDispatcher } from './services/NotificationDispatcher';

// Add after other route registrations
app.use('/api/notifications', notificationRoutes);

// Initialize NotificationDispatcher with Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
});

NotificationDispatcher.initialize(io);
```

### 2. Add Socket Events

Update your socket connection handler to join user rooms:

```typescript
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;

  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected to notifications`);
  }

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected from notifications`);
  });
});
```

### 3. Send Notifications from Your Code

Use the NotificationDispatcher throughout your application:

```typescript
import { NotificationDispatcher } from '@/services/NotificationDispatcher';

// Send a notification
await NotificationDispatcher.send(userId, {
  type: 'SESSION_STARTED',
  title: 'Session Started',
  message: 'Your coding session has begun',
  actionUrl: '/dashboard/sessions/123',
  actionText: 'View Session',
  priority: 'NORMAL',
});
```

## Web Push Notifications

### 1. Generate VAPID Keys

Install web-push:

```bash
npm install web-push
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

### 2. Add to Environment Variables

Add to `.env`:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@remotedevai.com
```

### 3. Implement Web Push Service

Create **apps/cloud/src/services/WebPushService.ts**:

```typescript
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export class WebPushService {
  static async sendNotification(subscription: any, payload: any) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );

      return { success: true };
    } catch (error) {
      console.error('Web push error:', error);
      throw error;
    }
  }
}
```

### 4. Update NotificationDispatcher

In **apps/cloud/src/services/NotificationDispatcher.ts**, update `sendWebPush`:

```typescript
private static async sendWebPush(subscription: any, payload: NotificationPayload, sound: boolean) {
  const pushPayload = {
    title: payload.title,
    body: payload.message,
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    data: {
      url: payload.actionUrl,
      ...payload.data,
    },
    silent: !sound,
  };

  await WebPushService.sendNotification(subscription, pushPayload);
}
```

### 5. Frontend Integration

Add service worker registration in **apps/web/src/app/layout.tsx**:

```typescript
'use client';

import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered:', registration);
      });
    }
  }, []);

  return <html>{children}</html>;
}
```

Create **apps/web/public/sw.js**:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data,
      silent: data.silent,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

Subscribe to push notifications:

```typescript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  const response = await fetch('/api/notifications/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
      deviceType: 'WEB',
      userAgent: navigator.userAgent,
    }),
  });
}
```

## Mobile Push Notifications

### 1. Configure Expo Notifications

Install Expo notifications:

```bash
cd apps/mobile
npx expo install expo-notifications
```

### 2. Configure app.json

Add to **apps/mobile/app.json**:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#667eea"
    }
  }
}
```

### 3. Request Permissions and Get Token

In your app initialization:

```typescript
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id',
  });

  return token.data;
}
```

### 4. Subscribe to Notifications

```typescript
const expoPushToken = await registerForPushNotifications();

if (expoPushToken) {
  await fetch('/api/notifications/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: expoPushToken,
      p256dh: '', // Not used for Expo
      auth: '', // Not used for Expo
      deviceType: Platform.OS === 'ios' ? 'MOBILE_IOS' : 'MOBILE_ANDROID',
      platform: Platform.OS,
      userAgent: Constants.deviceName,
    }),
  });
}
```

### 5. Implement Expo Push Service

Create **apps/cloud/src/services/ExpoPushService.ts**:

```typescript
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export class ExpoPushService {
  static async sendNotification(pushToken: string, payload: any) {
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error(`Invalid Expo push token: ${pushToken}`);
    }

    const messages = [{
      to: pushToken,
      sound: payload.sound ? 'default' : null,
      title: payload.title,
      body: payload.message,
      data: payload.data,
      priority: payload.priority === 'URGENT' ? 'high' : 'default',
    }];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return tickets;
  }
}
```

## Email Notifications

Email notifications are already integrated with the EmailService. Configure your email templates in **apps/cloud/src/templates/notifications/**.

### Digest Emails

Set up cron jobs to send digest emails:

```typescript
// Run hourly digest
cron.schedule('0 * * * *', async () => {
  await NotificationDispatcher.sendDigestEmails('HOURLY');
});

// Run daily digest
cron.schedule('0 9 * * *', async () => {
  await NotificationDispatcher.sendDigestEmails('DAILY');
});

// Run weekly digest
cron.schedule('0 9 * * 1', async () => {
  await NotificationDispatcher.sendDigestEmails('WEEKLY');
});
```

## Testing

### Test Notification API

```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Preferences

```bash
# Get preferences
curl http://localhost:3001/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update preferences
curl -X PUT http://localhost:3001/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailEnabled": true, "pushEnabled": true}'
```

### Test Push Subscription

```bash
curl -X POST http://localhost:3001/api/notifications/push/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "p256dh": "...",
    "auth": "...",
    "deviceType": "WEB"
  }'
```

## Troubleshooting

### Notifications Not Appearing

1. Check user preferences:
   ```sql
   SELECT * FROM "NotificationPreferences" WHERE "userId" = 'user_id';
   ```

2. Check if user is in quiet hours
3. Verify WebSocket connection
4. Check browser/app notification permissions

### Push Notifications Failing

1. Verify VAPID keys are correct
2. Check subscription is active:
   ```sql
   SELECT * FROM "PushSubscription" WHERE "userId" = 'user_id' AND "isActive" = true;
   ```

3. Check for failed push attempts (failureCount > 0)
4. Verify service worker is registered (Web)
5. Check Expo push token is valid (Mobile)

### Email Notifications Not Sending

1. Verify EmailService is configured
2. Check email preferences
3. Verify email digest frequency setting
4. Check cron jobs are running for digests

### Database Issues

If migrations fail, reset and recreate:

```bash
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

## Best Practices

1. **Always check preferences** before sending notifications
2. **Respect quiet hours** for non-urgent notifications
3. **Handle failures gracefully** and disable subscriptions after repeated failures
4. **Use appropriate priority levels** (URGENT only for critical alerts)
5. **Test notifications** in development before deploying
6. **Monitor notification delivery rates** and adjust as needed
7. **Provide clear notification settings** to users
8. **Include action URLs** to make notifications actionable

## API Reference

See the full API documentation in [API.md](./API.md#notifications).

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting section

---

Last updated: December 2024
