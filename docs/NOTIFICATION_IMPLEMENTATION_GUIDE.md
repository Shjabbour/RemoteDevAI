# Notification System Implementation Guide

This document provides practical examples and implementation patterns for using the notification system.

## Quick Start

### Sending a Basic Notification

```typescript
import { NotificationDispatcher } from '@/services/NotificationDispatcher';

// Send a simple notification
await NotificationDispatcher.send(userId, {
  type: 'SESSION_STARTED',
  title: 'Session Started',
  message: 'Your coding session has begun',
  priority: 'NORMAL',
});
```

### Sending with Action

```typescript
await NotificationDispatcher.send(userId, {
  type: 'RECORDING_READY',
  title: 'Recording Ready',
  message: 'Your session recording is ready to view',
  actionUrl: `/dashboard/recordings/${recordingId}`,
  actionText: 'Watch Now',
  priority: 'HIGH',
});
```

### Sending to Multiple Users

```typescript
await NotificationDispatcher.sendToMany(
  [userId1, userId2, userId3],
  {
    type: 'PRODUCT_UPDATE',
    title: 'New Feature Available',
    message: 'Check out our latest feature: AI Code Review',
    actionUrl: '/features/ai-code-review',
  }
);
```

### Broadcasting to All Users

```typescript
await NotificationDispatcher.broadcast({
  type: 'SYSTEM_MAINTENANCE',
  title: 'Scheduled Maintenance',
  message: 'System will be down for maintenance on Saturday at 2 AM UTC',
  priority: 'HIGH',
});
```

## Common Use Cases

### 1. Session Lifecycle Notifications

```typescript
// Session started
async function notifySessionStarted(userId: string, sessionId: string) {
  await NotificationDispatcher.send(userId, {
    type: 'SESSION_STARTED',
    title: 'Session Started',
    message: `Coding session in project "${projectName}" has started`,
    actionUrl: `/dashboard/sessions/${sessionId}`,
    actionText: 'View Session',
    data: { sessionId, projectId },
    priority: 'NORMAL',
  });
}

// Session ended
async function notifySessionEnded(userId: string, sessionId: string, duration: number) {
  const durationStr = formatDuration(duration);

  await NotificationDispatcher.send(userId, {
    type: 'SESSION_ENDED',
    title: 'Session Completed',
    message: `Your ${durationStr} session has ended`,
    actionUrl: `/dashboard/sessions/${sessionId}`,
    actionText: 'View Summary',
    data: { sessionId, duration },
    priority: 'NORMAL',
  });
}
```

### 2. Agent Connection Status

```typescript
// Agent connected
async function notifyAgentConnected(userId: string, agentId: string, agentName: string) {
  await NotificationDispatcher.send(userId, {
    type: 'AGENT_CONNECTED',
    title: 'Agent Connected',
    message: `${agentName} is now online and ready`,
    data: { agentId, agentName },
    priority: 'LOW',
  });
}

// Agent disconnected
async function notifyAgentDisconnected(userId: string, agentId: string, agentName: string) {
  await NotificationDispatcher.send(userId, {
    type: 'AGENT_DISCONNECTED',
    title: 'Agent Disconnected',
    message: `${agentName} has gone offline`,
    data: { agentId, agentName },
    priority: 'NORMAL',
  });
}
```

### 3. Recording Processing

```typescript
// Recording ready
async function notifyRecordingReady(userId: string, recordingId: string, title: string) {
  await NotificationDispatcher.send(userId, {
    type: 'RECORDING_READY',
    title: 'Recording Ready',
    message: `"${title}" is ready to view`,
    actionUrl: `/dashboard/recordings/${recordingId}`,
    actionText: 'Watch Now',
    data: { recordingId },
    priority: 'HIGH',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
}
```

### 4. Payment and Billing

```typescript
// Payment reminder
async function sendPaymentReminder(userId: string, dueDate: Date) {
  await NotificationDispatcher.send(userId, {
    type: 'PAYMENT_REMINDER',
    title: 'Payment Due Soon',
    message: `Your subscription payment is due on ${formatDate(dueDate)}`,
    actionUrl: '/dashboard/billing',
    actionText: 'Update Payment',
    data: { dueDate: dueDate.toISOString() },
    priority: 'HIGH',
  });
}

// Payment failed
async function notifyPaymentFailed(userId: string) {
  await NotificationDispatcher.send(userId, {
    type: 'PAYMENT_FAILED',
    title: 'Payment Failed',
    message: 'Your recent payment failed. Please update your payment method to continue service.',
    actionUrl: '/dashboard/billing',
    actionText: 'Update Payment Method',
    priority: 'URGENT',
  });
}
```

### 5. Security Alerts

```typescript
// Suspicious login
async function notifySuspiciousLogin(userId: string, location: string, device: string) {
  await NotificationDispatcher.send(userId, {
    type: 'SECURITY_ALERT',
    title: 'Suspicious Login Detected',
    message: `New login from ${location} on ${device}. If this wasn't you, secure your account immediately.`,
    actionUrl: '/dashboard/security',
    actionText: 'Review Activity',
    data: { location, device },
    priority: 'URGENT',
  });
}

// Password changed
async function notifyPasswordChanged(userId: string) {
  await NotificationDispatcher.send(userId, {
    type: 'SECURITY_ALERT',
    title: 'Password Changed',
    message: 'Your password was successfully changed. If you didn\'t make this change, contact support immediately.',
    actionUrl: '/dashboard/security',
    actionText: 'Review Security',
    priority: 'URGENT',
  });
}
```

### 6. Weekly Reports

```typescript
async function sendWeeklyReport(userId: string) {
  // Fetch user's stats for the week
  const stats = await getUserWeeklyStats(userId);

  await NotificationDispatcher.send(userId, {
    type: 'WEEKLY_REPORT',
    title: 'Your Weekly Report',
    message: `This week: ${stats.sessions} sessions, ${stats.hours}h coding time`,
    actionUrl: '/dashboard/analytics',
    actionText: 'View Full Report',
    data: { stats },
    priority: 'LOW',
  });
}
```

## Working with Preferences

### Check if Notification Should Send

```typescript
import { NotificationPreferencesService } from '@/services/NotificationPreferencesService';

// Check before sending
const shouldSend = await NotificationPreferencesService.shouldSendNotification(
  userId,
  'SESSION_STARTED',
  'push'
);

if (shouldSend) {
  await NotificationDispatcher.send(userId, {
    type: 'SESSION_STARTED',
    title: 'Session Started',
    message: 'Your session has begun',
  });
}
```

### Get User Preferences

```typescript
const preferences = await NotificationPreferencesService.getPreferences(userId);

if (preferences.emailEnabled && preferences.emailDigest === 'REALTIME') {
  // Send immediate email
}
```

### Update Preferences

```typescript
await NotificationPreferencesService.updatePreferences(userId, {
  pushEnabled: true,
  emailEnabled: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  quietHoursTimezone: 'America/New_York',
});
```

## Frontend Integration

### Using the Notification Center

```tsx
import { NotificationCenter } from '@/components/NotificationCenter';
import { useSocket } from '@/hooks/useSocket';

function DashboardLayout() {
  const { socket } = useSocket(token);

  return (
    <div>
      <nav>
        {/* Other nav items */}
        <NotificationCenter socket={socket} />
      </nav>

      {/* Rest of layout */}
    </div>
  );
}
```

### Using the Notifications Hook

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
  } = useNotifications({ autoLoad: true });

  return (
    <div>
      <h1>Notifications ({unreadCount})</h1>

      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => markAsRead(notification.id)}
        >
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}

      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

### Request Browser Notification Permission

```tsx
import { requestNotificationPermission } from '@/hooks/useNotifications';

function SettingsPage() {
  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
  };

  return (
    <button onClick={handleEnableNotifications}>
      Enable Browser Notifications
    </button>
  );
}
```

## Mobile Integration

### Using the Notification Badge

```tsx
import { NotificationBadge, useNotificationCount } from '@/components/NotificationBadge';

function TabNavigator() {
  const { unreadCount } = useNotificationCount();

  return (
    <Tabs>
      <Tab
        name="notifications"
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color }) => (
            <NotificationBadge count={unreadCount} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Setting Up Push Notifications

```tsx
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Listen for notifications
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    // Navigate to the relevant screen
  });

  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
}, []);
```

## Advanced Patterns

### Conditional Notifications

```typescript
async function notifyBasedOnUserActivity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userStats: true },
  });

  // Only notify active users
  if (user && isActiveUser(user.userStats)) {
    await NotificationDispatcher.send(userId, {
      type: 'PRODUCT_UPDATE',
      title: 'New Feature Available',
      message: 'Based on your usage, you might like our new AI assistant',
      priority: 'NORMAL',
    });
  }
}
```

### Batching Notifications

```typescript
async function sendBatchNotifications(userIds: string[], notification: any) {
  // Send in batches of 100
  const batchSize = 100;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map((userId) => NotificationDispatcher.send(userId, notification))
    );

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
```

### Notification with Expiry

```typescript
// Time-sensitive notification
await NotificationDispatcher.send(userId, {
  type: 'SYSTEM_MAINTENANCE',
  title: 'Maintenance Starting Soon',
  message: 'System maintenance begins in 1 hour',
  priority: 'HIGH',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
});
```

### Custom Notification Data

```typescript
await NotificationDispatcher.send(userId, {
  type: 'RECORDING_READY',
  title: 'Recording Ready',
  message: 'Your session recording is ready',
  data: {
    recordingId: '123',
    duration: 3600,
    size: 1024000,
    thumbnail: 'https://...',
    metadata: {
      quality: '1080p',
      fps: 30,
    },
  },
  actionUrl: '/dashboard/recordings/123',
});
```

## Cleanup and Maintenance

### Clean Up Expired Notifications (Cron Job)

```typescript
import cron from 'node-cron';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const deletedCount = await NotificationDispatcher.cleanupExpiredNotifications();
  console.log(`Cleaned up ${deletedCount} expired notifications`);
});
```

### Monitor Failed Push Subscriptions

```typescript
async function cleanupFailedSubscriptions() {
  const failedSubscriptions = await prisma.pushSubscription.findMany({
    where: {
      failureCount: { gte: 5 },
      isActive: true,
    },
  });

  for (const sub of failedSubscriptions) {
    await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { isActive: false },
    });
  }

  console.log(`Disabled ${failedSubscriptions.length} failed subscriptions`);
}
```

## Error Handling

### Graceful Failure

```typescript
try {
  await NotificationDispatcher.send(userId, notification);
} catch (error) {
  console.error('Failed to send notification:', error);

  // Log to error tracking service
  Sentry.captureException(error, {
    extra: {
      userId,
      notificationType: notification.type,
    },
  });

  // Don't throw - notification failure shouldn't break the main flow
}
```

### Retry Logic

```typescript
async function sendWithRetry(userId: string, notification: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await NotificationDispatcher.send(userId, notification);
    } catch (error) {
      if (i === retries - 1) throw error;

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

## Performance Optimization

### Lazy Loading Notifications

```tsx
function NotificationsList() {
  const {
    notifications,
    hasMore,
    loadMore,
    loading,
  } = useNotifications({ autoLoad: true });

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <div>
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
      <div ref={observerTarget} />
    </div>
  );
}
```

### Debounced Preference Updates

```tsx
import { useDebouncedCallback } from 'use-debounce';

function PreferencesForm() {
  const [preferences, setPreferences] = useState({});

  const savePreferences = useDebouncedCallback(async (prefs) => {
    await fetch('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  }, 1000);

  const updatePreference = (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  return (/* ... */);
}
```

---

For more information, see:
- [Notifications Setup Guide](./NOTIFICATIONS_SETUP.md)
- [API Documentation](./API.md#notifications)
- [Architecture Overview](./ARCHITECTURE.md)

Last updated: December 2024
