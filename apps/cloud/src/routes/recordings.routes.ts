import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validation.middleware';
import { checkRecordingLimit, checkStorageLimit } from '../middleware/subscription.middleware';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/recordings
 * Get all recordings for the current user
 */
router.get('/', validateQuery(schemas.pagination), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query as any;
    const skip = ((page as number) - 1) * (limit as number);

    const [recordings, total] = await Promise.all([
      prisma.recording.findMany({
        where: {
          session: {
            userId: req.user!.userId,
          },
        },
        skip,
        take: limit as number,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.recording.count({
        where: {
          session: {
            userId: req.user!.userId,
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / (limit as number)),
      },
    });
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recordings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/recordings
 * Create a new recording
 */
router.post(
  '/',
  checkRecordingLimit,
  checkStorageLimit,
  validateBody(schemas.createRecording),
  async (req: AuthRequest, res) => {
    try {
      const { sessionId, title, duration, fileSize, mimeType } = req.body;

      // Verify session ownership
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
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

      const recording = await prisma.recording.create({
        data: {
          sessionId,
          title,
          duration,
          fileSize,
          mimeType,
          url: '', // Will be updated after upload
          status: 'UPLOADING',
        },
        include: {
          session: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: recording,
        message: 'Recording created successfully',
      });
    } catch (error) {
      console.error('Create recording error:', error);
      res.status(400).json({
        success: false,
        error: 'Recording creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/recordings/:id
 * Get a single recording
 */
router.get('/:id', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const recording = await prisma.recording.findFirst({
      where: {
        id: req.params.id,
        session: {
          userId: req.user!.userId,
        },
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!recording) {
      res.status(404).json({
        success: false,
        error: 'Recording not found',
      });
      return;
    }

    res.json({
      success: true,
      data: recording,
    });
  } catch (error) {
    console.error('Get recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recording',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/recordings/:id
 * Update a recording
 */
router.put(
  '/:id',
  validateParams(schemas.id),
  validateBody(schemas.updateRecording),
  async (req: AuthRequest, res) => {
    try {
      // Verify ownership
      const existingRecording = await prisma.recording.findFirst({
        where: {
          id: req.params.id,
          session: {
            userId: req.user!.userId,
          },
        },
      });

      if (!existingRecording) {
        res.status(404).json({
          success: false,
          error: 'Recording not found',
        });
        return;
      }

      const recording = await prisma.recording.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          updatedAt: new Date(),
        },
        include: {
          session: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Notify user if status changed to READY
      if (req.body.status === 'READY' && existingRecording.status !== 'READY') {
        await NotificationService.notifyRecordingUpdate(
          req.user!.userId,
          recording.id,
          'READY',
          { title: recording.title }
        );
      }

      res.json({
        success: true,
        data: recording,
        message: 'Recording updated successfully',
      });
    } catch (error) {
      console.error('Update recording error:', error);
      res.status(400).json({
        success: false,
        error: 'Recording update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/recordings/:id
 * Delete a recording
 */
router.delete('/:id', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    // Verify ownership
    const existingRecording = await prisma.recording.findFirst({
      where: {
        id: req.params.id,
        session: {
          userId: req.user!.userId,
        },
      },
    });

    if (!existingRecording) {
      res.status(404).json({
        success: false,
        error: 'Recording not found',
      });
      return;
    }

    // Delete from storage if URL exists
    if (existingRecording.url && StorageService.isConfigured()) {
      try {
        const key = StorageService.extractKeyFromUrl(existingRecording.url);
        await StorageService.deleteFile(key);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
      }
    }

    // Delete from database
    await prisma.recording.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Recording deleted successfully',
    });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(400).json({
      success: false,
      error: 'Recording deletion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/recordings/:id/upload-url
 * Generate a presigned URL for uploading
 */
router.post('/:id/upload-url', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    // Verify ownership
    const recording = await prisma.recording.findFirst({
      where: {
        id: req.params.id,
        session: {
          userId: req.user!.userId,
        },
      },
    });

    if (!recording) {
      res.status(404).json({
        success: false,
        error: 'Recording not found',
      });
      return;
    }

    if (!StorageService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Storage not configured',
        message: 'File storage is not available',
      });
      return;
    }

    // Generate presigned URL
    const { url, key } = await StorageService.generateUploadUrl({
      mimeType: recording.mimeType,
      fileName: recording.title || undefined,
    });

    // Update recording with storage key (in metadata)
    const publicUrl = StorageService.getPublicUrl(key);
    await prisma.recording.update({
      where: { id: req.params.id },
      data: {
        url: publicUrl,
      },
    });

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        publicUrl,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/recordings/:id/download-url
 * Generate a presigned URL for downloading
 */
router.get('/:id/download-url', validateParams(schemas.id), async (req: AuthRequest, res) => {
  try {
    const recording = await prisma.recording.findFirst({
      where: {
        id: req.params.id,
        session: {
          userId: req.user!.userId,
        },
      },
    });

    if (!recording) {
      res.status(404).json({
        success: false,
        error: 'Recording not found',
      });
      return;
    }

    if (!recording.url) {
      res.status(400).json({
        success: false,
        error: 'Recording not uploaded',
        message: 'This recording has not been uploaded yet',
      });
      return;
    }

    if (!StorageService.isConfigured()) {
      // If storage is not configured, return the public URL directly
      res.json({
        success: true,
        data: {
          url: recording.url,
          expiresIn: null,
        },
      });
      return;
    }

    // Generate presigned download URL
    const key = StorageService.extractKeyFromUrl(recording.url);
    const url = await StorageService.generateDownloadUrl(key);

    res.json({
      success: true,
      data: {
        url,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error('Generate download URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate download URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
