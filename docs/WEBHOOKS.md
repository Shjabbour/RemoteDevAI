# Webhooks Documentation

## Overview

RemoteDevAI supports webhooks to notify your application when events occur. Webhooks allow you to build integrations that react to events in real-time.

## Table of Contents

- [What are Webhooks?](#what-are-webhooks)
- [Getting Started](#getting-started)
- [Available Events](#available-events)
- [Webhook Payload Format](#webhook-payload-format)
- [Signature Verification](#signature-verification)
- [Retry Logic](#retry-logic)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Integration Examples](#integration-examples)
- [Troubleshooting](#troubleshooting)

## What are Webhooks?

Webhooks are HTTP callbacks that notify your application when specific events occur in RemoteDevAI. Instead of polling our API for updates, webhooks push data to your application in real-time.

### How Webhooks Work

1. You create a webhook endpoint in your application
2. You register the endpoint URL with RemoteDevAI
3. When an event occurs, RemoteDevAI sends an HTTP POST request to your endpoint
4. Your application processes the webhook and returns a 200 OK response
5. If delivery fails, RemoteDevAI retries with exponential backoff

## Getting Started

### 1. Create a Webhook Endpoint

Create an endpoint in your application that can receive POST requests:

```javascript
// Node.js + Express example
app.post('/webhooks/remotedevai', (req, res) => {
  const event = req.body;

  console.log('Received event:', event.type);
  console.log('Event data:', event.data);

  // Process the event
  switch (event.type) {
    case 'project.created':
      // Handle project creation
      break;
    case 'session.started':
      // Handle session start
      break;
    // ... handle other events
  }

  // Return 200 OK to acknowledge receipt
  res.status(200).json({ received: true });
});
```

### 2. Register Your Webhook

Use the RemoteDevAI dashboard or API to register your webhook:

**Via Dashboard:**
1. Go to Settings → Webhooks
2. Click "Create Webhook"
3. Enter your endpoint URL
4. Select the events you want to receive
5. Save the webhook and note the secret key

**Via API:**
```bash
curl -X POST https://api.remotedevai.com/api/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application Webhook",
    "url": "https://your-app.com/webhooks/remotedevai",
    "events": ["project.created", "session.started"],
    "description": "Webhook for project and session events"
  }'
```

### 3. Test Your Webhook

Use the test endpoint to verify your webhook is working:

```bash
curl -X POST https://api.remotedevai.com/api/webhooks/{webhook_id}/test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Available Events

### Project Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `project.created` | A new project is created | Project details |
| `project.updated` | A project is updated | Updated project details |
| `project.deleted` | A project is deleted | Project ID |

### Session Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `session.started` | A new session begins | Session details, project info |
| `session.ended` | A session ends | Session details, duration |
| `session.message` | A message is sent in a session | Message content, sender |
| `session.paused` | A session is paused | Session ID |
| `session.resumed` | A session is resumed | Session ID |

### Recording Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `recording.completed` | A recording is processed and ready | Recording URL, metadata |
| `recording.failed` | A recording failed to process | Error details |

### Agent Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `agent.connected` | A desktop agent connects | Agent details, platform |
| `agent.disconnected` | A desktop agent disconnects | Agent ID, disconnect reason |
| `agent.status_changed` | Agent status changes | New status, agent details |

### Subscription Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `subscription.created` | A new subscription is created | Subscription details, tier |
| `subscription.updated` | A subscription is updated | Updated subscription |
| `subscription.cancelled` | A subscription is cancelled | Cancellation details |

### Payment Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `payment.succeeded` | A payment succeeds | Payment amount, method |
| `payment.failed` | A payment fails | Failure reason |

### Storage Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `storage.quota_warning` | Storage quota reaches warning threshold | Current usage, limit |
| `storage.quota_exceeded` | Storage quota is exceeded | Usage details |

### User Events

| Event | Description | Data Included |
|-------|-------------|---------------|
| `user.created` | A new user is created | User details |
| `user.updated` | A user profile is updated | Updated user details |
| `user.deleted` | A user account is deleted | User ID |

## Webhook Payload Format

All webhooks follow a consistent JSON format:

```json
{
  "id": "evt_1234567890abcdef",
  "type": "project.created",
  "created": "2024-01-15T10:30:00Z",
  "data": {
    "id": "proj_abc123",
    "name": "My Project",
    "description": "A new project",
    "userId": "user_xyz789",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Payload Fields

- `id` (string): Unique event identifier (e.g., `evt_1234567890abcdef`)
- `type` (string): Event type (e.g., `project.created`)
- `created` (string): ISO 8601 timestamp when the event occurred
- `data` (object): Event-specific data payload

## Signature Verification

Every webhook request includes cryptographic signatures in the headers to verify authenticity.

### Signature Headers

```
X-Webhook-Signature: 3f7b8a2e1c9d4f6a...
X-Webhook-Timestamp: 1673784600
X-Webhook-ID: evt_1234567890abcdef
X-Webhook-Event: project.created
```

### Verifying Signatures (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  // Check timestamp is recent (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const age = currentTime - timestamp;

  if (age > 300) {
    throw new Error('Webhook timestamp too old');
  }

  // Create expected signature
  const payloadString = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const expectedSignature = hmac.digest('hex');

  // Compare signatures (constant-time comparison)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Express middleware
app.post('/webhooks/remotedevai', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = parseInt(req.headers['x-webhook-timestamp']);
  const secret = process.env.WEBHOOK_SECRET;

  try {
    const isValid = verifyWebhook(req.body, signature, timestamp, secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook...
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Verifying Signatures (Python)

```python
import hmac
import hashlib
import time

def verify_webhook(payload, signature, timestamp, secret):
    # Check timestamp
    current_time = int(time.time())
    age = current_time - timestamp

    if age > 300:
        raise ValueError('Webhook timestamp too old')

    # Create expected signature
    payload_string = payload if isinstance(payload, str) else json.dumps(payload)
    signed_payload = f"{timestamp}.{payload_string}"

    expected_signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Compare signatures
    return hmac.compare_digest(signature, expected_signature)

# Flask example
@app.route('/webhooks/remotedevai', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = int(request.headers.get('X-Webhook-Timestamp'))
    secret = os.environ['WEBHOOK_SECRET']

    try:
        if not verify_webhook(request.data, signature, timestamp, secret):
            return jsonify({'error': 'Invalid signature'}), 401

        # Process webhook...
        return jsonify({'received': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
```

## Retry Logic

If your endpoint doesn't return a 2xx status code, RemoteDevAI will retry the webhook delivery.

### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 2 minutes |
| 4 | 4 minutes |
| 5 | 8 minutes |

### Exponential Backoff

Delays increase exponentially: `delay = retryDelay * 2^(attempt - 1)`

Default retry delay is 60 seconds, configurable up to 3600 seconds (1 hour).

### Maximum Retries

By default, webhooks are retried 3 times. This is configurable (0-10 retries).

### Delivery Status

Check delivery status via the API:

```bash
curl https://api.remotedevai.com/api/webhooks/{webhook_id}/deliveries \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Best Practices

### 1. Respond Quickly

Return a 200 OK response as soon as possible. Process webhooks asynchronously:

```javascript
app.post('/webhooks/remotedevai', async (req, res) => {
  // Acknowledge receipt immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  processWebhookAsync(req.body).catch(console.error);
});

async function processWebhookAsync(event) {
  // Do heavy processing here
  await saveToDatabase(event);
  await triggerNotifications(event);
  await updateAnalytics(event);
}
```

### 2. Handle Duplicate Events

Webhooks may be delivered more than once. Use the event ID to deduplicate:

```javascript
const processedEvents = new Set();

app.post('/webhooks/remotedevai', async (req, res) => {
  const eventId = req.body.id;

  if (processedEvents.has(eventId)) {
    console.log('Duplicate event, ignoring');
    return res.status(200).json({ received: true });
  }

  processedEvents.add(eventId);

  // Process event...
  res.status(200).json({ received: true });
});
```

For production, use a database or Redis to track processed events.

### 3. Verify Signatures

Always verify webhook signatures to prevent unauthorized requests:

```javascript
const verifyMiddleware = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = parseInt(req.headers['x-webhook-timestamp']);

  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature headers' });
  }

  try {
    const isValid = verifyWebhook(req.body, signature, timestamp, WEBHOOK_SECRET);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

app.post('/webhooks/remotedevai', verifyMiddleware, (req, res) => {
  // Signature verified, process webhook
});
```

### 4. Use HTTPS

Always use HTTPS endpoints for webhooks to ensure data is encrypted in transit.

### 5. Log Everything

Log all webhook events for debugging and monitoring:

```javascript
app.post('/webhooks/remotedevai', (req, res) => {
  console.log('Webhook received:', {
    id: req.body.id,
    type: req.body.type,
    timestamp: req.body.created,
  });

  // Process webhook...
});
```

### 6. Monitor Failures

Set up alerts for webhook delivery failures:

- Check delivery status regularly via the API
- Set up notifications for failed deliveries
- Review error logs to identify issues

## API Reference

### Create Webhook

**POST** `/api/webhooks`

Create a new webhook endpoint.

**Request:**
```json
{
  "name": "My Webhook",
  "url": "https://your-app.com/webhooks",
  "events": ["project.created", "session.started"],
  "description": "Optional description",
  "headers": {
    "X-Custom-Header": "value"
  },
  "maxRetries": 3,
  "retryDelay": 60
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "whk_123abc",
    "name": "My Webhook",
    "url": "https://your-app.com/webhooks",
    "secret": "whk_secret_abc123xyz789",
    "events": ["project.created", "session.started"],
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### List Webhooks

**GET** `/api/webhooks`

Get all webhooks for the authenticated user.

**Query Parameters:**
- `includeInactive` (boolean): Include inactive webhooks

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "whk_123abc",
      "name": "My Webhook",
      "url": "https://your-app.com/webhooks",
      "secretPreview": "whk_secr...",
      "events": ["project.created"],
      "active": true,
      "_count": {
        "deliveries": 150
      }
    }
  ]
}
```

### Get Webhook

**GET** `/api/webhooks/{id}`

Get a specific webhook.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "whk_123abc",
    "name": "My Webhook",
    "url": "https://your-app.com/webhooks",
    "secretPreview": "whk_secr...",
    "events": ["project.created", "session.started"],
    "active": true,
    "lastTriggeredAt": "2024-01-15T12:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "deliveries": [
      {
        "id": "del_abc123",
        "eventType": "project.created",
        "status": "SUCCESS",
        "createdAt": "2024-01-15T12:30:00Z"
      }
    ]
  }
}
```

### Update Webhook

**PUT** `/api/webhooks/{id}`

Update a webhook.

**Request:**
```json
{
  "name": "Updated Webhook Name",
  "active": true,
  "events": ["project.created", "session.started", "session.ended"]
}
```

### Delete Webhook

**DELETE** `/api/webhooks/{id}`

Delete a webhook.

**Response:**
```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

### Regenerate Secret

**POST** `/api/webhooks/{id}/regenerate-secret`

Regenerate the webhook secret.

**Response:**
```json
{
  "success": true,
  "data": {
    "webhookId": "whk_123abc",
    "secret": "whk_secret_new123xyz789"
  }
}
```

### Get Deliveries

**GET** `/api/webhooks/{id}/deliveries`

Get delivery history for a webhook.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 50)
- `status` (string): Filter by status (PENDING, SUCCESS, FAILED)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "del_abc123",
      "eventId": "evt_xyz789",
      "eventType": "project.created",
      "status": "SUCCESS",
      "attempts": 1,
      "responseCode": 200,
      "deliveredAt": "2024-01-15T12:30:00Z",
      "createdAt": "2024-01-15T12:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Test Webhook

**POST** `/api/webhooks/{id}/test`

Send a test webhook.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Test webhook sent successfully",
    "deliveryId": "del_test123"
  }
}
```

### Get Statistics

**GET** `/api/webhooks/{id}/stats`

Get webhook delivery statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDeliveries": 150,
    "successfulDeliveries": 145,
    "failedDeliveries": 5,
    "pendingDeliveries": 0,
    "successRate": 96.67,
    "recentDeliveries": [...]
  }
}
```

## Integration Examples

### Slack Integration

Send notifications to Slack when events occur:

```javascript
const axios = require('axios');

app.post('/webhooks/remotedevai', async (req, res) => {
  const event = req.body;

  // Acknowledge receipt
  res.status(200).json({ received: true });

  // Send to Slack
  if (event.type === 'session.started') {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `🚀 New session started: ${event.data.title}`,
      attachments: [{
        color: 'good',
        fields: [
          { title: 'Project', value: event.data.projectName, short: true },
          { title: 'User', value: event.data.userName, short: true }
        ]
      }]
    });
  }
});
```

### Discord Integration

```javascript
app.post('/webhooks/remotedevai', async (req, res) => {
  const event = req.body;
  res.status(200).json({ received: true });

  if (event.type === 'recording.completed') {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: '📹 New recording available!',
      embeds: [{
        title: event.data.title,
        url: event.data.url,
        color: 5814783,
        fields: [
          { name: 'Duration', value: `${event.data.duration}s`, inline: true },
          { name: 'Size', value: `${(event.data.fileSize / 1024 / 1024).toFixed(2)} MB`, inline: true }
        ]
      }]
    });
  }
});
```

### Database Logging

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.post('/webhooks/remotedevai', async (req, res) => {
  const event = req.body;
  res.status(200).json({ received: true });

  // Log to database
  await prisma.webhookEvent.create({
    data: {
      eventId: event.id,
      eventType: event.type,
      payload: event,
      processedAt: new Date()
    }
  });
});
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook is active**: Ensure the webhook is not paused
2. **Verify URL is correct**: Check the URL is publicly accessible
3. **Check events subscription**: Ensure you're subscribed to the event types you expect
4. **Review logs**: Check delivery history in the dashboard

### Signature Verification Failing

1. **Use raw body**: Don't parse JSON before verification
2. **Check timestamp**: Ensure server clocks are synchronized
3. **Verify secret**: Make sure you're using the correct secret
4. **Check signature header**: Ensure header name matches exactly

### High Failure Rate

1. **Response time**: Ensure your endpoint responds within 30 seconds
2. **Error handling**: Return 200 OK even if processing fails
3. **Check logs**: Review error messages in delivery history
4. **Rate limiting**: Ensure your server can handle webhook volume

### Missing Events

1. **Check event subscriptions**: Verify you're subscribed to the event
2. **Review filters**: Some events may be filtered based on settings
3. **Check delivery history**: Events may have been delivered but failed
4. **Time zone issues**: Ensure timestamps are being parsed correctly

## Support

For webhook support:
- **Documentation**: https://docs.remotedevai.com/webhooks
- **API Reference**: https://docs.remotedevai.com/api
- **Support Email**: support@remotedevai.com
- **Discord Community**: https://discord.gg/remotedevai

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial webhook system release
- Support for 20+ event types
- HMAC-SHA256 signature verification
- Automatic retry with exponential backoff
- Comprehensive delivery tracking
