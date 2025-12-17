/**
 * Video Processor Job
 *
 * Processes uploaded videos:
 * - Extract metadata (duration, resolution, codec)
 * - Generate video thumbnail
 * - Transcode to web-friendly formats (optional)
 * - Generate preview clips (optional)
 *
 * Note: Video transcoding requires FFmpeg. This is a simplified version.
 * For production, consider using a dedicated service like AWS MediaConvert or Cloudflare Stream.
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'remotedevai-uploads';
const TEMP_DIR = process.env.TEMP_DIR || '/tmp';

/**
 * Check if FFmpeg is available
 */
async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    console.warn('FFmpeg not found. Video processing will be limited.');
    return false;
  }
}

/**
 * Extract video metadata using FFprobe
 */
async function extractVideoMetadata(videoPath: string): Promise<any> {
  const hasFFmpeg = await checkFFmpeg();

  if (!hasFFmpeg) {
    return {
      format: 'unknown',
      duration: 0,
      width: 0,
      height: 0,
      codec: 'unknown',
      bitrate: 0,
    };
  }

  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
    );

    const data = JSON.parse(stdout);
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');

    return {
      format: data.format?.format_name,
      duration: parseFloat(data.format?.duration || '0'),
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      codec: videoStream?.codec_name || 'unknown',
      bitrate: parseInt(data.format?.bit_rate || '0'),
      size: parseInt(data.format?.size || '0'),
    };
  } catch (error) {
    console.error('Failed to extract video metadata:', error);
    throw error;
  }
}

/**
 * Generate thumbnail from video
 */
async function generateVideoThumbnail(videoPath: string, outputPath: string): Promise<void> {
  const hasFFmpeg = await checkFFmpeg();

  if (!hasFFmpeg) {
    throw new Error('FFmpeg is required for thumbnail generation');
  }

  // Extract frame at 1 second (or 10% of duration)
  await execAsync(
    `ffmpeg -i "${videoPath}" -ss 00:00:01.000 -vframes 1 -vf "scale=600:-1" "${outputPath}"`
  );
}

/**
 * Download file from S3
 */
async function downloadFile(s3Key: string, localPath: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Failed to download file from S3');
  }

  const stream = response.Body as Readable;
  const writeStream = require('fs').createWriteStream(localPath);

  return new Promise((resolve, reject) => {
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

/**
 * Upload file to S3
 */
async function uploadFile(s3Key: string, localPath: string, mimeType: string): Promise<void> {
  const fileBuffer = await fs.readFile(localPath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
}

/**
 * Process video file
 */
export async function processVideo(fileId: string): Promise<void> {
  console.log(`Processing video: ${fileId}`);

  let tempVideoPath: string | null = null;
  let tempThumbnailPath: string | null = null;

  try {
    // Get file record
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.category !== 'VIDEO') {
      throw new Error('File is not a video');
    }

    // Download video to temp directory
    tempVideoPath = path.join(TEMP_DIR, `${fileId}${path.extname(file.filename)}`);
    await downloadFile(file.s3Key, tempVideoPath);
    console.log(`Video downloaded to: ${tempVideoPath}`);

    // Extract metadata
    const metadata = await extractVideoMetadata(tempVideoPath);
    console.log(`Video metadata extracted: ${metadata.width}x${metadata.height}, ${metadata.duration}s`);

    // Generate thumbnail
    tempThumbnailPath = path.join(TEMP_DIR, `${fileId}_thumb.jpg`);
    await generateVideoThumbnail(tempVideoPath, tempThumbnailPath);
    console.log(`Thumbnail generated: ${tempThumbnailPath}`);

    // Upload thumbnail to S3
    const thumbnailKey = file.s3Key.replace(/\.[^.]+$/, '_thumb.jpg');
    await uploadFile(thumbnailKey, tempThumbnailPath, 'image/jpeg');

    // Generate public URL for thumbnail
    const thumbnailUrl = process.env.CDN_URL
      ? `${process.env.CDN_URL}/${thumbnailKey}`
      : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;

    // Update file record
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'READY',
        processedAt: new Date(),
        thumbnailUrl,
        metadata: {
          ...metadata,
          processed: true,
        },
      },
    });

    console.log(`Video processing completed: ${fileId}`);
  } catch (error) {
    console.error(`Video processing failed for ${fileId}:`, error);

    // Mark file as failed
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    throw error;
  } finally {
    // Cleanup temp files
    if (tempVideoPath) {
      await fs.unlink(tempVideoPath).catch(() => {});
    }
    if (tempThumbnailPath) {
      await fs.unlink(tempThumbnailPath).catch(() => {});
    }
  }
}

/**
 * Process pending videos
 */
export async function processPendingVideos(): Promise<void> {
  const pendingFiles = await prisma.file.findMany({
    where: {
      category: 'VIDEO',
      status: 'PROCESSING',
    },
    select: { id: true },
    take: 5, // Process 5 at a time (videos are resource-intensive)
  });

  for (const file of pendingFiles) {
    try {
      await processVideo(file.id);
    } catch (error) {
      console.error(`Failed to process video ${file.id}:`, error);
      // Continue with next video
    }
  }
}
