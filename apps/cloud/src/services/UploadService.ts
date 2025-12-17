/**
 * Upload Service
 *
 * Handles file upload operations including:
 * - Presigned URL generation for direct S3 uploads
 * - Multipart upload management for large files
 * - File validation and security checks
 * - Storage quota enforcement
 * - File processing (thumbnails, optimization, etc.)
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as s3Utils from '../utils/s3';

const prisma = new PrismaClient();

interface PresignedUploadRequest {
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  projectId?: string;
  sessionId?: string;
  category?: string;
  isPublic?: boolean;
}

interface PresignedUploadResponse {
  fileId: string;
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

interface MultipartUploadRequest {
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  projectId?: string;
  sessionId?: string;
  category?: string;
  isPublic?: boolean;
}

interface MultipartUploadResponse {
  fileId: string;
  uploadId: string;
  s3Key: string;
  partSize: number;
  partCount: number;
}

interface UploadPartRequest {
  fileId: string;
  partNumber: number;
}

interface CompleteMultipartRequest {
  fileId: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
}

/**
 * Get user's storage quota and usage
 */
export async function getStorageQuota(userId: string) {
  // Get or create storage quota record
  let quota = await prisma.storageQuota.findUnique({
    where: { userId },
  });

  if (!quota) {
    // Get user's subscription tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    const tier = user?.subscriptionTier || 'FREE';
    const quotaLimit = s3Utils.FILE_CONFIG.sizeLimits[tier as keyof typeof s3Utils.FILE_CONFIG.sizeLimits].total;

    quota = await prisma.storageQuota.create({
      data: {
        userId,
        quotaLimit: BigInt(quotaLimit),
        quotaUsed: BigInt(0),
        fileCount: 0,
      },
    });
  }

  return {
    quotaLimit: Number(quota.quotaLimit),
    quotaUsed: Number(quota.quotaUsed),
    quotaAvailable: Number(quota.quotaLimit) - Number(quota.quotaUsed),
    quotaUsedPercentage: (Number(quota.quotaUsed) / Number(quota.quotaLimit)) * 100,
    fileCount: quota.fileCount,
  };
}

/**
 * Check if user has enough storage quota
 */
async function checkStorageQuota(userId: string, fileSize: number): Promise<boolean> {
  const quota = await getStorageQuota(userId);
  return quota.quotaAvailable >= fileSize;
}

/**
 * Update storage quota after upload
 */
async function updateStorageQuota(userId: string, fileSize: number, increment: boolean = true) {
  const quota = await prisma.storageQuota.findUnique({
    where: { userId },
  });

  if (!quota) {
    throw new Error('Storage quota not found');
  }

  const newQuotaUsed = increment
    ? Number(quota.quotaUsed) + fileSize
    : Number(quota.quotaUsed) - fileSize;

  const newFileCount = increment ? quota.fileCount + 1 : quota.fileCount - 1;

  // Check if warning threshold is crossed
  const warningThreshold = Number(quota.quotaLimit) * quota.warningThreshold;
  const shouldWarn = newQuotaUsed >= warningThreshold && Number(quota.quotaUsed) < warningThreshold;

  await prisma.storageQuota.update({
    where: { userId },
    data: {
      quotaUsed: BigInt(newQuotaUsed),
      fileCount: newFileCount,
      lastWarningAt: shouldWarn ? new Date() : quota.lastWarningAt,
      quotaWarningsSent: shouldWarn ? quota.quotaWarningsSent + 1 : quota.quotaWarningsSent,
    },
  });

  // TODO: Send warning email if shouldWarn is true
  if (shouldWarn) {
    console.log(`Storage warning for user ${userId}: ${(newQuotaUsed / Number(quota.quotaLimit)) * 100}% used`);
  }
}

/**
 * Validate file upload request
 */
function validateUploadRequest(request: PresignedUploadRequest, userTier: string): void {
  // Check file size against tier limits
  const tierLimits = s3Utils.FILE_CONFIG.sizeLimits[userTier as keyof typeof s3Utils.FILE_CONFIG.sizeLimits];

  if (!tierLimits) {
    throw new Error('Invalid subscription tier');
  }

  if (request.size > tierLimits.perFile) {
    throw new Error(
      `File size exceeds limit for ${userTier} tier. Maximum: ${s3Utils.formatFileSize(tierLimits.perFile)}`
    );
  }

  // Validate MIME type
  if (!s3Utils.isValidMimeType(request.mimeType)) {
    throw new Error(`File type ${request.mimeType} is not allowed`);
  }

  // Validate filename
  if (!request.filename || request.filename.length > 255) {
    throw new Error('Invalid filename');
  }
}

/**
 * Generate presigned URL for simple upload (< 5MB)
 */
export async function generatePresignedUpload(
  request: PresignedUploadRequest
): Promise<PresignedUploadResponse> {
  // Get user's subscription tier
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { subscriptionTier: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Validate request
  validateUploadRequest(request, user.subscriptionTier);

  // Check storage quota
  const hasQuota = await checkStorageQuota(request.userId, request.size);
  if (!hasQuota) {
    throw new Error('Storage quota exceeded. Please upgrade your plan or delete some files.');
  }

  // Generate S3 key
  const s3Key = s3Utils.generateS3Key(request.userId, request.filename, {
    projectId: request.projectId,
    sessionId: request.sessionId,
    prefix: request.category?.toLowerCase(),
  });

  // Determine file category
  const category = request.category || s3Utils.getFileCategory(request.mimeType);

  // Create file record in database
  const file = await prisma.file.create({
    data: {
      id: uuidv4(),
      userId: request.userId,
      projectId: request.projectId,
      sessionId: request.sessionId,
      filename: request.filename,
      originalName: request.filename,
      mimeType: request.mimeType,
      size: BigInt(request.size),
      category: category as any,
      s3Key,
      s3Bucket: process.env.S3_BUCKET_NAME || 'remotedevai-uploads',
      s3Region: process.env.AWS_REGION || 'us-east-1',
      status: 'UPLOADING',
      isPublic: request.isPublic || false,
      uploadProgress: 0,
    },
  });

  // Generate presigned URL
  const expiresIn = 3600; // 1 hour
  const uploadUrl = await s3Utils.generatePresignedUploadUrl(s3Key, request.mimeType, expiresIn);

  return {
    fileId: file.id,
    uploadUrl,
    s3Key,
    expiresIn,
  };
}

/**
 * Initialize multipart upload for large files (>= 5MB)
 */
export async function initializeMultipartUpload(
  request: MultipartUploadRequest
): Promise<MultipartUploadResponse> {
  // Get user's subscription tier
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { subscriptionTier: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Validate request
  validateUploadRequest(request, user.subscriptionTier);

  // Check storage quota
  const hasQuota = await checkStorageQuota(request.userId, request.size);
  if (!hasQuota) {
    throw new Error('Storage quota exceeded. Please upgrade your plan or delete some files.');
  }

  // Generate S3 key
  const s3Key = s3Utils.generateS3Key(request.userId, request.filename, {
    projectId: request.projectId,
    sessionId: request.sessionId,
    prefix: request.category?.toLowerCase(),
  });

  // Create multipart upload in S3
  const { uploadId } = await s3Utils.createMultipartUpload(s3Key, request.mimeType);

  // Determine file category
  const category = request.category || s3Utils.getFileCategory(request.mimeType);

  // Create file record in database
  const file = await prisma.file.create({
    data: {
      id: uuidv4(),
      userId: request.userId,
      projectId: request.projectId,
      sessionId: request.sessionId,
      filename: request.filename,
      originalName: request.filename,
      mimeType: request.mimeType,
      size: BigInt(request.size),
      category: category as any,
      s3Key,
      s3Bucket: process.env.S3_BUCKET_NAME || 'remotedevai-uploads',
      s3Region: process.env.AWS_REGION || 'us-east-1',
      status: 'UPLOADING',
      isPublic: request.isPublic || false,
      uploadId,
      uploadProgress: 0,
    },
  });

  const partSize = 5 * 1024 * 1024; // 5MB
  const partCount = s3Utils.calculatePartCount(request.size);

  return {
    fileId: file.id,
    uploadId,
    s3Key,
    partSize,
    partCount,
  };
}

/**
 * Generate presigned URL for uploading a part
 */
export async function generatePartUploadUrl(request: UploadPartRequest): Promise<string> {
  const file = await prisma.file.findUnique({
    where: { id: request.fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (!file.uploadId) {
    throw new Error('No multipart upload in progress');
  }

  if (file.status !== 'UPLOADING') {
    throw new Error('File is not in uploading state');
  }

  const expiresIn = 3600; // 1 hour
  return await s3Utils.generatePresignedPartUrl(file.s3Key, file.uploadId, request.partNumber, expiresIn);
}

/**
 * Complete multipart upload
 */
export async function completeMultipartUpload(request: CompleteMultipartRequest): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: request.fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (!file.uploadId) {
    throw new Error('No multipart upload in progress');
  }

  // Complete multipart upload in S3
  await s3Utils.completeMultipartUpload(file.s3Key, file.uploadId, request.parts);

  // Update file record
  const url = file.isPublic ? s3Utils.getPublicUrl(file.s3Key) : undefined;

  await prisma.file.update({
    where: { id: file.id },
    data: {
      status: 'PROCESSING',
      uploadProgress: 100,
      uploadedAt: new Date(),
      url,
    },
  });

  // Update storage quota
  await updateStorageQuota(file.userId, Number(file.size), true);

  // TODO: Trigger post-processing (thumbnail generation, virus scanning, etc.)
  // This would typically be done via a job queue
  console.log(`File ${file.id} uploaded successfully. Triggering post-processing...`);
}

/**
 * Abort multipart upload
 */
export async function abortMultipartUpload(fileId: string): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.uploadId) {
    // Abort multipart upload in S3
    await s3Utils.abortMultipartUpload(file.s3Key, file.uploadId);
  }

  // Delete file record
  await prisma.file.delete({
    where: { id: fileId },
  });
}

/**
 * Mark file upload as complete (for simple uploads)
 */
export async function markUploadComplete(fileId: string): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  // Verify file exists in S3
  const exists = await s3Utils.fileExists(file.s3Key);
  if (!exists) {
    throw new Error('File not found in storage');
  }

  // Update file record
  const url = file.isPublic ? s3Utils.getPublicUrl(file.s3Key) : undefined;

  await prisma.file.update({
    where: { id: file.id },
    data: {
      status: 'PROCESSING',
      uploadProgress: 100,
      uploadedAt: new Date(),
      url,
    },
  });

  // Update storage quota
  await updateStorageQuota(file.userId, Number(file.size), true);

  // TODO: Trigger post-processing
  console.log(`File ${file.id} marked as complete. Triggering post-processing...`);
}

/**
 * Get upload status
 */
export async function getUploadStatus(fileId: string) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      status: true,
      uploadProgress: true,
      url: true,
      thumbnailUrl: true,
      uploadedAt: true,
      processedAt: true,
    },
  });

  if (!file) {
    throw new Error('File not found');
  }

  return {
    ...file,
    size: Number(file.size),
  };
}

/**
 * Delete file
 */
export async function deleteFile(fileId: string, userId: string): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Delete from S3
  await s3Utils.deleteFile(file.s3Key);

  // Delete thumbnail if exists
  if (file.thumbnailUrl) {
    const thumbnailKey = file.s3Key.replace(/\.[^.]+$/, '_thumb.jpg');
    await s3Utils.deleteFile(thumbnailKey).catch(() => {
      // Ignore error if thumbnail doesn't exist
    });
  }

  // Update storage quota
  await updateStorageQuota(file.userId, Number(file.size), false);

  // Delete file record
  await prisma.file.delete({
    where: { id: fileId },
  });
}

/**
 * Generate download URL for file
 */
export async function generateDownloadUrl(fileId: string, userId: string): Promise<string> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  // Check if user has access
  if (file.userId !== userId && !file.isPublic) {
    throw new Error('Unauthorized');
  }

  // Update access tracking
  await prisma.file.update({
    where: { id: fileId },
    data: {
      downloadCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  // If public and has URL, return it
  if (file.isPublic && file.url) {
    return file.url;
  }

  // Generate presigned download URL
  const expiresIn = 3600; // 1 hour
  return await s3Utils.generatePresignedDownloadUrl(file.s3Key, expiresIn, file.originalName);
}

/**
 * List user files
 */
export async function listFiles(userId: string, options: {
  projectId?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = { userId };

  if (options.projectId) {
    where.projectId = options.projectId;
  }

  if (options.category) {
    where.category = options.category;
  }

  if (options.status) {
    where.status = options.status;
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        category: true,
        status: true,
        url: true,
        thumbnailUrl: true,
        uploadedAt: true,
        downloadCount: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.file.count({ where }),
  ]);

  return {
    files: files.map((f) => ({ ...f, size: Number(f.size) })),
    total,
    limit: options.limit || 50,
    offset: options.offset || 0,
  };
}

/**
 * Update file processing status
 */
export async function updateFileStatus(
  fileId: string,
  status: string,
  metadata?: Record<string, any>
): Promise<void> {
  const updateData: any = { status };

  if (status === 'READY') {
    updateData.processedAt = new Date();
  }

  if (metadata) {
    updateData.metadata = metadata;
  }

  await prisma.file.update({
    where: { id: fileId },
    data: updateData,
  });
}

/**
 * Set file thumbnail
 */
export async function setFileThumbnail(fileId: string, thumbnailUrl: string): Promise<void> {
  await prisma.file.update({
    where: { id: fileId },
    data: { thumbnailUrl },
  });
}
