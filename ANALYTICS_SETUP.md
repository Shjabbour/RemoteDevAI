# Analytics and Monitoring Setup Guide

This document provides instructions for integrating the analytics and monitoring system into RemoteDevAI.

## Overview

The analytics and monitoring system includes:

1. **Analytics Service** - Event tracking, user metrics, and usage statistics
2. **Metrics Service** - Prometheus metrics for system monitoring
3. **Analytics Middleware** - Automatic request tracking
4. **Analytics API** - REST endpoints for analytics data
5. **Monitoring Stack** - Prometheus, Grafana, AlertManager
6. **Health Checks** - Liveness and readiness probes
7. **Frontend Dashboard** - React-based analytics visualization
8. **Privacy Controls** - User preferences and GDPR compliance

## Files Created

### Backend (Cloud API)

#### Database Schema
- `apps/cloud/prisma/schema.prisma` - Updated with analytics models:
  - `AnalyticsEvent` - Event tracking
  - `DailyStats` - Aggregated daily statistics
  - `UserStats` - Per-user statistics
  - `ErrorLog` - Error tracking and resolution
  - `UserPreferences` - Privacy and notification preferences

#### Services
- `apps/cloud/src/services/AnalyticsService.ts` - Event tracking, aggregations, and analytics queries
- `apps/cloud/src/services/MetricsService.ts` - Prometheus metrics collection

#### Middleware
- `apps/cloud/src/middleware/analytics.middleware.ts` - Request tracking, error tracking, metrics collection

#### Routes
- `apps/cloud/src/routes/analytics.routes.ts` - Analytics API endpoints

#### Monitoring
- `apps/cloud/src/monitoring/healthcheck.ts` - Health check endpoints
- `apps/cloud/src/monitoring/prometheus.ts` - Prometheus metrics endpoint

### Infrastructure

#### Prometheus
- `infra/monitoring/prometheus/prometheus.yml` - Prometheus configuration
- `infra/monitoring/prometheus/alert_rules.yml` - Alert rules

#### AlertManager
- `infra/monitoring/alertmanager/alertmanager.yml` - Alert routing configuration

#### Grafana
- `infra/monitoring/grafana/provisioning/datasources/prometheus.yml` - Datasource config
- `infra/monitoring/grafana/provisioning/dashboards/default.yml` - Dashboard provisioning
- `infra/monitoring/grafana/dashboards/api-dashboard.json` - API metrics dashboard

#### Docker
- `infra/monitoring/docker-compose.monitoring.yml` - Complete monitoring stack
- `infra/monitoring/README.md` - Monitoring documentation

### Frontend (Web App)

- `apps/web/src/app/dashboard/analytics/page.tsx` - Analytics dashboard
- `apps/web/src/app/dashboard/settings/privacy/page.tsx` - Privacy settings

## Installation Steps

### 1. Update Database Schema

```bash
cd apps/cloud

# Generate Prisma client
npm run prisma:generate

# Create migration
npx prisma migrate dev --name add-analytics-models

# Apply migration to production
npx prisma migrate deploy
```

### 2. Update Server Configuration

Add the following to `apps/cloud/src/server.ts`:

```typescript
// After imports, add:
import { analyticsMiddleware, errorTrackingMiddleware, startMetricsCollection } from './middleware/analytics.middleware';
import healthcheckRoutes from './monitoring/healthcheck';
import prometheusRoutes from './monitoring/prometheus';
import analyticsRoutes from './routes/analytics.routes';

// After body parsing middleware, add:
// Analytics middleware (tracks all requests)
app.use(analyticsMiddleware);

// Start metrics collection
startMetricsCollection(60000); // Update every 60 seconds

// After API routes, add:
// Monitoring endpoints
app.use('/health', healthcheckRoutes);
app.use('/metrics', prometheusRoutes);

// Analytics endpoints
app.use('/api/analytics', analyticsRoutes);

// Before the final error handler, add:
// Error tracking middleware
app.use(errorTrackingMiddleware);
```

### 3. Update Environment Variables

Add to `apps/cloud/.env`:

```env
# Analytics
ANALYTICS_ENABLED=true
ERROR_REPORTING_ENABLED=true

# Application version (for tracking)
APP_VERSION=1.0.0
```

### 4. Start Monitoring Stack

```bash
cd infra/monitoring

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 5. Configure AlertManager

Edit `infra/monitoring/alertmanager/alertmanager.yml`:

```yaml
# Update with your Slack webhook
slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

# Update email settings
email_configs:
  - to: 'your-email@example.com'
    from: 'alertmanager@example.com'
    smarthost: 'smtp.gmail.com:587'
    auth_username: 'your-email@example.com'
    auth_password: 'your-app-password'

# Update PagerDuty settings
pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

### 6. Access Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **AlertManager**: http://localhost:9093

### 7. Install Frontend Dependencies

If using Recharts for charts (recommended):

```bash
cd apps/web
npm install recharts
```

## Usage

### Tracking Events

```typescript
import AnalyticsService from './services/AnalyticsService';

// Track a user event
await AnalyticsService.trackUserEvent('project_created', userId, {
  projectName: 'My Project',
});

// Track an API request
await AnalyticsService.trackApiRequest(
  '/api/projects',
  'POST',
  201,
  150, // duration in ms
  1024, // response size in bytes
  userId
);

// Track an error
await AnalyticsService.trackError({
  errorType: 'validation',
  message: 'Invalid input',
  stack: error.stack,
  userId,
  endpoint: '/api/projects',
  method: 'POST',
});

// Update user stats
await AnalyticsService.updateUserStats(userId, {
  sessionIncrement: true,
  sessionTimeIncrement: 30, // minutes
});
```

### Metrics Collection

```typescript
import MetricsService from './services/MetricsService';

// Increment a counter
MetricsService.incrementCounter('custom_event_total', 1, { type: 'signup' });

// Set a gauge
MetricsService.setGauge('active_users', 100);

// Observe a histogram (e.g., response time)
MetricsService.observeHistogram('custom_operation_duration_ms', 250);
```

### Querying Analytics

```typescript
// Get analytics overview
const overview = await AnalyticsService.getOverview(startDate, endDate);

// Get user metrics
const userMetrics = await AnalyticsService.getUserMetrics(startDate, endDate);

// Get error metrics
const errorMetrics = await AnalyticsService.getErrorMetrics(startDate, endDate);
```

## API Endpoints

### Analytics Endpoints

All analytics endpoints require authentication. Admin-only endpoints require ENTERPRISE tier.

#### GET /api/analytics/overview
Get analytics overview with key metrics.

**Query Parameters:**
- `startDate` (optional) - Start date (ISO 8601)
- `endDate` (optional) - End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1000,
      "activeUsers": 500,
      "totalProjects": 2000,
      "totalSessions": 5000,
      "totalRequests": 100000,
      "totalErrors": 50,
      "avgResponseTime": 150
    },
    "dailyStats": [...],
    "errorStats": [...]
  }
}
```

#### GET /api/analytics/users
Get user metrics (admin only).

#### GET /api/analytics/usage
Get usage metrics (admin only).

#### GET /api/analytics/errors
Get error metrics (admin only).

#### GET /api/analytics/revenue
Get revenue metrics (admin only).

#### GET /api/analytics/user/:userId
Get analytics for a specific user.

#### GET /api/analytics/preferences
Get user analytics preferences.

#### POST /api/analytics/preferences
Update user analytics preferences.

**Request Body:**
```json
{
  "analyticsEnabled": true,
  "trackingEnabled": true,
  "errorReportingEnabled": true,
  "anonymizeData": false,
  "shareUsageData": true
}
```

### Monitoring Endpoints

#### GET /health
Basic health check.

#### GET /health/live
Liveness probe (Kubernetes).

#### GET /health/ready
Readiness probe (Kubernetes).

#### GET /health/detailed
Detailed health check with all metrics.

#### GET /metrics
Prometheus metrics endpoint.

## Privacy & GDPR Compliance

### User Opt-Out

Users can control their privacy settings at `/dashboard/settings/privacy`:

- **Analytics Enabled** - Opt-out of analytics tracking
- **Tracking Enabled** - Opt-out of user tracking
- **Error Reporting Enabled** - Opt-out of error reporting
- **Anonymize Data** - Remove PII from analytics
- **Share Usage Data** - Opt-out of data sharing

### Data Anonymization

When `anonymizeData` is enabled:
- IP addresses are removed
- Location data is removed
- User agent is sanitized
- All PII is stripped from events

### Data Retention

- Analytics events: 90 days
- Daily stats: 2 years
- Error logs: 30 days (resolved), 90 days (unresolved)
- User stats: Permanent (until account deletion)

### Data Export

Users can request data export via:
```bash
GET /api/analytics/export/:userId
```

### Data Deletion

Users can request data deletion. This will:
1. Delete all analytics events
2. Anonymize all historical stats
3. Remove error logs
4. Delete user preferences

## Monitoring & Alerts

### Alert Levels

- **INFO** - Informational events (logged only)
- **WARNING** - Potential issues (Slack notification)
- **CRITICAL** - Serious issues (PagerDuty + Slack + Email)

### Configured Alerts

See `infra/monitoring/prometheus/alert_rules.yml` for all alerts.

Key alerts:
- High error rate (>5%)
- Slow API responses (>1000ms)
- High memory usage (>85%)
- Database connection issues
- Service downtime

### Custom Dashboards

Create custom Grafana dashboards:

1. Access Grafana at http://localhost:3001
2. Create new dashboard
3. Add panels with PromQL queries
4. Export as JSON
5. Save to `infra/monitoring/grafana/dashboards/`

Example PromQL queries:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_errors_total[5m]) / rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Active users
active_users

# Memory usage
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
```

## Testing

### Test Event Tracking

```bash
# Track a test event
curl -X POST http://localhost:3000/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "test",
    "eventName": "Test Event",
    "category": "USER"
  }'
```

### Test Metrics

```bash
# View Prometheus metrics
curl http://localhost:3000/metrics

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'
```

### Test Health Checks

```bash
# Basic health
curl http://localhost:3000/health

# Liveness
curl http://localhost:3000/health/live

# Readiness
curl http://localhost:3000/health/ready

# Detailed
curl http://localhost:3000/health/detailed
```

## Troubleshooting

### Analytics Not Recording

1. Check if analytics middleware is installed
2. Verify database connection
3. Check user preferences (`analyticsEnabled`)
4. Review logs for errors

### Metrics Not Appearing

1. Verify `/metrics` endpoint is accessible
2. Check Prometheus scrape configuration
3. Verify target is up in Prometheus UI
4. Check service discovery

### Alerts Not Firing

1. Verify AlertManager is running
2. Check alert rules syntax
3. Verify notification channels
4. Test alert manually in Prometheus

## Performance Considerations

### Database Optimization

1. Ensure indexes are created (already in schema)
2. Regularly archive old analytics events
3. Use connection pooling
4. Consider read replicas for analytics queries

### Aggregation Jobs

Create a cron job to aggregate daily stats:

```typescript
// Run daily at midnight
import AnalyticsService from './services/AnalyticsService';

async function aggregateDailyStats() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Aggregate events into daily stats
  // This is automatically done by updateDailyStats,
  // but you can add custom aggregation logic here
}
```

### Cleanup Jobs

Create a cleanup job to remove old data:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOldData() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Delete old analytics events
  await prisma.analyticsEvent.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  // Delete old error logs
  await prisma.errorLog.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
      resolved: true,
    },
  });
}
```

## Production Checklist

- [ ] Update Prometheus scrape targets
- [ ] Configure AlertManager notification channels
- [ ] Set up Grafana admin password
- [ ] Enable HTTPS for all monitoring services
- [ ] Configure backup for Prometheus data
- [ ] Set up log rotation
- [ ] Configure retention policies
- [ ] Test all alert channels
- [ ] Set up on-call rotation
- [ ] Document runbooks for alerts
- [ ] Configure data retention
- [ ] Set up regular cleanup jobs
- [ ] Enable rate limiting on analytics endpoints
- [ ] Configure CORS properly
- [ ] Set up monitoring for monitoring (meta-monitoring)

## Support

For issues or questions:
1. Check the monitoring stack logs
2. Review Prometheus alerts
3. Check Grafana dashboards
4. Review application logs
5. Contact the development team
