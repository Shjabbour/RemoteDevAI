# Webhook System - Quick Start Guide

## Prerequisites

- PostgreSQL database
- Redis server
- Node.js 18+

## Setup Steps

### 1. Install Redis

```bash
# Using Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Or macOS
brew install redis
brew services start redis

# Or Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

### 2. Update Environment Variables

Add to `apps/cloud/.env`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional: Webhook Worker Configuration
WEBHOOK_WORKER_CONCURRENCY=10
WEBHOOK_RATE_LIMIT=100
```

### 3. Run Database Migration

```bash
cd apps/cloud

# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Or apply existing migration
npx prisma migrate deploy
```

### 4. Start the Server

```bash
npm run dev
```

The webhook worker will start automatically with the server.

## Testing the Webhook System

### 1. Create a Test Webhook

Use webhook.site to get a test URL:

1. Go to https://webhook.site
2. Copy your unique URL
3. Create webhook via API:

```bash
curl -X POST http://localhost:3001/api/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-id",
    "events": ["project.created", "session.started"],
    "description": "Testing webhook delivery"
  }'
```

Save the returned `id` and `secret`.

### 2. Test Webhook Delivery

```bash
# Send test webhook
curl -X POST http://localhost:3001/api/webhooks/{webhook_id}/test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Check webhook.site to see the received payload.

### 3. Trigger Real Events

Create a project to trigger the webhook:

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "This will trigger a webhook"
  }'
```

Check webhook.site - you should see a `project.created` event.

### 4. View Delivery History

```bash
curl http://localhost:3001/api/webhooks/{webhook_id}/deliveries \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 5. Get Statistics

```bash
curl http://localhost:3001/api/webhooks/{webhook_id}/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Integrating Webhooks in Your Service

### Step 1: Import WebhookService

```typescript
import { WebhookService, WEBHOOK_EVENTS } from './services/WebhookService';
```

### Step 2: Trigger Events

After any important operation:

```typescript
// Example: After creating a project
const project = await prisma.project.create({ data });

WebhookService.triggerEvent({
  eventType: WEBHOOK_EVENTS.PROJECT_CREATED,
  userId: userId,
  data: {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
  },
}).catch((error) => {
  console.error('Webhook failed:', error);
});
```

### Step 3: Test Your Integration

1. Create a webhook subscribed to your event
2. Trigger the event in your application
3. Check delivery history
4. Verify payload is correct

## Receiving Webhooks in Your Application

### Node.js Example

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your_webhook_secret_here';

function verifyWebhook(payload, signature, timestamp) {
  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > 300) return false; // Too old

  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(signedPayload);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

app.post('/webhooks/remotedevai', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = parseInt(req.headers['x-webhook-timestamp']);

  if (!verifyWebhook(req.body, signature, timestamp)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('Event:', req.body.type);
  console.log('Data:', req.body.data);

  // Process webhook...

  res.status(200).json({ received: true });
});

app.listen(3000);
```

### Python Example

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import time
import json

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret_here'

def verify_webhook(payload, signature, timestamp):
    age = int(time.time()) - timestamp
    if age > 300:
        return False

    payload_string = json.dumps(payload)
    signed_payload = f"{timestamp}.{payload_string}"

    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/remotedevai', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = int(request.headers.get('X-Webhook-Timestamp'))

    if not verify_webhook(request.json, signature, timestamp):
        return jsonify({'error': 'Invalid signature'}), 401

    print('Event:', request.json['type'])
    print('Data:', request.json['data'])

    # Process webhook...

    return jsonify({'received': True})

if __name__ == '__main__':
    app.run(port=3000)
```

## Common Integrations

### Slack Notification

```javascript
const axios = require('axios');

app.post('/webhooks/remotedevai', async (req, res) => {
  res.status(200).json({ received: true });

  if (req.body.type === 'project.created') {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `🚀 New project created: ${req.body.data.name}`,
    });
  }
});
```

### Discord Notification

```javascript
app.post('/webhooks/remotedevai', async (req, res) => {
  res.status(200).json({ received: true });

  if (req.body.type === 'session.started') {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `📹 Session started: ${req.body.data.title}`,
    });
  }
});
```

### Database Logging

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.post('/webhooks/remotedevai', async (req, res) => {
  res.status(200).json({ received: true });

  await prisma.eventLog.create({
    data: {
      eventType: req.body.type,
      eventId: req.body.id,
      payload: req.body,
      receivedAt: new Date(),
    },
  });
});
```

## Monitoring

### Check Queue Status

```bash
curl http://localhost:3001/api/webhooks/queue/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Retry Failed Deliveries

```bash
# Retry all failed
curl -X POST http://localhost:3001/api/webhooks/queue/retry-failed \
  -H "Authorization: Bearer YOUR_API_KEY"

# Retry for specific webhook
curl -X POST http://localhost:3001/api/webhooks/queue/retry-failed \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "webhook_id_here"}'
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook is active:
   ```bash
   curl http://localhost:3001/api/webhooks/{id} \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

2. Verify event subscription:
   - Ensure the event type is in the `events` array

3. Check delivery history:
   ```bash
   curl http://localhost:3001/api/webhooks/{id}/deliveries \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
docker logs redis  # if using Docker
```

### High Failure Rate

1. Check endpoint is accessible
2. Verify endpoint returns 200 OK
3. Check endpoint response time (< 30s)
4. Review error messages in delivery history

## Available Events Reference

### Project Events
- `project.created` - New project
- `project.updated` - Project modified
- `project.deleted` - Project removed

### Session Events
- `session.started` - Session begins
- `session.ended` - Session ends
- `session.message` - New message
- `session.paused` - Session paused
- `session.resumed` - Session resumed

### Recording Events
- `recording.completed` - Recording ready
- `recording.failed` - Recording failed

### Agent Events
- `agent.connected` - Agent online
- `agent.disconnected` - Agent offline
- `agent.status_changed` - Status changed

### Subscription Events
- `subscription.created` - New subscription
- `subscription.updated` - Subscription modified
- `subscription.cancelled` - Subscription ended

### Payment Events
- `payment.succeeded` - Payment successful
- `payment.failed` - Payment failed

### Storage Events
- `storage.quota_warning` - Approaching limit
- `storage.quota_exceeded` - Over limit

### User Events
- `user.created` - New user
- `user.updated` - User profile changed
- `user.deleted` - User removed

## Best Practices

1. **Always verify signatures** - Prevent unauthorized webhooks
2. **Respond quickly** - Return 200 OK within seconds
3. **Process asynchronously** - Don't block the webhook handler
4. **Handle duplicates** - Use event IDs to deduplicate
5. **Use HTTPS** - Secure webhook endpoints
6. **Monitor deliveries** - Track success/failure rates
7. **Set up retries** - Configure appropriate retry delays
8. **Log everything** - Keep webhook logs for debugging

## Next Steps

- Read full documentation: `docs/WEBHOOKS.md`
- Review integration guide: `apps/cloud/src/services/WEBHOOKS_INTEGRATION.md`
- See implementation summary: `WEBHOOK_IMPLEMENTATION_SUMMARY.md`

## Support

For issues or questions:
- Check documentation in `docs/WEBHOOKS.md`
- Review troubleshooting section above
- Check GitHub issues
