import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

let s3Client: S3Client | null = null;

if (config.s3.endpoint && config.s3.accessKeyId && config.s3.secretAccessKey) {
  s3Client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });
}

export interface UploadFileData {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  folder?: string;
}

export interface GeneratePresignedUrlData {
  key: string;
  expiresIn?: number;
}

export class StorageService {
  /**
   * Ensure S3 is initialized
   */
  private static ensureS3(): S3Client {
    if (!s3Client) {
      throw new Error('S3 is not configured. Please set S3 environment variables.');
    }
    return s3Client;
  }

  /**
   * Upload a file to S3/R2
   */
  static async uploadFile(data: UploadFileData): Promise<string> {
    const client = this.ensureS3();

    if (!config.s3.bucketName) {
      throw new Error('S3 bucket name is not configured');
    }

    const { buffer, mimeType, fileName, folder = 'recordings' } = data;

    // Generate unique key
    const fileExtension = this.getExtensionFromMimeType(mimeType);
    const key = `${folder}/${uuidv4()}${fileName ? `-${fileName}` : ''}${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await client.send(command);

    // Return public URL
    return this.getPublicUrl(key);
  }

  /**
   * Delete a file from S3/R2
   */
  static async deleteFile(key: string): Promise<void> {
    const client = this.ensureS3();

    if (!config.s3.bucketName) {
      throw new Error('S3 bucket name is not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    await client.send(command);
  }

  /**
   * Generate a presigned URL for uploading
   */
  static async generateUploadUrl(data: {
    mimeType: string;
    fileName?: string;
    folder?: string;
    expiresIn?: number;
  }): Promise<{ url: string; key: string }> {
    const client = this.ensureS3();

    if (!config.s3.bucketName) {
      throw new Error('S3 bucket name is not configured');
    }

    const { mimeType, fileName, folder = 'recordings', expiresIn = 3600 } = data;

    // Generate unique key
    const fileExtension = this.getExtensionFromMimeType(mimeType);
    const key = `${folder}/${uuidv4()}${fileName ? `-${fileName}` : ''}${fileExtension}`;

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    return { url, key };
  }

  /**
   * Generate a presigned URL for downloading
   */
  static async generateDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = this.ensureS3();

    if (!config.s3.bucketName) {
      throw new Error('S3 bucket name is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    return url;
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(key: string): string {
    if (config.s3.publicUrl) {
      return `${config.s3.publicUrl}/${key}`;
    }

    if (config.s3.bucketName) {
      return `${config.s3.endpoint}/${config.s3.bucketName}/${key}`;
    }

    throw new Error('Cannot generate public URL: S3 configuration is incomplete');
  }

  /**
   * Extract key from URL
   */
  static extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove bucket name from path if present
      if (config.s3.bucketName && pathname.startsWith(`/${config.s3.bucketName}/`)) {
        return pathname.replace(`/${config.s3.bucketName}/`, '');
      }

      // Remove leading slash
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch (error) {
      throw new Error('Invalid URL');
    }
  }

  /**
   * Get file extension from MIME type
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'video/webm': '.webm',
      'video/mp4': '.mp4',
      'video/ogg': '.ogv',
      'audio/webm': '.weba',
      'audio/mp3': '.mp3',
      'audio/ogg': '.oga',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'application/json': '.json',
      'text/plain': '.txt',
    };

    return mimeMap[mimeType] || '';
  }

  /**
   * Check if storage is configured
   */
  static isConfigured(): boolean {
    return s3Client !== null;
  }
}

export default StorageService;
