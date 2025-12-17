/**
 * Image Processor Job
 *
 * Processes uploaded images:
 * - Generate thumbnails
 * - Optimize image size
 * - Extract metadata (dimensions, EXIF, etc.)
 * - Convert formats if needed
 */

import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 },
};

/**
 * Convert S3 stream to buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Download image from S3
 */
async function downloadImage(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Failed to download image from S3');
  }

  return await streamToBuffer(response.Body as Readable);
}

/**
 * Upload image to S3
 */
async function uploadImage(s3Key: string, buffer: Buffer, mimeType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
}

/**
 * Generate thumbnail for image
 */
async function generateThumbnail(
  imageBuffer: Buffer,
  size: { width: number; height: number }
): Promise<Buffer> {
  return await sharp(imageBuffer)
    .resize(size.width, size.height, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Optimize image
 */
async function optimizeImage(imageBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const sharpInstance = sharp(imageBuffer);

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return await sharpInstance.jpeg({ quality: 85, progressive: true }).toBuffer();
  }

  if (mimeType === 'image/png') {
    return await sharpInstance.png({ compressionLevel: 9, progressive: true }).toBuffer();
  }

  if (mimeType === 'image/webp') {
    return await sharpInstance.webp({ quality: 85 }).toBuffer();
  }

  // Return original buffer if format not supported
  return imageBuffer;
}

/**
 * Extract image metadata
 */
async function extractMetadata(imageBuffer: Buffer) {
  const metadata = await sharp(imageBuffer).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: metadata.size,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    density: metadata.density,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
    exif: metadata.exif,
  };
}

/**
 * Process image file
 */
export async function processImage(fileId: string): Promise<void> {
  console.log(`Processing image: ${fileId}`);

  try {
    // Get file record
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.category !== 'IMAGE') {
      throw new Error('File is not an image');
    }

    // Download image from S3
    const imageBuffer = await downloadImage(file.s3Key);

    // Extract metadata
    const metadata = await extractMetadata(imageBuffer);
    console.log(`Image metadata extracted: ${metadata.width}x${metadata.height}`);

    // Optimize image
    const optimizedBuffer = await optimizeImage(imageBuffer, file.mimeType);
    console.log(`Image optimized: ${imageBuffer.length} -> ${optimizedBuffer.length} bytes`);

    // Upload optimized image (replace original)
    await uploadImage(file.s3Key, optimizedBuffer, file.mimeType);

    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(imageBuffer, THUMBNAIL_SIZES.medium);
    const thumbnailKey = file.s3Key.replace(/\.[^.]+$/, '_thumb.jpg');
    await uploadImage(thumbnailKey, thumbnailBuffer, 'image/jpeg');
    console.log(`Thumbnail generated: ${thumbnailKey}`);

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
        size: BigInt(optimizedBuffer.length),
        metadata: {
          ...metadata,
          optimized: true,
          originalSize: imageBuffer.length,
          compressedSize: optimizedBuffer.length,
        },
      },
    });

    console.log(`Image processing completed: ${fileId}`);
  } catch (error) {
    console.error(`Image processing failed for ${fileId}:`, error);

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
  }
}

/**
 * Batch process images
 */
export async function batchProcessImages(fileIds: string[]): Promise<void> {
  console.log(`Batch processing ${fileIds.length} images`);

  for (const fileId of fileIds) {
    try {
      await processImage(fileId);
    } catch (error) {
      console.error(`Failed to process image ${fileId}:`, error);
      // Continue with next image
    }
  }
}

/**
 * Process pending images
 */
export async function processPendingImages(): Promise<void> {
  const pendingFiles = await prisma.file.findMany({
    where: {
      category: 'IMAGE',
      status: 'PROCESSING',
    },
    select: { id: true },
    take: 10, // Process 10 at a time
  });

  if (pendingFiles.length > 0) {
    await batchProcessImages(pendingFiles.map((f) => f.id));
  }
}
