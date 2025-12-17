/**
 * Thumbnail Generator Job
 *
 * Generates thumbnails for various file types:
 * - Images: Resized versions
 * - Videos: Frame extraction
 * - Documents: First page preview
 * - Code files: Syntax-highlighted preview
 */

import { PrismaClient } from '@prisma/client';
import { processImage } from './imageProcessor';
import { processVideo } from './videoProcessor';

const prisma = new PrismaClient();

/**
 * Generate placeholder thumbnail for unsupported file types
 */
async function generatePlaceholderThumbnail(fileId: string, category: string): Promise<void> {
  console.log(`Generating placeholder thumbnail for ${category}: ${fileId}`);

  // For now, just mark as ready without thumbnail
  // In production, you might want to generate icon-based placeholders

  await prisma.file.update({
    where: { id: fileId },
    data: {
      status: 'READY',
      processedAt: new Date(),
      metadata: {
        thumbnailType: 'placeholder',
        category,
      },
    },
  });
}

/**
 * Generate thumbnail based on file category
 */
export async function generateThumbnail(fileId: string): Promise<void> {
  console.log(`Generating thumbnail for: ${fileId}`);

  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    switch (file.category) {
      case 'IMAGE':
        await processImage(fileId);
        break;

      case 'VIDEO':
        await processVideo(fileId);
        break;

      case 'DOCUMENT':
      case 'CODE':
      case 'ARCHIVE':
      case 'GENERAL':
      default:
        await generatePlaceholderThumbnail(fileId, file.category);
        break;
    }

    console.log(`Thumbnail generation completed: ${fileId}`);
  } catch (error) {
    console.error(`Thumbnail generation failed for ${fileId}:`, error);
    throw error;
  }
}

/**
 * Process pending thumbnails
 */
export async function processPendingThumbnails(): Promise<void> {
  const pendingFiles = await prisma.file.findMany({
    where: {
      status: 'PROCESSING',
    },
    select: { id: true, category: true },
    take: 20,
  });

  console.log(`Processing ${pendingFiles.length} pending thumbnails`);

  for (const file of pendingFiles) {
    try {
      await generateThumbnail(file.id);
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${file.id}:`, error);
      // Continue with next file
    }
  }
}

/**
 * Regenerate thumbnail for a file
 */
export async function regenerateThumbnail(fileId: string): Promise<void> {
  console.log(`Regenerating thumbnail for: ${fileId}`);

  // Set status back to PROCESSING
  await prisma.file.update({
    where: { id: fileId },
    data: {
      status: 'PROCESSING',
    },
  });

  // Generate thumbnail
  await generateThumbnail(fileId);
}
