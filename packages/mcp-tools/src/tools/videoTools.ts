/**
 * Video processing and manipulation tools
 */

import {
  compressVideo as ffmpegCompress,
  createThumbnail as ffmpegThumbnail,
  trimVideo as ffmpegTrim,
  addTimestampOverlay,
  getVideoMetadata,
  convertVideo,
  mergeVideos as ffmpegMerge,
  extractAudio,
} from '../utils/ffmpeg.js';

import {
  ToolResponse,
  VideoData,
  ImageData,
  CompressVideoParams,
  CreateThumbnailParams,
  TrimVideoParams,
  AddTimestampParams,
} from '../types.js';

import path from 'path';
import fs from 'fs/promises';

/**
 * Compress video file
 *
 * @example
 * const result = await compressVideo({
 *   inputPath: './video.mp4',
 *   quality: 'medium',
 *   resolution: '1280x720'
 * });
 */
export async function compressVideo(
  params: CompressVideoParams
): Promise<ToolResponse<VideoData>> {
  try {
    const { inputPath, outputPath, quality = 'medium', resolution, targetSize } = params;

    // Generate output path if not provided
    const finalOutputPath =
      outputPath ||
      path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}_compressed${path.extname(inputPath)}`
      );

    // Compress video
    await ffmpegCompress(inputPath, finalOutputPath, {
      quality,
      resolution,
      targetSize,
    });

    // Get metadata
    const metadata = await getVideoMetadata(finalOutputPath);

    return {
      success: true,
      data: {
        path: finalOutputPath,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Video compressed (${quality} quality)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compress video',
      message: 'Compression failed',
    };
  }
}

/**
 * Create thumbnail from video
 *
 * @example
 * const result = await createThumbnail({
 *   videoPath: './video.mp4',
 *   timestamp: 5,
 *   format: 'jpeg',
 *   width: 640,
 *   height: 360
 * });
 */
export async function createThumbnail(
  params: CreateThumbnailParams
): Promise<ToolResponse<ImageData>> {
  try {
    const { videoPath, timestamp = 0, format = 'jpeg', width, height } = params;

    // Generate output path
    const outputPath = path.join(
      path.dirname(videoPath),
      `${path.basename(videoPath, path.extname(videoPath))}_thumb_${timestamp}.${format}`
    );

    // Create thumbnail
    await ffmpegThumbnail(videoPath, outputPath, {
      timestamp,
      format,
      width,
      height,
    });

    // Read thumbnail
    const buffer = await fs.readFile(outputPath);
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(buffer).metadata();

    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
    };

    return {
      success: true,
      data: {
        base64: buffer.toString('base64'),
        mimeType: mimeTypes[format],
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
      },
      message: `Thumbnail created at ${timestamp}s`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create thumbnail',
      message: 'Thumbnail creation failed',
    };
  }
}

/**
 * Trim video to specific time range
 *
 * @example
 * const result = await trimVideo({
 *   inputPath: './video.mp4',
 *   start: 10,
 *   end: 30
 * });
 */
export async function trimVideo(
  params: TrimVideoParams
): Promise<ToolResponse<VideoData>> {
  try {
    const { inputPath, outputPath, start, end } = params;

    // Validate time range
    if (start >= end) {
      throw new Error('Start time must be less than end time');
    }

    // Generate output path if not provided
    const finalOutputPath =
      outputPath ||
      path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}_trimmed_${start}-${end}${path.extname(inputPath)}`
      );

    // Trim video
    await ffmpegTrim(inputPath, finalOutputPath, start, end);

    // Get metadata
    const metadata = await getVideoMetadata(finalOutputPath);

    return {
      success: true,
      data: {
        path: finalOutputPath,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Video trimmed (${start}s - ${end}s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trim video',
      message: 'Trim failed',
    };
  }
}

/**
 * Add timestamp overlay to video
 *
 * @example
 * const result = await addTimestamp({
 *   inputPath: './video.mp4',
 *   position: 'top-right',
 *   format: 'HH:mm:ss'
 * });
 */
export async function addTimestamp(
  params: AddTimestampParams
): Promise<ToolResponse<VideoData>> {
  try {
    const { inputPath, outputPath, format = 'HH:mm:ss', position = 'top-right' } = params;

    // Generate output path if not provided
    const finalOutputPath =
      outputPath ||
      path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}_timestamped${path.extname(inputPath)}`
      );

    // Add timestamp overlay
    await addTimestampOverlay(inputPath, finalOutputPath, position, format);

    // Get metadata
    const metadata = await getVideoMetadata(finalOutputPath);

    return {
      success: true,
      data: {
        path: finalOutputPath,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Timestamp added (${position})`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add timestamp',
      message: 'Timestamp addition failed',
    };
  }
}

/**
 * Convert video format
 *
 * @example
 * const result = await convertVideoFormat({
 *   inputPath: './video.webm',
 *   outputFormat: 'mp4'
 * });
 */
export async function convertVideoFormat(params: {
  inputPath: string;
  outputFormat: string;
  outputPath?: string;
}): Promise<ToolResponse<VideoData>> {
  try {
    const { inputPath, outputFormat, outputPath } = params;

    // Generate output path if not provided
    const finalOutputPath =
      outputPath ||
      path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}.${outputFormat}`
      );

    // Convert video
    await convertVideo(inputPath, finalOutputPath, outputFormat);

    // Get metadata
    const metadata = await getVideoMetadata(finalOutputPath);

    return {
      success: true,
      data: {
        path: finalOutputPath,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Video converted to ${outputFormat}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert video',
      message: 'Conversion failed',
    };
  }
}

/**
 * Merge multiple videos
 *
 * @example
 * const result = await mergeVideos({
 *   inputPaths: ['video1.mp4', 'video2.mp4'],
 *   outputPath: 'merged.mp4'
 * });
 */
export async function mergeVideos(params: {
  inputPaths: string[];
  outputPath: string;
}): Promise<ToolResponse<VideoData>> {
  try {
    const { inputPaths, outputPath } = params;

    if (inputPaths.length < 2) {
      throw new Error('At least 2 videos are required to merge');
    }

    // Merge videos
    await ffmpegMerge(inputPaths, outputPath);

    // Get metadata
    const metadata = await getVideoMetadata(outputPath);

    return {
      success: true,
      data: {
        path: outputPath,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Merged ${inputPaths.length} videos`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to merge videos',
      message: 'Merge failed',
    };
  }
}

/**
 * Extract audio from video
 *
 * @example
 * const result = await extractVideoAudio({
 *   videoPath: './video.mp4',
 *   format: 'mp3'
 * });
 */
export async function extractVideoAudio(params: {
  videoPath: string;
  outputPath?: string;
  format?: string;
}): Promise<ToolResponse<{ path: string; size: number; format: string }>> {
  try {
    const { videoPath, outputPath, format = 'mp3' } = params;

    // Generate output path if not provided
    const finalOutputPath =
      outputPath ||
      path.join(
        path.dirname(videoPath),
        `${path.basename(videoPath, path.extname(videoPath))}.${format}`
      );

    // Extract audio
    await extractAudio(videoPath, finalOutputPath, format);

    // Get file size
    const stats = await fs.stat(finalOutputPath);

    return {
      success: true,
      data: {
        path: finalOutputPath,
        size: stats.size,
        format,
      },
      message: `Audio extracted (${format})`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract audio',
      message: 'Audio extraction failed',
    };
  }
}

/**
 * Get video information
 *
 * @example
 * const info = await getVideoInfo({ path: './video.mp4' });
 */
export async function getVideoInfo(params: {
  path: string;
}): Promise<ToolResponse<VideoData>> {
  try {
    const metadata = await getVideoMetadata(params.path);

    return {
      success: true,
      data: {
        path: params.path,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: 'Video information retrieved',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video info',
      message: 'Info retrieval failed',
    };
  }
}
