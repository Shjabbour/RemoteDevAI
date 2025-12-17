# Audit Logging System

## Quick Start

### 1. Run Database Migration

```bash
cd apps/cloud
npx prisma migrate dev --name add_audit_log
npx prisma generate
```

### 2. Update server.ts

Add this import at the top:
```typescript
import { scheduleAuditCleanup } from './jobs/auditCleanup';
```

Add this after `initializeSocketHandlers(io);`:
```typescript
scheduleAuditCleanup();
```

### 3. Start Using

```typescript
import { AuditService, AuditAction, AuditResource } from './services/AuditService';
import { getAuditContext } from './middleware/audit.middleware';

// In any route handler
await AuditService.log({
  ...getAuditContext(req),
  userId: req.user.userId,
  action: AuditAction.USER_CREATED,
  resource: AuditResource.USER,
  resourceId: user.id,
});
```

## Features

✅ **59 predefined audit events** covering all system actions
✅ **Automatic suspicious activity detection**
✅ **Sensitive data masking** (passwords, tokens, etc.)
✅ **Tier-based retention** (7/90/365 days)
✅ **Advanced filtering and search**
✅ **CSV and JSON export**
✅ **User and admin interfaces**
✅ **Change tracking** with before/after states
✅ **Request correlation** with unique IDs
✅ **IP address tracking**
✅ **Automatic cleanup job**
✅ **Comprehensive statistics**
✅ **Compliance support** (SOC 2, GDPR, HIPAA, ISO 27001, PCI DSS)

## Files Created

### Backend
- `src/services/AuditService.ts` - Core audit logging service
- `src/middleware/audit.middleware.ts` - Request context capture
- `src/utils/auditLogger.ts` - Helper functions
- `src/routes/audit.routes.ts` - API endpoints
- `src/jobs/auditCleanup.ts` - Cleanup automation

### Frontend
- `apps/web/src/app/dashboard/settings/audit/page.tsx` - User viewer
- `apps/web/src/app/admin/audit/page.tsx` - Admin viewer

### Database
- `prisma/schema.prisma` - AuditLog model and AuditStatus enum

## API Endpoints

### User Endpoints
```
GET    /api/audit                          # List audit logs
GET    /api/audit/:id                      # Get specific log
GET    /api/audit/resource/:resource/:id   # Resource audit trail
GET    /api/audit/analytics/stats          # Statistics
GET    /api/audit/export/csv               # Export CSV
GET    /api/audit/export/json              # Export JSON
```

### Admin Endpoints
```
GET    /api/audit/admin/all                # All audit logs
GET    /api/audit/admin/suspicious         # Suspicious activities
GET    /api/audit/admin/actions            # Admin actions
GET    /api/audit/admin/stats              # Global statistics
```

## Usage Examples

### Log Simple Action
```typescript
await AuditService.log({
  ...getAuditContext(req),
  userId: req.user.userId,
  action: AuditAction.PROJECT_CREATED,
  resource: AuditResource.PROJECT,
  resourceId: project.id,
});
```

### Log with Change Tracking
```typescript
await AuditService.log({
  ...getAuditContext(req),
  userId: req.user.userId,
  action: AuditAction.PROJECT_UPDATED,
  resource: AuditResource.PROJECT,
  resourceId: project.id,
  before: { name: 'Old Name' },
  after: { name: 'New Name' },
  details: { changedFields: ['name'] },
});
```

### Log Failure
```typescript
await AuditService.logFailure({
  ...getAuditContext(req),
  userId: req.user.userId,
  action: AuditAction.AUTH_LOGIN,
  resource: AuditResource.USER,
}, 'Invalid credentials');
```

### Log Admin Action
```typescript
await AuditService.logAdminAction({
  ...getAuditContext(req),
  userId: req.user.userId,
  action: AuditAction.ADMIN_USER_BANNED,
  resource: AuditResource.USER,
  resourceId: bannedUserId,
  details: { reason: 'Violation of terms' },
});
```

### Using Helper Functions
```typescript
import {
  logResourceCreated,
  logResourceUpdated,
  logResourceDeleted
} from './utils/auditLogger';

// Create
await logResourceCreated(req, AuditResource.PROJECT, project.id, project);

// Update with automatic change detection
await logResourceUpdated(req, AuditResource.PROJECT, project.id, oldProject, newProject);

// Delete
await logResourceDeleted(req, AuditResource.PROJECT, project.id, project);
```

## Audit Events

### Authentication
- `auth.login`, `auth.logout`, `auth.password_change`, `auth.password_reset`
- `auth.mfa_enabled`, `auth.mfa_disabled`, `auth.failed_login`, `auth.token_refresh`

### User Management
- `user.created`, `user.updated`, `user.deleted`
- `user.email_changed`, `user.profile_updated`, `user.preferences_updated`

### Projects
- `project.created`, `project.updated`, `project.deleted`
- `project.archived`, `project.shared`, `project.settings_updated`

### Sessions
- `session.started`, `session.ended`, `session.paused`
- `session.resumed`, `session.archived`

### Recordings
- `recording.created`, `recording.deleted`
- `recording.downloaded`, `recording.shared`

### Agents
- `agent.connected`, `agent.disconnected`, `agent.registered`
- `agent.updated`, `agent.removed`

### Subscriptions
- `subscription.created`, `subscription.updated`, `subscription.canceled`
- `subscription.tier_changed`

### Payments
- `payment.processed`, `payment.failed`, `payment.refunded`

### API Keys
- `api_key.created`, `api_key.revoked`, `api_key.used`

### Webhooks
- `webhook.created`, `webhook.updated`, `webhook.deleted`

### Data Operations
- `export.requested`, `export.completed`
- `import.started`, `import.completed`

### Administrative
- `admin.user_impersonated`, `admin.user_banned`, `admin.user_unbanned`
- `admin.settings_changed`, `admin.data_access`

### Security
- `security.suspicious_activity`, `security.rate_limit_exceeded`
- `security.unauthorized_access`

## Retention Policies

| Tier | Retention Period | Cleanup |
|------|------------------|---------|
| FREE | 7 days | Automatic |
| PRO | 90 days | Automatic |
| ENTERPRISE | 365 days | Automatic |

Cleanup runs daily at 2 AM.

## Filtering

```typescript
const { logs, total } = await AuditService.getLogs({
  userId: 'user-id',              // Filter by user
  action: 'auth.login',           // Single action
  action: ['auth.login', 'auth.logout'], // Multiple actions
  resource: 'user',               // Filter by resource
  resourceId: 'resource-id',      // Specific resource
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  isSuspicious: true,             // Only suspicious
  isAdminAction: false,           // Exclude admin actions
  limit: 50,
  offset: 0,
});
```

## Statistics

```typescript
const stats = await AuditService.getStatistics('user-id', 30);

// Returns:
{
  totalLogs: 1234,
  successfulActions: 1200,
  failedActions: 34,
  suspiciousActions: 5,
  adminActions: 12,
  uniqueUsers: 45,
  actionsByType: [
    { action: 'auth.login', count: 450 },
    { action: 'project.created', count: 120 },
    ...
  ]
}
```

## Export

```typescript
const exportData = await AuditService.exportLogs({
  userId: 'user-id',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Returns JSON with:
{
  exportDate: '2024-12-16T...',
  filters: { ... },
  totalRecords: 500,
  logs: [ ... ]
}
```

## Suspicious Activity Detection

Automatically flags:
- ✅ Multiple failed logins (3+ in 15 min)
- ✅ Rapid actions (100+ in 15 min)
- ✅ Multiple IP addresses (4+ in 15 min)
- ✅ SQL injection patterns
- ✅ XSS attempts
- ✅ Path traversal
- ✅ Command injection

Check patterns:
```typescript
const patterns = await AuditService.detectSuspiciousPatterns('user-id', 15);

// Returns:
{
  multipleFailedLogins: false,
  rapidActions: false,
  multipleIpAddresses: true,
  suspiciousActions: false,
}
```

## Security Features

### Sensitive Data Masking
Automatically redacts:
- Passwords, password hashes
- Tokens, API keys, secrets
- Credit card numbers
- SSNs, private keys

### Tamper Prevention
- Append-only logs
- No update/delete operations
- Preserved on user deletion
- Immutable after creation

### Request Correlation
- Unique request IDs (UUID)
- Links related audit entries
- Tracks request duration
- Full context capture

## Compliance

### SOC 2
- ✅ All required events tracked
- ✅ Change auditing
- ✅ User attribution
- ✅ Tamper-evident logs

### GDPR
- ✅ Data access logs
- ✅ Deletion tracking
- ✅ Consent changes
- ✅ Export requests

### HIPAA
- ✅ PHI access tracking
- ✅ Authentication logs
- ✅ Unauthorized attempts
- ⚠️ Encryption needed

### ISO 27001
- ✅ Security events
- ✅ Access control
- ✅ Incident detection
- ✅ Retention policies

### PCI DSS
- ✅ Payment logs
- ✅ Admin tracking
- ✅ Failed access
- ✅ Regular reviews

## Performance

### Optimization Tips
1. Use specific filters
2. Always paginate
3. Limit date ranges
4. Use composite indexes
5. Avoid wildcard searches

### Database Indexes
- Single: userId, action, resource, resourceId, timestamp
- Composite: userId+timestamp, action+timestamp
- Boolean: isSuspicious, isAdminAction
- Cleanup: expiresAt

## Troubleshooting

### Logs Not Appearing
1. Check database connection
2. Verify Prisma is generated
3. Check middleware is applied
4. Review error logs

### Cleanup Not Running
1. Verify scheduleAuditCleanup() is called
2. Check server startup logs
3. Manually run cleanup job
4. Review expiresAt values

### Export Failing
1. Check record count (max 10,000)
2. Verify user permissions
3. Test with smaller date range
4. Check file size limits

## Development

### Running Tests
```bash
npm test -- audit
```

### Manual Cleanup
```typescript
import { runAuditCleanup } from './jobs/auditCleanup';
const result = await runAuditCleanup();
console.log(`Deleted ${result.deletedCount} logs`);
```

### Check Statistics
```typescript
import { getCleanupStats } from './jobs/auditCleanup';
const stats = await getCleanupStats();
```

## Resources

- **Integration Guide**: `AUDIT_INTEGRATION.md`
- **Full Documentation**: `AUDIT_SYSTEM_SUMMARY.md`
- **Prisma Schema**: `prisma/schema.prisma`
- **Example Routes**: `src/routes/v2/auth.routes.ts`

## Support

- Check integration guide for setup
- Review examples for usage
- Test in development first
- Contact team for issues

---

**Version**: 1.0.0
**Status**: ✅ Ready for Production
**Updated**: 2024-12-16
