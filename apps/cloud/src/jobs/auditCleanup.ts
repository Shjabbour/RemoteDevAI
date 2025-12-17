import { AuditService } from '../services/AuditService';

/**
 * Audit Log Cleanup Job
 *
 * This job runs periodically to clean up expired audit logs based on
 * retention policies defined by subscription tiers:
 * - FREE: 7 days
 * - PRO: 90 days
 * - ENTERPRISE: 365 days
 *
 * Run this job daily using a cron scheduler
 */

/**
 * Execute the audit cleanup job
 */
export async function runAuditCleanup(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    console.log('[AuditCleanup] Starting audit log cleanup job...');

    const deletedCount = await AuditService.deleteExpired();

    console.log(`[AuditCleanup] Successfully deleted ${deletedCount} expired audit logs`);

    return {
      success: true,
      deletedCount,
    };
  } catch (error) {
    console.error('[AuditCleanup] Error during audit log cleanup:', error);

    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Schedule the audit cleanup job
 * This can be called from the server initialization to set up periodic cleanup
 */
export function scheduleAuditCleanup(): void {
  // Run immediately on startup
  runAuditCleanup();

  // Run every day at 2 AM
  const scheduleInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();

    // Only run at 2 AM
    if (hours === 2) {
      await runAuditCleanup();
    }
  }, 60 * 60 * 1000); // Check every hour

  console.log('[AuditCleanup] Audit cleanup job scheduled (runs daily at 2 AM)');
}

/**
 * Manual cleanup function for administrative use
 * Can be called via API endpoint or CLI
 */
export async function manualCleanup(daysToKeep?: number): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    console.log('[AuditCleanup] Starting manual audit log cleanup...');

    if (daysToKeep) {
      // Custom cleanup based on days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // This would require a custom query in AuditService
      // For now, we'll use the standard cleanup
      console.log(`[AuditCleanup] Custom cleanup not implemented, using standard retention policies`);
    }

    const deletedCount = await AuditService.deleteExpired();

    console.log(`[AuditCleanup] Manual cleanup complete. Deleted ${deletedCount} audit logs`);

    return {
      success: true,
      deletedCount,
    };
  } catch (error) {
    console.error('[AuditCleanup] Error during manual cleanup:', error);

    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get cleanup statistics
 * Shows how many logs are due for cleanup
 */
export async function getCleanupStats(): Promise<{
  totalExpired: number;
  byTier: Record<string, number>;
}> {
  try {
    // This would require additional queries in AuditService
    // For now, return a placeholder
    console.log('[AuditCleanup] Getting cleanup statistics...');

    return {
      totalExpired: 0,
      byTier: {
        FREE: 0,
        PRO: 0,
        ENTERPRISE: 0,
      },
    };
  } catch (error) {
    console.error('[AuditCleanup] Error getting cleanup stats:', error);
    throw error;
  }
}

export default {
  runAuditCleanup,
  scheduleAuditCleanup,
  manualCleanup,
  getCleanupStats,
};
