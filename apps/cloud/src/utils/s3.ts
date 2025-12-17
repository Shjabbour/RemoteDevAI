/**
 * S3 Utility Service
 *
 * Handles all S3/R2 operations including:
 * - Presigned URL generation for uploads and downloads
 * - Multipart upload management
 * - File deletion
 * - Bucket operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// S3 Configuration
const S3_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT, // For R2 or MinIO
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Required for MinIO/R2
};

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'remotedevai-uploads';
const CDN_URL = process.env.CDN_URL; // Optional CDN URL
const DEFAULT_EXPIRATION = 3600; // 1 hour
const MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum for S3

// Initialize S3 client
export const s3Client = new S3Client(S3_CONFIG);

/**
 * File type configuration
 */
export const FILE_CONFIG = {
  // Allowed MIME types by category
  allowedMimeTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
    code: [
      'text/plain',
      'text/javascript',
      'text/typescript',
      'text/html',
      'text/css',
      'application/json',
      'application/xml',
    ],
    archive: ['application/zip', 'application/x-tar', 'application/gzip', 'application/x-7z-compressed'],
  },

  // Size limits per tier (in bytes)
  sizeLimits: {
    FREE: {
      perFile: 10 * 1024 * 1024, // 10MB
      total: 500 * 1024 * 1024, // 500MB
    },
    PRO: {
      perFile: 100 * 1024 * 1024, // 100MB
      total: 50 * 1024 * 1024 * 1024, // 50GB
    },
    ENTERPRISE: {
      perFile: 500 * 1024 * 1024, // 500MB
      total: 500 * 1024 * 1024 * 1024, // 500GB
    },
  },
};

/**
 * Generate S3 key for a file
 */
export function generateS3Key(
  userId: string,
  filename: string,
  options: {
    projectId?: string;
    sessionId?: string;
    prefix?: string;
  } = {}
): string {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const extension = filename.split('.').pop();
  const baseName = filename.replace(`.${extension}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');

  let path = `users/${userId}`;

  if (options.projectId) {
    path += `/projects/${options.projectId}`;
  }

  if (options.sessionId) {
    path += `/sessions/${options.sessionId}`;
  }

  if (options.prefix) {
    path += `/${options.prefix}`;
  }

  return `${path}/${timestamp}-${uuid}-${baseName}.${extension}`;
}

/**
 * Generate presigned URL for file upload
 */
export async function generatePresignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn: number = DEFAULT_EXPIRATION
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate presigned URL for file download
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = DEFAULT_EXPIRATION,
  filename?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: filename ? `attachment; filename="${filename}"` : undefined,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get public URL for a file (if using CDN)
 */
export function getPublicUrl(key: string): string {
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }

  // If no CDN, construct S3 URL
  if (S3_CONFIG.endpoint) {
    return `${S3_CONFIG.endpoint}/${BUCKET_NAME}/${key}`;
  }

  return `https://${BUCKET_NAME}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`;
}

/**
 * Initialize multipart upload
 */
export async function createMultipartUpload(
  key: string,
  mimeType: string
): Promise<{ uploadId: string; key: string }> {
  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const response = await s3Client.send(command);

  if (!response.UploadId) {
    throw new Error('Failed to create multipart upload');
  }

  return {
    uploadId: response.UploadId,
    key,
  };
}

/**
 * Generate presigned URL for multipart upload part
 */
export async function generatePresignedPartUrl(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number = DEFAULT_EXPIRATION
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Complete multipart upload
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  });

  await s3Client.send(command);
}

/**
 * Abort multipart upload
 */
export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
}> {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    size: response.ContentLength || 0,
    contentType: response.ContentType || 'application/octet-stream',
    lastModified: response.LastModified || new Date(),
    etag: response.ETag || '',
  };
}

/**
 * Copy file within S3
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${sourceKey}`,
    Key: destinationKey,
  });

  await s3Client.send(command);
}

/**
 * List files with prefix
 */
export async function listFiles(
  prefix: string,
  maxKeys: number = 1000
): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return (
    response.Contents?.map((item) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    })) || []
  );
}

/**
 * Calculate number of parts needed for multipart upload
 */
export function calculatePartCount(fileSize: number): number {
  return Math.ceil(fileSize / MULTIPART_CHUNK_SIZE);
}

/**
 * Validate file type
 */
export function isValidMimeType(mimeType: string, category?: string): boolean {
  if (category && FILE_CONFIG.allowedMimeTypes[category as keyof typeof FILE_CONFIG.allowedMimeTypes]) {
    return FILE_CONFIG.allowedMimeTypes[category as keyof typeof FILE_CONFIG.allowedMimeTypes].includes(mimeType);
  }

  // Check all categories
  return Object.values(FILE_CONFIG.allowedMimeTypes).some((types) => types.includes(mimeType));
}

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(FILE_CONFIG.allowedMimeTypes)) {
    if (types.includes(mimeType)) {
      return category.toUpperCase();
    }
  }
  return 'GENERAL';
}

/**
 * Check if file size is within limits for tier
 */
export function isFileSizeValid(fileSize: number, tier: 'FREE' | 'PRO' | 'ENTERPRISE'): boolean {
  const limit = FILE_CONFIG.sizeLimits[tier].perFile;
  return fileSize <= limit;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Health check for S3 connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 health check failed:', error);
    return false;
  }
}
