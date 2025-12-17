import { Router } from 'express';
import { ProjectService } from '../services/ProjectService';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validation.middleware';
import { checkProjectLimit } from '../middleware/subscription.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/projects
 * Get all projects for the current user
 */
router.get('/', validateQuery(schemas.pagination), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query as any;
    const includeArchived = req.query.includeArchived === 'true';

    const result = await ProjectService.getProjects(req.user!.userId, {
      page,
      limit,
      includeArchived,
    });

    res.json({
      success: true,
      data: result.projects,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get projects',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post(
  '/',
  checkProjectLimit,
  validateBody(schemas.createProject),
  async (req: AuthRequest, res) => {
    try {
      const project = await ProjectService.createProject(req.user!.userId, req.body);

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully',
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(400).json({
        success: false,
        error: 'Project creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/projects/:id
 * Get a single project
 */
router.get('/:id', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const project = await ProjectService.getProject(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(404).json({
      success: false,
      error: 'Project not found',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put(
  '/:id',
  validateParams(schemas.id),
  validateBody(schemas.updateProject),
  async (req: AuthRequest, res) => {
    try {
      const project = await ProjectService.updateProject(
        req.params.id,
        req.user!.userId,
        req.body
      );

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully',
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(400).json({
        success: false,
        error: 'Project update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    await ProjectService.deleteProject(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(400).json({
      success: false,
      error: 'Project deletion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/projects/:id/archive
 * Archive a project
 */
router.post('/:id/archive', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const project = await ProjectService.archiveProject(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: project,
      message: 'Project archived successfully',
    });
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(400).json({
      success: false,
      error: 'Project archiving failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/projects/:id/unarchive
 * Unarchive a project
 */
router.post('/:id/unarchive', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const project = await ProjectService.unarchiveProject(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: project,
      message: 'Project unarchived successfully',
    });
  } catch (error) {
    console.error('Unarchive project error:', error);
    res.status(400).json({
      success: false,
      error: 'Project unarchiving failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/projects/:id/statistics
 * Get project statistics
 */
router.get('/:id/statistics', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const stats = await ProjectService.getProjectStatistics(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get project statistics error:', error);
    res.status(404).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
