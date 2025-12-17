# Webhook Integration Guide

This document explains how to integrate webhooks into RemoteDevAI services.

## Overview

The webhook system allows RemoteDevAI to notify external applications when events occur. This guide shows how to trigger webhooks from your services.

## Quick Start

### 1. Import Webhook Service

```typescript
import { WebhookService, WEBHOOK_EVENTS } from './WebhookService';
```

### 2. Trigger Webhook Events

Trigger webhooks after important operations:

```typescript
// After creating a resource
await WebhookService.triggerEvent({
  eventType: WEBHOOK_EVENTS.PROJECT_CREATED,
  userId: userId,
  data: {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
  },
});
```

## Integration Examples

### Project Service

```typescript
import { WebhookService, WEBHOOK_EVENTS } from './WebhookService';

export class ProjectService {
  static async createProject(userId: string, data: CreateProjectData) {
    const project = await prisma.project.create({
      data: { ...data, userId },
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.PROJECT_CREATED,
      userId,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
      },
    }).catch((error) => {
      console.error('Failed to trigger webhook:', error);
    });

    return project;
  }

  static async updateProject(projectId: string, userId: string, data: UpdateProjectData) {
    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.PROJECT_UPDATED,
      userId,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        updatedAt: project.updatedAt,
      },
    }).catch((error) => {
      console.error('Failed to trigger webhook:', error);
    });

    return project;
  }

  static async deleteProject(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    await prisma.project.delete({
      where: { id: projectId },
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.PROJECT_DELETED,
      userId,
      data: {
        id: projectId,
        name: project.name,
        deletedAt: new Date().toISOString(),
      },
    }).catch((error) => {
      console.error('Failed to trigger webhook:', error);
    });

    return { success: true };
  }
}
```

### Session Service

```typescript
import { WebhookService, WEBHOOK_EVENTS } from './WebhookService';

export class SessionService {
  static async startSession(userId: string, projectId: string, data: any) {
    const session = await prisma.session.create({
      data: {
        userId,
        projectId,
        ...data,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
      include: {
        project: true,
      },
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.SESSION_STARTED,
      userId,
      data: {
        id: session.id,
        projectId: session.projectId,
        projectName: session.project.name,
        title: session.title,
        startedAt: session.startedAt,
      },
    }).catch(console.error);

    return session;
  }

  static async endSession(sessionId: string, userId: string) {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
      include: {
        project: true,
      },
    });

    const duration = session.endedAt && session.startedAt
      ? (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
      : 0;

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.SESSION_ENDED,
      userId,
      data: {
        id: session.id,
        projectId: session.projectId,
        projectName: session.project.name,
        duration,
        endedAt: session.endedAt,
      },
    }).catch(console.error);

    return session;
  }
}
```

### Recording Service

```typescript
import { WebhookService, WEBHOOK_EVENTS } from './WebhookService';

export class RecordingService {
  static async completeRecording(recordingId: string, userId: string) {
    const recording = await prisma.recording.update({
      where: { id: recordingId },
      data: {
        status: 'READY',
      },
      include: {
        session: {
          include: {
            project: true,
          },
        },
      },
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.RECORDING_COMPLETED,
      userId,
      data: {
        id: recording.id,
        sessionId: recording.sessionId,
        projectId: recording.session.projectId,
        url: recording.url,
        thumbnailUrl: recording.thumbnailUrl,
        duration: recording.duration,
        fileSize: recording.fileSize,
      },
    }).catch(console.error);

    return recording;
  }
}
```

### Agent Service

```typescript
import { WebhookService, WEBHOOK_EVENTS } from './WebhookService';

export class AgentService {
  static async connectAgent(userId: string, agentData: any) {
    const agent = await prisma.desktopAgent.create({
      data: {
        ...agentData,
        userId,
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.AGENT_CONNECTED,
      userId,
      data: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        version: agent.version,
        connectedAt: agent.lastSeenAt,
      },
    }).catch(console.error);

    return agent;
  }

  static async disconnectAgent(agentId: string, userId: string) {
    const agent = await prisma.desktopAgent.update({
      where: { id: agentId },
      data: {
        status: 'OFFLINE',
        lastSeenAt: new Date(),
      },
    });

    // Trigger webhook
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.AGENT_DISCONNECTED,
      userId,
      data: {
        id: agent.id,
        name: agent.name,
        disconnectedAt: agent.lastSeenAt,
      },
    }).catch(console.error);

    return agent;
  }
}
```

## Available Events

All available webhook events are defined in `WEBHOOK_EVENTS`:

```typescript
export const WEBHOOK_EVENTS = {
  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',

  // Session events
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',
  SESSION_MESSAGE: 'session.message',
  SESSION_PAUSED: 'session.paused',
  SESSION_RESUMED: 'session.resumed',

  // Recording events
  RECORDING_COMPLETED: 'recording.completed',
  RECORDING_FAILED: 'recording.failed',

  // Agent events
  AGENT_CONNECTED: 'agent.connected',
  AGENT_DISCONNECTED: 'agent.disconnected',
  AGENT_STATUS_CHANGED: 'agent.status_changed',

  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',

  // Storage events
  STORAGE_QUOTA_WARNING: 'storage.quota_warning',
  STORAGE_QUOTA_EXCEEDED: 'storage.quota_exceeded',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
};
```

## Best Practices

### 1. Always Use Try-Catch

Webhook triggers are fire-and-forget. Always catch errors to prevent disrupting the main operation:

```typescript
WebhookService.triggerEvent({ ... }).catch((error) => {
  console.error('Failed to trigger webhook:', error);
});
```

### 2. Include Relevant Data

Include all data that consumers might need:

```typescript
// Good: Includes ID, name, and timestamp
data: {
  id: project.id,
  name: project.name,
  createdAt: project.createdAt,
}

// Bad: Missing important context
data: {
  id: project.id,
}
```

### 3. Don't Include Sensitive Data

Never include passwords, API keys, or other sensitive information in webhook payloads.

```typescript
// Bad: Includes password hash
data: {
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash, // DON'T DO THIS
}

// Good: Only public information
data: {
  id: user.id,
  email: user.email,
  name: user.name,
}
```

### 4. Use Async/Await Properly

Don't await webhook triggers unless you need to:

```typescript
// Good: Fire and forget
WebhookService.triggerEvent({ ... }).catch(console.error);

// Also good: If you need to ensure webhook is queued
await WebhookService.triggerEvent({ ... });

// Bad: Unnecessary await in fire-and-forget scenario
const result = await WebhookService.triggerEvent({ ... });
```

### 5. Log Webhook Failures

Always log when webhooks fail to trigger:

```typescript
WebhookService.triggerEvent({ ... }).catch((error) => {
  console.error(`Failed to trigger ${eventType} webhook:`, error);
  // Optional: Log to error tracking service
  errorTracker.captureException(error);
});
```

## Testing

### Unit Tests

Mock the webhook service in your tests:

```typescript
import { WebhookService } from './WebhookService';

jest.mock('./WebhookService');

describe('ProjectService', () => {
  it('should trigger webhook on project creation', async () => {
    const triggerEventSpy = jest.spyOn(WebhookService, 'triggerEvent');

    await ProjectService.createProject(userId, projectData);

    expect(triggerEventSpy).toHaveBeenCalledWith({
      eventType: 'project.created',
      userId,
      data: expect.objectContaining({
        id: expect.any(String),
        name: projectData.name,
      }),
    });
  });
});
```

### Integration Tests

Test webhook delivery in integration tests:

```typescript
describe('Webhook Integration', () => {
  it('should deliver webhook when project is created', async () => {
    // Setup webhook endpoint
    const webhookUrl = 'https://test-endpoint.com/webhook';
    const webhook = await WebhookService.createWebhook(userId, {
      name: 'Test Webhook',
      url: webhookUrl,
      events: ['project.created'],
    });

    // Perform action
    const project = await ProjectService.createProject(userId, projectData);

    // Wait for webhook delivery
    await sleep(1000);

    // Check delivery record
    const deliveries = await WebhookService.getDeliveries(webhook.id, userId);
    expect(deliveries.deliveries).toHaveLength(1);
    expect(deliveries.deliveries[0].status).toBe('SUCCESS');
  });
});
```

## Troubleshooting

### Webhooks Not Triggering

1. Check that `WebhookService.triggerEvent()` is called after the operation
2. Verify the event type matches the subscribed events
3. Check error logs for webhook trigger failures

### Webhooks Not Delivered

1. Check webhook delivery history via the API
2. Verify the webhook URL is accessible
3. Check the webhook is active
4. Review retry attempts and error messages

### Performance Issues

If webhook triggers are slowing down operations:

1. Ensure you're not awaiting webhook triggers unnecessarily
2. Check if the webhook queue is backed up
3. Consider increasing worker concurrency
4. Monitor Redis performance

## See Also

- [Webhook Documentation](../../../docs/WEBHOOKS.md)
- [API Reference](../../../docs/API.md)
- [WebhookService.ts](./WebhookService.ts)
- [webhookDelivery.ts](../jobs/webhookDelivery.ts)
