import { Router, Request, Response } from 'express';
import { ImportService } from '../services/ImportService';
import { requireAuth } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// All import routes require authentication
router.use(requireAuth);

/**
 * POST /api/import/validate
 * Validate backup/export file before importing
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      data: z.any(),
    });

    const { data } = schema.parse(req.body);

    const validation = await ImportService.validateImport(userId, data);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Validate import error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Failed to validate import data',
    });
  }
});

/**
 * POST /api/import/start
 * Start an import job
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      data: z.any(),
      conflictResolution: z.enum(['SKIP', 'OVERWRITE', 'MERGE']).default('SKIP'),
    });

    const { data, conflictResolution } = schema.parse(req.body);

    // Create import job
    const job = await ImportService.createImportJob(userId, data);

    // Process job asynchronously
    ImportService.processImportJob(job.id, { conflictResolution }).catch(error => {
      console.error('Import job failed:', error);
    });

    res.json({
      success: true,
      data: job,
      message: 'Import job started successfully',
    });
  } catch (error) {
    console.error('Start import error:', error);
    res.status(500).json({
      success: false,
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Failed to start import',
    });
  }
});

/**
 * GET /api/import/status/:jobId
 * Get import job status
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { jobId } = req.params;

    const job = await ImportService.getImportJob(jobId, userId);

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get import status error:', error);
    res.status(error instanceof Error && error.message === 'Import job not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to get import status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/import/list
 * List all import jobs for user
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    });

    const params = schema.parse(req.query);

    const result = await ImportService.listImportJobs(userId, params);

    res.json({
      success: true,
      data: result.jobs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List imports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list imports',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/import/:jobId
 * Delete an import job
 */
router.delete('/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { jobId } = req.params;

    await ImportService.deleteImportJob(jobId, userId);

    res.json({
      success: true,
      message: 'Import job deleted successfully',
    });
  } catch (error) {
    console.error('Delete import error:', error);
    res.status(error instanceof Error && error.message === 'Import job not found' ? 404 : 500).json({
      success: false,
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Failed to delete import job',
    });
  }
});

export default router;
