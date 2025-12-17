# Usage Tracking & Rate Limiting System

This document describes the comprehensive usage tracking and rate limiting system implemented in RemoteDevAI Cloud API.

## Overview

The system provides:
- **Redis-based rate limiting** with sliding window algorithm
- **Usage tracking** across API calls, voice minutes, storage, recordings, and agent connections
- **Subscription tier enforcement** with granular quotas
- **Automated usage alerts** via email at 80% and 100% thresholds
- **Real-time usage monitoring** through web and mobile dashboards

## Architecture

### Components

1. **RateLimitService** (`src/services/RateLimitService.ts`)
   - Redis-based sliding window rate limiting
   - Per-user and per-IP limits
   - Subscription tier-based quotas
   - Endpoint-specific rate limits

2. **UsageTrackingService** (`src/services/UsageTrackingService.ts`)
   - Tracks usage events in real-time
   - Aggregates daily and monthly usage statistics
   - Checks usage against subscription limits
   - Creates usage alerts when thresholds are exceeded

3. **Middleware**
   - `usageLimit.middleware.ts` - Enforces subscription usage limits
   - `rateLimiters.ts` - Provides pre-configured rate limiters for different endpoint types
   - `subscription.middleware.ts` - Enhanced with usage tracking integration

4. **API Routes** (`src/routes/usage.routes.ts`)
   - `GET /usage/current` - Current period usage
   - `GET /usage/history` - Historical usage records
   - `GET /usage/limits` - Subscription tier limits
   - `GET /usage/breakdown` - Usage breakdown by category
   - `GET /usage/rate-limits` - Current rate limit status
   - `GET /usage/alerts` - Usage alert history

5. **Jobs** (`src/jobs/usageAlerts.ts`)
   - Periodic usage check (runs hourly)
   - Email alerts at 80% and 100% usage
   - Alert deduplication and tracking

6. **Frontend**
   - Web Dashboard: `apps/web/src/app/dashboard/usage/page.tsx`
   - Mobile Screen: `apps/mobile/app/(tabs)/usage.tsx`

## Subscription Tier Quotas

### FREE Tier
- **API Calls**: 100/day
- **Voice Minutes**: 10/month
- **Storage**: 500MB
- **Recordings**: 5/month
- **Agent Connections**: 1/day

### PRO Tier
- **API Calls**: 10,000/day
- **Voice Minutes**: 100/month
- **Storage**: 50GB
- **Recordings**: 500/month
- **Agent Connections**: 10/day

### ENTERPRISE Tier
- **API Calls**: Unlimited
- **Voice Minutes**: 1,000/month
- **Storage**: 500GB
- **Recordings**: Unlimited
- **Agent Connections**: Unlimited

## Rate Limiting

### Per-User Rate Limits (based on subscription tier)

```typescript
FREE: {
  api: 100 requests/day
  auth: 10 requests/hour
  upload: 5 uploads/day
}

PRO: {
  api: 10,000 requests/day
  auth: 50 requests/hour
  upload: 500 uploads/day
}

ENTERPRISE: {
  api: Unlimited
  auth: 200 requests/hour (security)
  upload: Unlimited
}
```

### Per-IP Rate Limits (abuse prevention)

```typescript
auth: 20 requests/hour
api: 200 requests/minute
```

### Endpoint-Specific Rate Limiters

```typescript
authRateLimiter: 10 requests/hour
readRateLimiter: 100 requests/minute
writeRateLimiter: 30 requests/minute
uploadRateLimiter: 10 uploads/hour
passwordResetRateLimiter: 3 requests/hour
webhookRateLimiter: 100 requests/minute
apiRateLimiter: 60 requests/minute
```

## Database Schema

### UsageRecord
Tracks individual usage events:
```prisma
model UsageRecord {
  id          String    @id @default(uuid())
  userId      String
  type        UsageType
  category    String
  endpoint    String?
  method      String?
  statusCode  Int?
  ipAddress   String?
  userAgent   String?
  quantity    Float     @default(1)
  timestamp   DateTime  @default(now())
}
```

### DailyUsage
Aggregated daily usage statistics:
```prisma
model DailyUsage {
  id          String    @id @default(uuid())
  userId      String
  date        DateTime  @db.Date
  apiCalls    Int       @default(0)
  apiQuota    Int       @default(0)
  voiceMinutes  Float   @default(0)
  storageUsed   BigInt  @default(0)
  recordingCount  Int   @default(0)
  agentConnections  Int @default(0)
}
```

### MonthlyUsage
Aggregated monthly usage statistics:
```prisma
model MonthlyUsage {
  id          String    @id @default(uuid())
  userId      String
  year        Int
  month       Int
  apiCalls    Int       @default(0)
  voiceMinutes  Float   @default(0)
  storageUsed   BigInt  @default(0)
  recordingCount  Int   @default(0)
  agentConnections  Int @default(0)
  estimatedCost Int   @default(0)
}
```

### UsageAlert
Tracks usage alert notifications:
```prisma
model UsageAlert {
  id          String    @id @default(uuid())
  userId      String
  type        UsageType
  threshold   Int       // 80 or 100
  currentUsage  Float
  limit       Float
  notified    Boolean   @default(false)
  notifiedAt  DateTime?
  emailSent   Boolean   @default(false)
}
```

## Usage Tracking

### Tracking API Calls

```typescript
import UsageTrackingService from './services/UsageTrackingService';

const usageService = new UsageTrackingService();

await usageService.trackApiCall(
  userId,
  '/api/projects',
  'GET',
  200,
  req.ip,
  req.get('user-agent')
);
```

### Tracking Voice Minutes

```typescript
await usageService.trackVoiceMinutes(userId, 2.5);
```

### Tracking Storage

```typescript
await usageService.trackStorage(userId, fileSizeInBytes);
```

### Tracking Recordings

```typescript
await usageService.trackRecording(userId);
```

### Tracking Agent Connections

```typescript
await usageService.trackAgentConnection(userId);
```

## Middleware Usage

### Check API Call Limits

```typescript
import { checkApiCallLimit } from './middleware/usageLimit.middleware';

router.get('/data', authenticateToken, checkApiCallLimit, async (req, res) => {
  // Route handler
});
```

### Check Storage Limits

```typescript
import { checkStorageLimit } from './middleware/usageLimit.middleware';

router.post('/upload', authenticateToken, checkStorageLimit, async (req, res) => {
  // File upload handler
});
```

### Check Recording Limits

```typescript
import { checkRecordingLimit } from './middleware/usageLimit.middleware';

router.post('/recordings', authenticateToken, checkRecordingLimit, async (req, res) => {
  // Recording creation handler
});
```

### Add Rate Limit Headers

```typescript
import { addRateLimitHeaders } from './middleware/usageLimit.middleware';

// Apply to all routes
app.use(addRateLimitHeaders);
```

This adds the following headers to all responses:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `X-RateLimit-Percentage` - Percentage of limit used

## Rate Limiter Configuration

### Apply to Routes

```typescript
import { authRateLimiter, readRateLimiter, writeRateLimiter } from './utils/rateLimiters';

// Authentication endpoints
router.post('/auth/login', authRateLimiter, loginHandler);
router.post('/auth/register', authRateLimiter, registerHandler);

// Read endpoints
router.get('/projects', readRateLimiter, getProjects);

// Write endpoints
router.post('/projects', writeRateLimiter, createProject);
router.put('/projects/:id', writeRateLimiter, updateProject);
router.delete('/projects/:id', writeRateLimiter, deleteProject);
```

### Custom Rate Limiters

```typescript
import { createRateLimiter } from './utils/rateLimiters';

const customLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
  message: 'Custom rate limit exceeded',
  skipCondition: (req) => req.user?.role === 'ADMIN',
});

router.post('/expensive-operation', customLimiter, handler);
```

### Tier-Based Rate Limiters

```typescript
import { tierBasedRateLimiter } from './utils/rateLimiters';

const limiter = tierBasedRateLimiter({
  FREE: 10,
  PRO: 100,
  ENTERPRISE: 1000,
  windowMs: 60 * 1000, // 1 minute
});

router.post('/api-heavy', limiter, handler);
```

## Usage Alerts

### Alert Configuration

Alerts are automatically triggered when usage exceeds:
- **80%** of limit (warning)
- **100%** of limit (limit reached)

### Alert Job

Run the usage alerts job periodically:

```typescript
import { checkUsageAlerts } from './jobs/usageAlerts';

// Run every hour
setInterval(async () => {
  await checkUsageAlerts();
}, 60 * 60 * 1000);
```

### Email Notifications

When usage thresholds are exceeded, users receive:
- Email notification with usage details
- Progress bar showing usage percentage
- Upgrade prompt with call-to-action
- Current plan details

## Environment Variables

Add to `.env`:

```bash
# Redis for rate limiting
REDIS_URL=redis://localhost:6379

# Email for usage alerts (already configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=RemoteDevAI <noreply@remotedevai.com>
```

## Testing

### Test Rate Limiting

```bash
# Test API rate limit
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/projects
done

# Should return 429 after limit
```

### Test Usage Tracking

```bash
# Check current usage
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/usage/current

# Check usage history
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/usage/history

# Check rate limits
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/usage/rate-limits
```

## Best Practices

1. **Always use middleware** - Don't manually check limits in route handlers
2. **Track usage immediately** - Track usage as soon as the action occurs
3. **Handle errors gracefully** - If usage tracking fails, log the error but don't block the request
4. **Monitor Redis** - Ensure Redis is healthy for rate limiting to work
5. **Set appropriate limits** - Balance user experience with system resources
6. **Test thoroughly** - Test edge cases like exactly hitting limits
7. **Document changes** - Update this document when modifying quotas or limits

## Monitoring

### Key Metrics to Monitor

- Redis connection status
- Rate limit hit rate
- Usage alert frequency
- Average usage per tier
- Users approaching limits

### Redis Health Check

```typescript
import getRateLimitService from './services/RateLimitService';

const rateLimitService = getRateLimitService();
const isHealthy = await rateLimitService.healthCheck();
```

## Troubleshooting

### Rate Limiting Not Working

1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Check Redis URL in config:
   ```typescript
   console.log(config.redisUrl);
   ```

3. Check middleware is applied:
   ```typescript
   // Should be before routes
   app.use(addRateLimitHeaders);
   ```

### Usage Not Tracking

1. Check Prisma schema is migrated:
   ```bash
   npm run prisma:migrate
   ```

2. Check service is properly initialized:
   ```typescript
   const usageService = new UsageTrackingService();
   ```

3. Check database connection

### Alerts Not Sending

1. Check SMTP configuration
2. Check email preferences for user
3. Check job is running
4. Check email template rendering

## Future Enhancements

- [ ] Usage analytics dashboard for admins
- [ ] Predictive alerts (predict when user will hit limit)
- [ ] Usage-based billing calculation
- [ ] Custom quota adjustments per user
- [ ] Rate limit bypass tokens
- [ ] Distributed rate limiting for multi-region deployments
- [ ] GraphQL query complexity limits
- [ ] WebSocket connection limits
- [ ] Burst limits (allow temporary spikes)

## Support

For issues or questions:
- Check logs: `docker logs remotedevai-cloud`
- Check Redis: `docker logs remotedevai-redis`
- Review Sentry for errors
- Contact: support@remotedevai.com
