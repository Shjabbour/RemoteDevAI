# Analytics & Monitoring Quick Reference

## Quick Links

| Resource | URL |
|----------|-----|
| Analytics Dashboard | http://localhost:5173/dashboard/analytics |
| Privacy Settings | http://localhost:5173/dashboard/settings/privacy |
| Grafana | http://localhost:3001 (admin/admin) |
| Prometheus | http://localhost:9090 |
| AlertManager | http://localhost:9093 |
| Health Check | http://localhost:3000/health |
| Metrics | http://localhost:3000/metrics |

## Common Commands

### Setup
```bash
# Generate Prisma client
cd apps/cloud && npm run prisma:generate

# Run migrations
npx prisma migrate dev

# Setup analytics for existing users
npx tsx src/scripts/setup-analytics.ts

# Start monitoring stack
cd infra/monitoring && docker-compose -f docker-compose.monitoring.yml up -d

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
```

### Testing
```bash
# Test health check
curl http://localhost:3000/health

# Test metrics endpoint
curl http://localhost:3000/metrics

# Test analytics API
curl http://localhost:3000/api/analytics/overview

# Test preferences
curl http://localhost:3000/api/analytics/preferences
```

## Code Examples

### Track a Custom Event
```typescript
import AnalyticsService from '@/services/AnalyticsService';

await AnalyticsService.trackEvent({
  eventType: 'custom_action',
  eventName: 'User clicked button',
  category: 'USER',
  userId: user.id,
  metadata: { buttonId: 'submit', page: '/projects' },
});
```

### Track an Error
```typescript
try {
  // ... your code
} catch (error) {
  await AnalyticsService.trackError({
    errorType: 'validation',
    message: error.message,
    stack: error.stack,
    userId: user?.id,
    endpoint: req.path,
    method: req.method,
    severity: 'ERROR',
  });
}
```

### Add Custom Metric
```typescript
import MetricsService from '@/services/MetricsService';

// Counter
MetricsService.incrementCounter('custom_events_total', 1, { type: 'signup' });

// Gauge
MetricsService.setGauge('queue_size', 42);

// Histogram
MetricsService.observeHistogram('operation_duration_ms', 250);
```

### Update User Stats
```typescript
await AnalyticsService.updateUserStats(userId, {
  sessionIncrement: true,
  sessionTimeIncrement: 30, // minutes
  projectIncrement: true,
});
```

### Update Daily Stats
```typescript
await AnalyticsService.updateDailyStats(new Date(), {
  requestIncrement: true,
  successfulRequestIncrement: true,
  responseTime: duration,
  activeUserIncrement: userId,
});
```

## API Endpoints

### Analytics

```bash
# Get overview (admin only)
GET /api/analytics/overview?startDate=2024-01-01&endDate=2024-12-31

# Get user metrics (admin only)
GET /api/analytics/users?startDate=2024-01-01&endDate=2024-12-31

# Get usage metrics (admin only)
GET /api/analytics/usage?startDate=2024-01-01&endDate=2024-12-31

# Get error metrics (admin only)
GET /api/analytics/errors?startDate=2024-01-01&endDate=2024-12-31

# Get revenue metrics (admin only)
GET /api/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31

# Get user's own analytics
GET /api/analytics/user/:userId

# Get preferences
GET /api/analytics/preferences

# Update preferences
POST /api/analytics/preferences
{
  "analyticsEnabled": true,
  "trackingEnabled": true,
  "errorReportingEnabled": true,
  "anonymizeData": false,
  "shareUsageData": true
}
```

### Monitoring

```bash
# Health check
GET /health

# Liveness probe
GET /health/live

# Readiness probe
GET /health/ready

# Detailed health
GET /health/detailed

# Prometheus metrics
GET /metrics
```

## Prometheus Queries (PromQL)

### Request Metrics
```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Request rate by endpoint
sum(rate(http_requests_total[5m])) by (path)

# Request rate by status code
sum(rate(http_requests_total[5m])) by (status)
```

### Error Metrics
```promql
# Error rate (percentage)
(rate(http_errors_total[5m]) / rate(http_requests_total[5m])) * 100

# Error count
sum(http_errors_total)

# Error rate by endpoint
sum(rate(http_errors_total[5m])) by (path)
```

### Performance Metrics
```promql
# 50th percentile response time
histogram_quantile(0.50, rate(http_request_duration_ms_bucket[5m]))

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# 99th percentile response time
histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))

# Average response time
sum(rate(http_request_duration_ms_sum[5m])) / sum(rate(http_request_duration_ms_count[5m]))
```

### System Metrics
```promql
# Memory usage (percentage)
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# CPU usage
process_cpu_usage_percent

# Active connections
active_connections
```

### Business Metrics
```promql
# Total users
total_users

# Active users (last 7 days)
active_users

# Active sessions
active_sessions

# Active agents
active_agents

# Unresolved errors
unresolved_errors
```

## Alert Rules

| Alert | Condition | Severity | Duration |
|-------|-----------|----------|----------|
| HighErrorRate | Error rate > 5% | warning | 5m |
| CriticalErrorRate | Error rate > 10% | critical | 2m |
| SlowApiResponses | p95 > 1000ms | warning | 5m |
| VerySlowApiResponses | p95 > 5000ms | critical | 2m |
| HighMemoryUsage | Memory > 85% | warning | 5m |
| CriticalMemoryUsage | Memory > 95% | critical | 2m |
| HighCpuUsage | CPU > 80% | warning | 5m |
| DatabaseConnectionFailed | DB unreachable | critical | 1m |
| ServiceDown | Service down | critical | 1m |
| NoActiveUsers | No users | warning | 30m |
| AllAgentsOffline | No agents | warning | 15m |

## Privacy Settings

| Setting | Default | Description |
|---------|---------|-------------|
| analyticsEnabled | true | Track user analytics |
| trackingEnabled | true | Track user behavior |
| errorReportingEnabled | true | Send error reports |
| anonymizeData | false | Remove PII from analytics |
| shareUsageData | true | Share anonymous usage data |
| emailNotifications | true | Receive email notifications |
| pushNotifications | true | Receive push notifications |

## Data Models

### AnalyticsEvent
```typescript
{
  id: string;
  eventType: string;        // 'login', 'api_request', etc.
  eventName: string;
  category: 'USER' | 'API' | 'AGENT' | 'SYSTEM' | 'ERROR' | 'PAYMENT';
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;        // milliseconds
  responseSize?: number;    // bytes
  metadata: object;
  anonymized: boolean;
  createdAt: Date;
}
```

### DailyStats
```typescript
{
  id: string;
  date: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  activeUsers: number;
  newUsers: number;
  projectsCreated: number;
  sessionsStarted: number;
  totalErrors: number;
  revenue: bigint;          // in cents
}
```

### UserStats
```typescript
{
  id: string;
  userId: string;
  totalLogins: number;
  totalSessions: number;
  totalProjects: number;
  totalApiRequests: number;
  totalSessionTime: number; // minutes
  avgSessionTime: number;   // minutes
  activeDays: number;
  lastActiveAt: Date;
}
```

### ErrorLog
```typescript
{
  id: string;
  errorType: string;
  message: string;
  stack?: string;
  userId?: string;
  endpoint?: string;
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  resolved: boolean;
  occurrences: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing | Check `/metrics` endpoint, verify Prometheus config |
| Analytics not recording | Check user preferences, verify middleware installed |
| Alerts not firing | Verify AlertManager config, test notification channels |
| Health check failing | Check database connection, review detailed health |
| High memory usage | Review retention policies, check for memory leaks |
| Slow queries | Check database indexes, optimize queries |

## File Locations

```
apps/cloud/
├── prisma/schema.prisma           # Database schema with analytics models
├── src/
│   ├── services/
│   │   ├── AnalyticsService.ts    # Analytics logic
│   │   └── MetricsService.ts      # Prometheus metrics
│   ├── middleware/
│   │   └── analytics.middleware.ts # Request tracking
│   ├── routes/
│   │   └── analytics.routes.ts    # Analytics API
│   ├── monitoring/
│   │   ├── healthcheck.ts         # Health endpoints
│   │   └── prometheus.ts          # Metrics endpoint
│   └── scripts/
│       └── setup-analytics.ts     # Setup script

apps/web/src/app/
├── dashboard/
│   ├── analytics/page.tsx         # Analytics dashboard
│   └── settings/privacy/page.tsx  # Privacy settings

infra/monitoring/
├── docker-compose.monitoring.yml  # Monitoring stack
├── prometheus/
│   ├── prometheus.yml             # Prometheus config
│   └── alert_rules.yml            # Alert definitions
├── grafana/
│   ├── provisioning/              # Grafana config
│   └── dashboards/                # Pre-built dashboards
└── alertmanager/
    └── alertmanager.yml           # Alert routing
```

## Best Practices

1. **Always respect user preferences** - Check analytics opt-out before tracking
2. **Anonymize sensitive data** - Remove PII when user requests
3. **Use appropriate severity levels** - Don't alert on everything
4. **Monitor your monitoring** - Set up meta-monitoring
5. **Document custom metrics** - Add comments and help text
6. **Test alerts** - Verify notification channels work
7. **Regular cleanup** - Archive old analytics data
8. **Index wisely** - Add indexes for common queries
9. **Aggregate data** - Use daily stats instead of raw events
10. **Version your metrics** - Plan for metric changes

## Support

- Setup Guide: `ANALYTICS_SETUP.md`
- Full Documentation: `ANALYTICS_SUMMARY.md`
- Monitoring Guide: `infra/monitoring/README.md`
