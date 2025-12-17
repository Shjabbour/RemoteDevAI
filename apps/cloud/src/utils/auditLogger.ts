import { AuditService, AuditAction, AuditResource, AuditLogData } from '../services/AuditService';
import { AuditRequest } from '../middleware/audit.middleware';

/**
 * Helper functions for common audit logging scenarios
 */

/**
 * Detect changes between two objects
 */
export function detectChanges<T extends Record<string, any>>(
  before: T,
  after: T
): { changed: string[]; before: Partial<T>; after: Partial<T> } {
  const changed: string[] = [];
  const beforeValues: Partial<T> = {};
  const afterValues: Partial<T> = {};

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Deep comparison for objects and arrays
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changed.push(key);
      beforeValues[key as keyof T] = beforeValue;
      afterValues[key as keyof T] = afterValue;
    }
  }

  return { changed, before: beforeValues, after: afterValues };
}

/**
 * Build audit log data from request
 */
export function buildAuditLogData(
  req: AuditRequest,
  action: AuditAction | string,
  resource: AuditResource | string,
  resourceId?: string,
  additionalData?: Partial<AuditLogData>
): AuditLogData {
  return {
    userId: req.user?.userId,
    action,
    resource,
    resourceId,
    ipAddress: req.auditContext?.ipAddress,
    userAgent: req.auditContext?.userAgent,
    requestId: req.auditContext?.requestId,
    isSuspicious: (req.auditContext as any)?.isSuspicious || false,
    ...additionalData,
  };
}

/**
 * Log user authentication event
 */
export async function logAuthEvent(
  req: AuditRequest,
  action: AuditAction,
  userId?: string,
  success = true,
  errorMessage?: string
) {
  const data = buildAuditLogData(req, action, AuditResource.USER, userId);

  if (success) {
    await AuditService.logSuccess(data);
  } else {
    await AuditService.logFailure(data, errorMessage || 'Authentication failed');
  }
}

/**
 * Log resource creation
 */
export async function logResourceCreated(
  req: AuditRequest,
  resource: AuditResource | string,
  resourceId: string,
  resourceData: Record<string, any>
) {
  const data = buildAuditLogData(req, `${resource}.created`, resource, resourceId, {
    after: resourceData,
    details: {
      createdAt: new Date().toISOString(),
    },
  });

  await AuditService.logSuccess(data);
}

/**
 * Log resource update with change detection
 */
export async function logResourceUpdated(
  req: AuditRequest,
  resource: AuditResource | string,
  resourceId: string,
  before: Record<string, any>,
  after: Record<string, any>
) {
  const changes = detectChanges(before, after);

  if (changes.changed.length === 0) {
    // No changes detected, skip logging
    return;
  }

  const data = buildAuditLogData(req, `${resource}.updated`, resource, resourceId, {
    before: changes.before,
    after: changes.after,
    details: {
      changedFields: changes.changed,
      updatedAt: new Date().toISOString(),
    },
  });

  await AuditService.logSuccess(data);
}

/**
 * Log resource deletion
 */
export async function logResourceDeleted(
  req: AuditRequest,
  resource: AuditResource | string,
  resourceId: string,
  resourceData: Record<string, any>
) {
  const data = buildAuditLogData(req, `${resource}.deleted`, resource, resourceId, {
    before: resourceData,
    details: {
      deletedAt: new Date().toISOString(),
    },
  });

  await AuditService.logSuccess(data);
}

/**
 * Log admin action with special flagging
 */
export async function logAdminAction(
  req: AuditRequest,
  action: AuditAction | string,
  resource: AuditResource | string,
  resourceId?: string,
  details?: Record<string, any>
) {
  const data = buildAuditLogData(req, action, resource, resourceId, {
    details,
    isAdminAction: true,
  });

  await AuditService.logAdminAction(data);
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  req: AuditRequest,
  action: AuditAction | string,
  details: Record<string, any>
) {
  const data = buildAuditLogData(req, action, AuditResource.SYSTEM, undefined, {
    details: {
      ...details,
      timestamp: new Date().toISOString(),
      severity: 'high',
    },
  });

  await AuditService.logSuspicious(data);
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(
  req: AuditRequest,
  apiKeyId: string,
  endpoint: string,
  method: string
) {
  const data = buildAuditLogData(req, AuditAction.API_KEY_USED, AuditResource.API_KEY, apiKeyId, {
    details: {
      endpoint,
      method,
      timestamp: new Date().toISOString(),
    },
  });

  await AuditService.logSuccess(data);
}

/**
 * Log payment event
 */
export async function logPaymentEvent(
  req: AuditRequest,
  action: AuditAction,
  userId: string,
  amount: number,
  currency: string,
  paymentId?: string,
  success = true,
  errorMessage?: string
) {
  const data = buildAuditLogData(req, action, AuditResource.PAYMENT, paymentId, {
    details: {
      amount,
      currency,
      timestamp: new Date().toISOString(),
    },
  });

  if (success) {
    await AuditService.logSuccess({ ...data, userId });
  } else {
    await AuditService.logFailure({ ...data, userId }, errorMessage || 'Payment failed');
  }
}

/**
 * Log subscription change
 */
export async function logSubscriptionChange(
  req: AuditRequest,
  userId: string,
  subscriptionId: string,
  before: Record<string, any>,
  after: Record<string, any>
) {
  const changes = detectChanges(before, after);

  const data = buildAuditLogData(
    req,
    AuditAction.SUBSCRIPTION_UPDATED,
    AuditResource.SUBSCRIPTION,
    subscriptionId,
    {
      userId,
      before: changes.before,
      after: changes.after,
      details: {
        changedFields: changes.changed,
        timestamp: new Date().toISOString(),
      },
    }
  );

  await AuditService.logSuccess(data);
}

/**
 * Log data export request
 */
export async function logDataExport(
  req: AuditRequest,
  exportType: string,
  recordCount: number,
  format: string
) {
  const data = buildAuditLogData(
    req,
    AuditAction.EXPORT_REQUESTED,
    AuditResource.SYSTEM,
    undefined,
    {
      details: {
        exportType,
        recordCount,
        format,
        timestamp: new Date().toISOString(),
      },
    }
  );

  await AuditService.logSuccess(data);
}

/**
 * Log data import
 */
export async function logDataImport(
  req: AuditRequest,
  importType: string,
  recordCount: number,
  success = true,
  errorMessage?: string
) {
  const data = buildAuditLogData(
    req,
    AuditAction.IMPORT_COMPLETED,
    AuditResource.SYSTEM,
    undefined,
    {
      details: {
        importType,
        recordCount,
        timestamp: new Date().toISOString(),
      },
    }
  );

  if (success) {
    await AuditService.logSuccess(data);
  } else {
    await AuditService.logFailure(data, errorMessage || 'Import failed');
  }
}

/**
 * Log settings change
 */
export async function logSettingsChange(
  req: AuditRequest,
  settingName: string,
  before: any,
  after: any
) {
  const data = buildAuditLogData(
    req,
    AuditAction.SETTINGS_CHANGED,
    AuditResource.SETTINGS,
    undefined,
    {
      before: { [settingName]: before },
      after: { [settingName]: after },
      details: {
        settingName,
        timestamp: new Date().toISOString(),
      },
    }
  );

  await AuditService.logSuccess(data);
}

/**
 * Mask sensitive data for audit logs
 */
export function maskSensitiveFields(
  data: Record<string, any>,
  sensitiveFields: string[] = []
): Record<string, any> {
  const defaultSensitive = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn',
  ];

  const allSensitive = [...defaultSensitive, ...sensitiveFields];
  const masked = { ...data };

  for (const field of allSensitive) {
    if (field in masked) {
      masked[field] = '***REDACTED***';
    }
  }

  return masked;
}

/**
 * Create an audit trail for a resource
 * This retrieves all audit logs related to a specific resource
 */
export async function getResourceAuditTrail(resource: string, resourceId: string) {
  return AuditService.getLogsForResource(resource, resourceId);
}

/**
 * Check if action requires auditing
 * Some actions are too frequent or low-value to audit
 */
export function shouldAudit(action: string, resource: string): boolean {
  // Skip auditing for frequent low-value actions
  const skipActions = [
    'user.viewed',
    'project.viewed',
    'session.viewed',
    'api.health_check',
  ];

  const actionKey = `${resource}.${action}`;

  return !skipActions.includes(actionKey);
}

/**
 * Sanitize audit log data for export
 * Remove sensitive information before export
 */
export function sanitizeAuditLog(log: any): any {
  const sanitized = { ...log };

  // Remove sensitive fields
  delete sanitized.before;
  delete sanitized.after;

  // Mask IP address (keep first 3 octets)
  if (sanitized.ipAddress) {
    const parts = sanitized.ipAddress.split('.');
    if (parts.length === 4) {
      sanitized.ipAddress = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  // Remove detailed user agent (keep only browser/OS)
  if (sanitized.userAgent) {
    // Simple browser detection
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    const browser = browsers.find((b) => sanitized.userAgent.includes(b)) || 'Unknown';
    sanitized.userAgent = browser;
  }

  return sanitized;
}

export default {
  detectChanges,
  buildAuditLogData,
  logAuthEvent,
  logResourceCreated,
  logResourceUpdated,
  logResourceDeleted,
  logAdminAction,
  logSuspiciousActivity,
  logApiKeyUsage,
  logPaymentEvent,
  logSubscriptionChange,
  logDataExport,
  logDataImport,
  logSettingsChange,
  maskSensitiveFields,
  getResourceAuditTrail,
  shouldAudit,
  sanitizeAuditLog,
};
