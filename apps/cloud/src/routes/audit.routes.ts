import { Router, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { authenticate } from '../middleware/auth.middleware';
import { AuditRequest } from '../middleware/audit.middleware';
import { logDataExport } from '../utils/auditLogger';

const router = Router();

/**
 * GET /audit - Get audit logs for the authenticated user
 */
router.get('/', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Parse query parameters
    const {
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
      isSuspicious,
    } = req.query;

    // Build filters
    const filters: any = {
      userId,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    if (action) {
      filters.action = typeof action === 'string' ? action : (action as string[]);
    }

    if (resource) {
      filters.resource = typeof resource === 'string' ? resource : (resource as string[]);
    }

    if (resourceId) {
      filters.resourceId = resourceId as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (isSuspicious !== undefined) {
      filters.isSuspicious = isSuspicious === 'true';
    }

    // Get logs
    const result = await AuditService.getLogs(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/:id - Get a specific audit log by ID
 */
router.get('/:id', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const log = await AuditService.getLogById(id);

    // Check if user has permission to view this log
    if (log.userId !== userId && req.user!.tier !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this audit log',
      });
      return;
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/resource/:resource/:resourceId - Get audit logs for a specific resource
 */
router.get(
  '/resource/:resource/:resourceId',
  authenticate,
  async (req: AuditRequest, res: Response) => {
    try {
      const { resource, resourceId } = req.params;
      const userId = req.user!.userId;

      const result = await AuditService.getLogsForResource(resource, resourceId);

      // Filter to only show user's logs (unless admin)
      if (req.user!.tier !== 'ADMIN') {
        result.logs = result.logs.filter((log) => log.userId === userId);
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching resource audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resource audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /audit/stats - Get audit statistics
 */
router.get('/analytics/stats', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { days = '30' } = req.query;

    const stats = await AuditService.getStatistics(userId, parseInt(days as string, 10));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/export - Export audit logs
 */
router.get('/export/csv', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Parse query parameters
    const { action, resource, startDate, endDate } = req.query;

    // Build filters
    const filters: any = {
      userId,
      limit: 10000, // Max export limit
    };

    if (action) {
      filters.action = action as string;
    }

    if (resource) {
      filters.resource = resource as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    // Export logs
    const exportData = await AuditService.exportLogs(filters);

    // Log export action
    await logDataExport(req, 'audit_logs', exportData.totalRecords, 'json');

    // Convert to CSV
    const logs = exportData.logs;
    if (logs.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No logs found',
        message: 'No audit logs match the specified filters',
      });
      return;
    }

    // Build CSV
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Resource',
      'Resource ID',
      'Status',
      'IP Address',
      'User Agent',
    ];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.timestamp,
        log.action,
        log.resource,
        log.resourceId || '',
        log.status,
        log.ipAddress || '',
        log.userAgent ? `"${log.userAgent.replace(/"/g, '""')}"` : '',
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
    );

    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/export/json - Export audit logs as JSON
 */
router.get('/export/json', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Parse query parameters
    const { action, resource, startDate, endDate } = req.query;

    // Build filters
    const filters: any = {
      userId,
      limit: 10000, // Max export limit
    };

    if (action) {
      filters.action = action as string;
    }

    if (resource) {
      filters.resource = resource as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    // Export logs
    const exportData = await AuditService.exportLogs(filters);

    // Log export action
    await logDataExport(req, 'audit_logs', exportData.totalRecords, 'json');

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`
    );

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * ADMIN ROUTES
 */

/**
 * GET /audit/admin/all - Get all audit logs (admin only)
 */
router.get('/admin/all', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user!.tier !== 'ADMIN' && req.user!.tier !== 'ENTERPRISE') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    // Parse query parameters
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
      isSuspicious,
      isAdminAction,
    } = req.query;

    // Build filters (no userId filter for admins)
    const filters: any = {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    if (userId) {
      filters.userId = userId as string;
    }

    if (action) {
      filters.action = typeof action === 'string' ? action : (action as string[]);
    }

    if (resource) {
      filters.resource = typeof resource === 'string' ? resource : (resource as string[]);
    }

    if (resourceId) {
      filters.resourceId = resourceId as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (isSuspicious !== undefined) {
      filters.isSuspicious = isSuspicious === 'true';
    }

    if (isAdminAction !== undefined) {
      filters.isAdminAction = isAdminAction === 'true';
    }

    // Get logs
    const result = await AuditService.getLogs(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/admin/suspicious - Get suspicious activities (admin only)
 */
router.get('/admin/suspicious', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user!.tier !== 'ADMIN' && req.user!.tier !== 'ENTERPRISE') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    const { limit = '100' } = req.query;

    const result = await AuditService.getSuspiciousActivities(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suspicious activities',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/admin/actions - Get admin actions (admin only)
 */
router.get('/admin/actions', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user!.tier !== 'ADMIN' && req.user!.tier !== 'ENTERPRISE') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    const { limit = '100' } = req.query;

    const result = await AuditService.getAdminActions(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching admin actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin actions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/admin/stats - Get global audit statistics (admin only)
 */
router.get('/admin/stats', authenticate, async (req: AuditRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user!.tier !== 'ADMIN' && req.user!.tier !== 'ENTERPRISE') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    const { days = '30' } = req.query;

    // Get stats for all users (no userId filter)
    const stats = await AuditService.getStatistics(undefined, parseInt(days as string, 10));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching global audit statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global audit statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
