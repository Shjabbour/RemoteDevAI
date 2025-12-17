import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validation.middleware';
import { checkSessionLimit } from '../middleware/subscription.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/sessions
 * Get all sessions for the current user
 */
router.get('/', validateQuery(schemas.pagination), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query as any;
    const skip = ((page as number) - 1) * (limit as number);

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { userId: req.user!.userId },
        skip,
        take: limit as number,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              recordings: true,
            },
          },
        },
      }),
      prisma.session.count({
        where: { userId: req.user!.userId },
      }),
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / (limit as number)),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/sessions
 * Create a new session
 */
router.post(
  '/',
  checkSessionLimit,
  validateBody(schemas.createSession),
  async (req: AuthRequest, res) => {
    try {
      const { projectId, title } = req.body;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user!.userId,
        },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      const session = await prisma.session.create({
        data: {
          projectId,
          userId: req.user!.userId,
          title,
          status: 'ACTIVE',
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully',
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(400).json({
        success: false,
        error: 'Session creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/sessions/:id
 * Get a single session
 */
router.get('/:id', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        recordings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/sessions/:id
 * Update a session
 */
router.put(
  '/:id',
  validateParams(schemas.id),
  validateBody(schemas.updateSession),
  async (req: AuthRequest, res) => {
    try {
      // Verify ownership
      const existingSession = await prisma.session.findFirst({
        where: {
          id: req.params.id,
          userId: req.user!.userId,
        },
      });

      if (!existingSession) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
        });
        return;
      }

      const session = await prisma.session.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          updatedAt: new Date(),
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully',
      });
    } catch (error) {
      console.error('Update session error:', error);
      res.status(400).json({
        success: false,
        error: 'Session update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
router.delete('/:id', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    // Verify ownership
    const existingSession = await prisma.session.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!existingSession) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    await prisma.session.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(400).json({
      success: false,
      error: 'Session deletion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/sessions/:id/complete
 * Mark a session as completed
 */
router.post('/:id/complete', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    const updatedSession = await prisma.session.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedSession,
      message: 'Session completed',
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to complete session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
