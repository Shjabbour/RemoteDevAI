/**
 * Upload Middleware
 *
 * Provides middleware for file upload operations including:
 * - File type validation
 * - File size enforcement
 * - Multer configuration for direct uploads
 * - Request validation
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { FILE_CONFIG } from '../utils/s3';

/**
 * Validate file type
 */
export function validateFileType(req: Request, res: Response, next: NextFunction) {
  const mimeType = req.body.mimeType || req.headers['content-type'];

  if (!mimeType) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_MIME_TYPE',
      message: 'MIME type is required',
    });
  }

  // Check if MIME type is allowed
  const isAllowed = Object.values(FILE_CONFIG.allowedMimeTypes).some((types) =>
    types.includes(mimeType)
  );

  if (!isAllowed) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_TYPE',
      message: `File type ${mimeType} is not allowed`,
    });
  }

  next();
}

/**
 * Validate file size against user's tier
 */
export function validateFileSize(req: Request, res: Response, next: NextFunction) {
  const size = parseInt(req.body.size || req.headers['content-length'] || '0');
  const userTier = (req as any).user?.subscriptionTier || 'FREE';

  const tierLimits = FILE_CONFIG.sizeLimits[userTier as keyof typeof FILE_CONFIG.sizeLimits];

  if (!tierLimits) {
    return res.status(500).json({
      success: false,
      error: 'INVALID_TIER',
      message: 'Invalid subscription tier',
    });
  }

  if (size > tierLimits.perFile) {
    return res.status(413).json({
      success: false,
      error: 'FILE_TOO_LARGE',
      message: `File size exceeds limit for ${userTier} tier. Maximum: ${formatBytes(tierLimits.perFile)}`,
      limit: tierLimits.perFile,
    });
  }

  next();
}

/**
 * Multer storage configuration (for direct uploads)
 * Note: For production, we recommend using presigned URLs instead of direct uploads through the API
 */
const storage = multer.memoryStorage();

/**
 * Multer file filter
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type
  const isAllowed = Object.values(FILE_CONFIG.allowedMimeTypes).some((types) =>
    types.includes(file.mimetype)
  );

  if (!isAllowed) {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
    return;
  }

  cb(null, true);
};

/**
 * Multer configuration for single file upload
 */
export const uploadSingle = (fieldName: string = 'file', maxSize?: number) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize || FILE_CONFIG.sizeLimits.FREE.perFile,
      files: 1,
    },
  }).single(fieldName);
};

/**
 * Multer configuration for multiple file upload
 */
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 10, maxSize?: number) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize || FILE_CONFIG.sizeLimits.FREE.perFile,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

/**
 * Validate upload request body
 */
export function validateUploadRequest(req: Request, res: Response, next: NextFunction) {
  const { filename, mimeType, size } = req.body;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILENAME',
      message: 'Filename is required and must be a string',
    });
  }

  if (filename.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'FILENAME_TOO_LONG',
      message: 'Filename must be less than 255 characters',
    });
  }

  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_MIME_TYPE',
      message: 'MIME type is required and must be a string',
    });
  }

  if (!size || isNaN(parseInt(size))) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_SIZE',
      message: 'File size is required and must be a number',
    });
  }

  next();
}

/**
 * Validate multipart upload request
 */
export function validateMultipartRequest(req: Request, res: Response, next: NextFunction) {
  const { filename, mimeType, size } = req.body;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILENAME',
      message: 'Filename is required and must be a string',
    });
  }

  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_MIME_TYPE',
      message: 'MIME type is required and must be a string',
    });
  }

  const fileSize = parseInt(size);
  if (!size || isNaN(fileSize)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_SIZE',
      message: 'File size is required and must be a number',
    });
  }

  // Multipart uploads are for files >= 5MB
  const minMultipartSize = 5 * 1024 * 1024;
  if (fileSize < minMultipartSize) {
    return res.status(400).json({
      success: false,
      error: 'FILE_TOO_SMALL',
      message: `Multipart upload is for files >= ${formatBytes(minMultipartSize)}. Use simple upload instead.`,
    });
  }

  next();
}

/**
 * Validate part upload request
 */
export function validatePartRequest(req: Request, res: Response, next: NextFunction) {
  const { fileId } = req.params;
  const { partNumber } = req.body;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FILE_ID',
      message: 'File ID is required',
    });
  }

  const partNum = parseInt(partNumber);
  if (!partNumber || isNaN(partNum) || partNum < 1) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PART_NUMBER',
      message: 'Part number is required and must be a positive integer',
    });
  }

  next();
}

/**
 * Validate complete multipart request
 */
export function validateCompleteRequest(req: Request, res: Response, next: NextFunction) {
  const { fileId } = req.params;
  const { parts } = req.body;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FILE_ID',
      message: 'File ID is required',
    });
  }

  if (!parts || !Array.isArray(parts) || parts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PARTS',
      message: 'Parts array is required and must not be empty',
    });
  }

  // Validate each part
  for (const part of parts) {
    if (!part.ETag || typeof part.ETag !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PART_ETAG',
        message: 'Each part must have an ETag string',
      });
    }

    const partNum = parseInt(part.PartNumber);
    if (!part.PartNumber || isNaN(partNum) || partNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PART_NUMBER',
        message: 'Each part must have a valid PartNumber',
      });
    }
  }

  next();
}

/**
 * Error handler for multer errors
 */
export function handleMulterError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the maximum allowed size',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'TOO_MANY_FILES',
        message: 'Too many files uploaded',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'UNEXPECTED_FILE',
        message: 'Unexpected file field',
      });
    }

    return res.status(400).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: err.message,
    });
  }

  if (err) {
    return res.status(500).json({
      success: false,
      error: 'UPLOAD_FAILED',
      message: err.message || 'File upload failed',
    });
  }

  next();
}

/**
 * Format bytes for human-readable display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
