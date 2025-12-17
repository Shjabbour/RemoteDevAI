/**
 * Upload Routes
 *
 * Handles file upload endpoints including:
 * - Presigned URL generation
 * - Multipart upload management
 * - File status tracking
 * - File deletion
 */

import { Router, Request, Response } from 'express';
import * as UploadService from '../services/UploadService';
import * as s3Utils from '../utils/s3';
import {
  validateUploadRequest,
  validateMultipartRequest,
  validatePartRequest,
  validateCompleteRequest,
  validateFileType,
  validateFileSize,
} from '../middleware/upload.middleware';

const router = Router();

/**
 * GET /api/upload/quota
 * Get user's storage quota and usage
 */
router.get('/quota', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const quota = await UploadService.getStorageQuota(userId);

    res.json({
      success: true,
      data: quota,
    });
  } catch (error: any) {
    console.error('Get quota error:', error);
    res.status(500).json({
      success: false,
      error: 'QUOTA_ERROR',
      message: error.message || 'Failed to get storage quota',
    });
  }
});

/**
 * POST /api/upload/presign
 * Generate presigned URL for simple file upload
 */
router.post(
  '/presign',
  validateUploadRequest,
  validateFileType,
  validateFileSize,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const { filename, mimeType, size, projectId, sessionId, category, isPublic } = req.body;

      const result = await UploadService.generatePresignedUpload({
        userId,
        filename,
        mimeType,
        size: parseInt(size),
        projectId,
        sessionId,
        category,
        isPublic: isPublic === true || isPublic === 'true',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Presign error:', error);

      if (error.message.includes('quota')) {
        return res.status(403).json({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'PRESIGN_FAILED',
        message: error.message || 'Failed to generate presigned URL',
      });
    }
  }
);

/**
 * POST /api/upload/multipart/init
 * Initialize multipart upload for large files
 */
router.post(
  '/multipart/init',
  validateMultipartRequest,
  validateFileType,
  validateFileSize,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const { filename, mimeType, size, projectId, sessionId, category, isPublic } = req.body;

      const result = await UploadService.initializeMultipartUpload({
        userId,
        filename,
        mimeType,
        size: parseInt(size),
        projectId,
        sessionId,
        category,
        isPublic: isPublic === true || isPublic === 'true',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Multipart init error:', error);

      if (error.message.includes('quota')) {
        return res.status(403).json({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'MULTIPART_INIT_FAILED',
        message: error.message || 'Failed to initialize multipart upload',
      });
    }
  }
);

/**
 * POST /api/upload/multipart/:fileId/part
 * Generate presigned URL for uploading a part
 */
router.post('/multipart/:fileId/part', validatePartRequest, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { fileId } = req.params;
    const { partNumber } = req.body;

    const uploadUrl = await UploadService.generatePartUploadUrl({
      fileId,
      partNumber: parseInt(partNumber),
    });

    res.json({
      success: true,
      data: {
        uploadUrl,
        partNumber: parseInt(partNumber),
      },
    });
  } catch (error: any) {
    console.error('Part URL error:', error);
    res.status(500).json({
      success: false,
      error: 'PART_URL_FAILED',
      message: error.message || 'Failed to generate part upload URL',
    });
  }
});

/**
 * POST /api/upload/multipart/:fileId/complete
 * Complete multipart upload
 */
router.post(
  '/multipart/:fileId/complete',
  validateCompleteRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const { fileId } = req.params;
      const { parts } = req.body;

      await UploadService.completeMultipartUpload({
        fileId,
        parts,
      });

      res.json({
        success: true,
        message: 'Upload completed successfully',
      });
    } catch (error: any) {
      console.error('Complete multipart error:', error);
      res.status(500).json({
        success: false,
        error: 'COMPLETE_FAILED',
        message: error.message || 'Failed to complete multipart upload',
      });
    }
  }
);

/**
 * POST /api/upload/multipart/:fileId/abort
 * Abort multipart upload
 */
router.post('/multipart/:fileId/abort', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { fileId } = req.params;

    await UploadService.abortMultipartUpload(fileId);

    res.json({
      success: true,
      message: 'Upload aborted successfully',
    });
  } catch (error: any) {
    console.error('Abort multipart error:', error);
    res.status(500).json({
      success: false,
      error: 'ABORT_FAILED',
      message: error.message || 'Failed to abort multipart upload',
    });
  }
});

/**
 * POST /api/upload/:fileId/complete
 * Mark simple upload as complete
 */
router.post('/:fileId/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { fileId } = req.params;

    await UploadService.markUploadComplete(fileId);

    res.json({
      success: true,
      message: 'Upload completed successfully',
    });
  } catch (error: any) {
    console.error('Mark complete error:', error);
    res.status(500).json({
      success: false,
      error: 'COMPLETE_FAILED',
      message: error.message || 'Failed to complete upload',
    });
  }
});

/**
 * GET /api/upload/status/:fileId
 * Get upload status
 */
router.get('/status/:fileId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { fileId } = req.params;

    const status = await UploadService.getUploadStatus(fileId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message || 'File not found',
    });
  }
});

/**
 * GET /api/files
 * List user files
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { projectId, category, status, limit, offset } = req.query;

    const result = await UploadService.listFiles(userId, {
      projectId: projectId as string,
      category: category as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      error: 'LIST_FAILED',
      message: error.message || 'Failed to list files',
    });
  }
});

/**
 * GET /api/files/:fileId/download
 * Generate download URL for file
 */
router.get('/:fileId/download', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { fileId } = req.params;

    const downloadUrl = await UploadService.generateDownloadUrl(fileId, userId);

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
      },
    });
  } catch (error: any) {
    console.error('Download URL error:', error);

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this file',
      });
    }

    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message || 'File not found',
    });
  }
});

/**
 * DELETE /api/files/:fileId
 * Delete file
 */
router.delete('/:fileId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const { fileId } = req.params;

    await UploadService.deleteFile(fileId, userId);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this file',
      });
    }

    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: error.message || 'File not found',
    });
  }
});

/**
 * GET /api/upload/health
 * Health check for S3 connection
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await s3Utils.healthCheck();

    if (isHealthy) {
      res.json({
        success: true,
        message: 'S3 connection healthy',
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'S3_UNHEALTHY',
        message: 'S3 connection failed',
      });
    }
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'HEALTH_CHECK_FAILED',
      message: error.message || 'Health check failed',
    });
  }
});

export default router;
