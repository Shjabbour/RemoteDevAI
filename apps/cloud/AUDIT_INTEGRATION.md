# Audit Logging Integration Guide

This document provides instructions for completing the audit logging integration into RemoteDevAI.

## Manual Steps Required

### 1. Update server.ts

Add the audit cleanup import to the top of `apps/cloud/src/server.ts`:

```typescript
import { scheduleAuditCleanup } from './jobs/auditCleanup';
```

Add this line after `initializeSocketHandlers(io);`:

```typescript
// Schedule audit log cleanup job
scheduleAuditCleanup();
```

Add "Audit Logging: Enabled" to the features list in the console output.

### 2. Run Prisma Migration

After confirming the schema changes in `apps/cloud/prisma/schema.prisma`, run:

```bash
cd apps/cloud
npx prisma migrate dev --name add_audit_log
npx prisma generate
```

### 3. Update package.json Dependencies

Make sure the following dependencies are installed in `apps/cloud/package.json`:

```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

### 4. Update User Dashboard Navigation

Add a link to the audit log viewer in the user dashboard navigation:

Path: `apps/web/src/app/dashboard/layout.tsx` or navigation component

```tsx
<Link href="/dashboard/settings/audit">
  Audit Logs
</Link>
```

### 5. Update Admin Navigation

Add a link to the admin audit log viewer:

Path: `apps/web/src/app/admin/layout.tsx` or navigation component

```tsx
<Link href="/admin/audit">
  Audit Logs
</Link>
```

### 6. Add Date-fns Dependency

For the frontend pages, make sure `date-fns` is installed in `apps/web/package.json`:

```bash
cd apps/web
npm install date-fns
```

### 7. Update Authentication Routes to Log Audit Events

Example integration in `apps/cloud/src/routes/v2/auth.routes.ts`:

```typescript
import { AuditService, AuditAction, AuditResource } from '../../services/AuditService';
import { getAuditContext } from '../../middleware/audit.middleware';

// In login route
router.post('/login', async (req: AuditRequest, res: Response) => {
  try {
    const result = await AuthService.login(req.body);

    // Log successful login
    await AuditService.log({
      ...getAuditContext(req),
      userId: result.user.id,
      action: AuditAction.AUTH_LOGIN,
      resource: AuditResource.USER,
      resourceId: result.user.id,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    // Log failed login
    await AuditService.logFailure({
      ...getAuditContext(req),
      action: AuditAction.AUTH_FAILED_LOGIN,
      resource: AuditResource.USER,
    }, error.message);

    res.status(401).json({ success: false, error: error.message });
  }
});
```

## Files Created

### Backend Files

1. **apps/cloud/src/services/AuditService.ts**
   - Comprehensive audit logging service
   - Retention policies by subscription tier
   - Sensitive data masking
   - Statistics and reporting

2. **apps/cloud/src/middleware/audit.middleware.ts**
   - Request context capture
   - IP address and user agent tracking
   - Suspicious activity detection
   - Request ID generation

3. **apps/cloud/src/utils/auditLogger.ts**
   - Helper functions for common audit scenarios
   - Change detection utilities
   - Resource-specific logging helpers
   - Data sanitization

4. **apps/cloud/src/routes/audit.routes.ts**
   - User audit log endpoints
   - Admin audit log endpoints
   - Export functionality (CSV/JSON)
   - Statistics endpoints

5. **apps/cloud/src/jobs/auditCleanup.ts**
   - Scheduled cleanup job for expired logs
   - Manual cleanup functions
   - Cleanup statistics

### Frontend Files

6. **apps/web/src/app/dashboard/settings/audit/page.tsx**
   - User audit log viewer
   - Filtering and search
   - Export functionality
   - Statistics dashboard

7. **apps/web/src/app/admin/audit/page.tsx**
   - Admin audit log viewer
   - All users' logs
   - Suspicious activity monitoring
   - Detailed log inspection

### Database Schema

8. **apps/cloud/prisma/schema.prisma**
   - AuditLog model added
   - AuditStatus enum
   - Proper indexing for performance
   - Retention policy support

## Audit Events Implemented

The system tracks the following event categories:

### Authentication Events
- auth.login
- auth.logout
- auth.password_change
- auth.password_reset
- auth.mfa_enabled
- auth.failed_login
- auth.token_refresh

### User Events
- user.created
- user.updated
- user.deleted
- user.email_changed
- user.profile_updated

### Project Events
- project.created
- project.updated
- project.deleted
- project.archived
- project.shared

### Session Events
- session.started
- session.ended
- session.paused
- session.resumed

### Recording Events
- recording.created
- recording.deleted
- recording.downloaded

### Agent Events
- agent.connected
- agent.disconnected
- agent.registered

### Subscription Events
- subscription.created
- subscription.updated
- subscription.canceled
- subscription.tier_changed

### Payment Events
- payment.processed
- payment.failed
- payment.refunded

### API Key Events
- api_key.created
- api_key.revoked
- api_key.used

### Admin Events
- admin.user_impersonated
- admin.user_banned
- admin.settings_changed
- admin.data_access

### Security Events
- security.suspicious_activity
- security.rate_limit_exceeded
- security.unauthorized_access

## Retention Policies

Audit logs are automatically retained based on subscription tier:

- **FREE**: 7 days
- **PRO**: 90 days
- **ENTERPRISE**: 365 days

The cleanup job runs daily at 2 AM to remove expired logs.

## API Endpoints

### User Endpoints

- `GET /api/audit` - List user's audit logs
- `GET /api/audit/:id` - Get specific audit log
- `GET /api/audit/resource/:resource/:resourceId` - Get logs for a resource
- `GET /api/audit/analytics/stats` - Get audit statistics
- `GET /api/audit/export/csv` - Export logs as CSV
- `GET /api/audit/export/json` - Export logs as JSON

### Admin Endpoints

- `GET /api/audit/admin/all` - List all audit logs
- `GET /api/audit/admin/suspicious` - Get suspicious activities
- `GET /api/audit/admin/actions` - Get admin actions
- `GET /api/audit/admin/stats` - Get global statistics

## Security Features

1. **Sensitive Data Masking**: Passwords, tokens, and API keys are automatically redacted
2. **Tamper Detection**: Logs cannot be modified after creation
3. **Suspicious Activity Detection**: Automatic flagging of unusual patterns
4. **IP Tracking**: All actions include IP address for security auditing
5. **Request Correlation**: Request IDs link related audit entries

## Next Steps

1. Complete the manual integration steps above
2. Run database migrations
3. Test audit logging in development
4. Review and adjust retention policies if needed
5. Set up monitoring for suspicious activities
6. Train team on audit log usage
7. Document custom audit events for your use cases

## Testing

To test the audit logging system:

1. Create a new user account (should log user.created)
2. Log in (should log auth.login)
3. Create a project (should log project.created)
4. View your audit logs at /dashboard/settings/audit
5. As an admin, view all logs at /admin/audit
6. Try exporting logs in both CSV and JSON formats
7. Test suspicious activity detection with unusual patterns

## Maintenance

- Monitor disk usage for audit logs
- Review retention policies quarterly
- Check for unusual patterns in suspicious activities
- Ensure audit cleanup job is running successfully
- Backup audit logs before major migrations

## Compliance

This audit logging system helps meet compliance requirements for:

- SOC 2
- GDPR (with proper data retention)
- HIPAA (with additional encryption)
- ISO 27001
- PCI DSS

Consult with your compliance team for specific requirements.
