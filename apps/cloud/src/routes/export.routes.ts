import { Router, Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import { BackupService } from '../services/BackupService';
import { requireAuth } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// All export routes require authentication
router.use(requireAuth);

/**
 * POST /api/export/full
 * Create a full account export
 */
router.post('/full', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      format: z.enum(['JSON', 'CSV', 'ZIP']).default('JSON'),
      includeRecordings: z.boolean().default(false),
      includeFiles: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    // Create export job
    const job = await ExportService.createExportJob({
      userId,
      format: data.format,
      type: 'FULL',
      includeRecordings: data.includeRecordings,
      includeFiles: data.includeFiles,
    });

    // Process job asynchronously
    ExportService.processExportJob(job.id).catch(error => {
      console.error('Export job failed:', error);
    });

    res.json({
      success: true,
      data: job,
      message: 'Export job created successfully',
    });
  } catch (error) {
    console.error('Export full error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Failed to create export',
    });
  }
});

/**
 * POST /api/export/project/:id
 * Export a specific project
 */
router.post('/project/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const projectId = req.params.id;

    const schema = z.object({
      format: z.enum(['JSON', 'CSV', 'ZIP']).default('JSON'),
      includeRecordings: z.boolean().default(false),
      includeFiles: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    // Create export job
    const job = await ExportService.createExportJob({
      userId,
      format: data.format,
      type: 'PROJECT',
      projectId,
      includeRecordings: data.includeRecordings,
      includeFiles: data.includeFiles,
    });

    // Process job asynchronously
    ExportService.processExportJob(job.id).catch(error => {
      console.error('Export job failed:', error);
    });

    res.json({
      success: true,
      data: job,
      message: 'Project export job created successfully',
    });
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Failed to create project export',
    });
  }
});

/**
 * POST /api/export/recordings
 * Export all recordings
 */
router.post('/recordings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      format: z.enum(['JSON', 'CSV', 'ZIP']).default('JSON'),
      dateRange: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      }).optional(),
      includeFiles: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    // Create export job
    const job = await ExportService.createExportJob({
      userId,
      format: data.format,
      type: 'RECORDINGS',
      includeRecordings: true,
      includeFiles: data.includeFiles,
      dateRange: data.dateRange ? {
        from: data.dateRange.from ? new Date(data.dateRange.from) : undefined,
        to: data.dateRange.to ? new Date(data.dateRange.to) : undefined,
      } : undefined,
    });

    // Process job asynchronously
    ExportService.processExportJob(job.id).catch(error => {
      console.error('Export job failed:', error);
    });

    res.json({
      success: true,
      data: job,
      message: 'Recordings export job created successfully',
    });
  } catch (error) {
    console.error('Export recordings error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Failed to create recordings export',
    });
  }
});

/**
 * POST /api/export/sessions
 * Export all sessions
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      format: z.enum(['JSON', 'CSV', 'ZIP']).default('JSON'),
      dateRange: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      }).optional(),
      includeRecordings: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    // Create export job
    const job = await ExportService.createExportJob({
      userId,
      format: data.format,
      type: 'SESSIONS',
      includeRecordings: data.includeRecordings,
      dateRange: data.dateRange ? {
        from: data.dateRange.from ? new Date(data.dateRange.from) : undefined,
        to: data.dateRange.to ? new Date(data.dateRange.to) : undefined,
      } : undefined,
    });

    // Process job asynchronously
    ExportService.processExportJob(job.id).catch(error => {
      console.error('Export job failed:', error);
    });

    res.json({
      success: true,
      data: job,
      message: 'Sessions export job created successfully',
    });
  } catch (error) {
    console.error('Export sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Failed to create sessions export',
    });
  }
});

/**
 * POST /api/export/gdpr
 * GDPR-compliant data export
 */
router.post('/gdpr', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Create GDPR export job (always JSON format with all data)
    const job = await ExportService.createExportJob({
      userId,
      format: 'JSON',
      type: 'GDPR',
      includeRecordings: true,
      includeFiles: false,
    });

    // Process job asynchronously
    ExportService.processExportJob(job.id).catch(error => {
      console.error('GDPR export job failed:', error);
    });

    res.json({
      success: true,
      data: job,
      message: 'GDPR export job created successfully',
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Failed to create GDPR export',
    });
  }
});

/**
 * GET /api/export/status/:jobId
 * Get export job status
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { jobId } = req.params;

    const job = await ExportService.getExportJob(jobId, userId);

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get export status error:', error);
    res.status(error instanceof Error && error.message === 'Export job not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to get export status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/export/download/:jobId
 * Download export file
 */
router.get('/download/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { jobId } = req.params;

    const { data, fileName, contentType } = await ExportService.downloadExport(jobId, userId);

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', contentType);

    res.send(data);
  } catch (error) {
    console.error('Download export error:', error);
    res.status(error instanceof Error && error.message === 'Export job not found' ? 404 : 500).json({
      success: false,
      error: 'Download failed',
      message: error instanceof Error ? error.message : 'Failed to download export',
    });
  }
});

/**
 * GET /api/export/list
 * List all export jobs for user
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    });

    const params = schema.parse(req.query);

    const result = await ExportService.listExportJobs(userId, params);

    res.json({
      success: true,
      data: result.jobs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List exports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list exports',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/export/:jobId
 * Delete an export job
 */
router.delete('/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { jobId } = req.params;

    await ExportService.deleteExportJob(jobId, userId);

    res.json({
      success: true,
      message: 'Export deleted successfully',
    });
  } catch (error) {
    console.error('Delete export error:', error);
    res.status(error instanceof Error && error.message === 'Export job not found' ? 404 : 500).json({
      success: false,
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Failed to delete export',
    });
  }
});

/**
 * POST /api/export/backup/full
 * Create a full backup (encrypted)
 */
router.post('/backup/full', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      encrypt: z.boolean().default(true),
      includeRecordings: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    const backup = await BackupService.createFullBackup(userId, data);

    res.json({
      success: true,
      data: backup,
      message: 'Full backup created successfully',
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Backup failed',
      message: error instanceof Error ? error.message : 'Failed to create backup',
    });
  }
});

/**
 * POST /api/export/backup/project/:id
 * Create a project backup
 */
router.post('/backup/project/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const projectId = req.params.id;

    const schema = z.object({
      encrypt: z.boolean().default(true),
      includeRecordings: z.boolean().default(false),
    });

    const data = schema.parse(req.body);

    const backup = await BackupService.createProjectBackup(userId, projectId, data);

    res.json({
      success: true,
      data: backup,
      message: 'Project backup created successfully',
    });
  } catch (error) {
    console.error('Create project backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Backup failed',
      message: error instanceof Error ? error.message : 'Failed to create project backup',
    });
  }
});

/**
 * GET /api/export/backup/list
 * List all backups
 */
router.get('/backup/list', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    });

    const params = schema.parse(req.query);

    const result = await BackupService.listBackups(userId, params);

    res.json({
      success: true,
      data: result.backups,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/export/backup/:id/download
 * Download a backup
 */
router.get('/backup/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { key } = req.query;

    const backup = await BackupService.downloadBackup(id, userId, key as string | undefined);

    res.setHeader('Content-Disposition', `attachment; filename="backup-${id}.json"`);
    res.setHeader('Content-Type', 'application/json');

    res.send(backup.data);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(error instanceof Error && error.message === 'Backup not found' ? 404 : 500).json({
      success: false,
      error: 'Download failed',
      message: error instanceof Error ? error.message : 'Failed to download backup',
    });
  }
});

/**
 * DELETE /api/export/backup/:id
 * Delete a backup
 */
router.delete('/backup/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await BackupService.deleteBackup(id, userId);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(error instanceof Error && error.message === 'Backup not found' ? 404 : 500).json({
      success: false,
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Failed to delete backup',
    });
  }
});

/**
 * GET /api/export/backup/stats
 * Get backup statistics
 */
router.get('/backup/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const stats = await BackupService.getBackupStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get backup stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
