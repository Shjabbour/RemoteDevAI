/**
 * VideoProcessingAgent - Processes recorded videos
 *
 * Features:
 * - Compresses videos using ffmpeg
 * - Creates thumbnails
 * - Uploads to cloud storage (S3, GCS, etc.)
 * - Generates streaming URLs
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  VideoProcessingOptions,
  SessionRecording,
} from '../types';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface ProcessedVideo {
  originalPath: string;
  compressedPath?: string;
  thumbnailPath?: string;
  cloudUrl?: string;
  streamingUrl?: string;
  fileSize: number;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
}

/**
 * Video Processing Agent
 */
export class VideoProcessingAgent extends BaseAgent {
  private outputDir: string = '';
  private thumbnailsDir: string = '';

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Video Processing Agent',
      type: AgentType.VIDEO_PROCESSING,
      enabled: true,
      retryAttempts: 2,
      timeout: 300000, // 5 minutes for video processing
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize output directories
   */
  protected async onInitialize(): Promise<void> {
    const baseDir = process.env.RECORDINGS_DIR || './recordings';
    this.outputDir = path.join(baseDir, 'processed');
    this.thumbnailsDir = path.join(baseDir, 'thumbnails');

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.thumbnailsDir, { recursive: true });

    this.logger.info('Video Processing Agent initialized', {
      outputDir: this.outputDir,
      thumbnailsDir: this.thumbnailsDir,
    });
  }

  /**
   * Process video processing request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<ProcessedVideo>> {
    if (message.type !== MessageType.VIDEO_PROCESSED) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected VIDEO_PROCESSED, got ${message.type}`
      );
    }

    const payload = message.payload as {
      recordingId: string;
      filePath: string;
      options?: VideoProcessingOptions;
    };

    try {
      this.logger.info('Starting video processing', {
        recordingId: payload.recordingId,
        filePath: payload.filePath,
      });

      // Get default options from user preferences
      const options: VideoProcessingOptions = {
        compress: payload.options?.compress ?? context.userPreferences.recording.quality !== 'high',
        compressionQuality: payload.options?.compressionQuality ?? this.getCompressionQuality(context.userPreferences.recording.quality),
        generateThumbnail: payload.options?.generateThumbnail ?? true,
        thumbnailTimestamp: payload.options?.thumbnailTimestamp ?? 1,
        uploadToCloud: payload.options?.uploadToCloud ?? false,
        generateStreamingUrl: payload.options?.generateStreamingUrl ?? false,
      };

      const processed = await this.processVideo(payload.filePath, options, context);

      this.logger.info('Video processing completed', {
        recordingId: payload.recordingId,
        compressed: !!processed.compressedPath,
        thumbnail: !!processed.thumbnailPath,
        uploaded: !!processed.cloudUrl,
      });

      return this.createSuccessResponse(processed);
    } catch (error) {
      this.logger.error('Video processing failed', { error });
      return this.createErrorResponse(
        'PROCESSING_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Process video with ffmpeg
   */
  private async processVideo(
    videoPath: string,
    options: VideoProcessingOptions,
    context: AgentContext
  ): Promise<ProcessedVideo> {
    // Get video metadata
    const metadata = await this.getVideoMetadata(videoPath);

    const result: ProcessedVideo = {
      originalPath: videoPath,
      fileSize: metadata.size,
      duration: metadata.duration,
      resolution: metadata.resolution,
    };

    // Compress video if requested
    if (options.compress) {
      result.compressedPath = await this.compressVideo(
        videoPath,
        options.compressionQuality || 28
      );
    }

    // Generate thumbnail if requested
    if (options.generateThumbnail) {
      result.thumbnailPath = await this.generateThumbnail(
        videoPath,
        options.thumbnailTimestamp || 1
      );
    }

    // Upload to cloud if requested
    if (options.uploadToCloud) {
      const uploadPath = result.compressedPath || videoPath;
      result.cloudUrl = await this.uploadToCloud(uploadPath, context);

      if (options.generateStreamingUrl) {
        result.streamingUrl = await this.generateStreamingUrl(
          result.cloudUrl,
          context
        );
      }
    }

    return result;
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(
    videoPath: string
  ): Promise<{
    size: number;
    duration: number;
    resolution: { width: number; height: number };
  }> {
    return new Promise(async (resolve, reject) => {
      const stats = await fs.stat(videoPath);

      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

        resolve({
          size: stats.size,
          duration: metadata.format.duration || 0,
          resolution: {
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
          },
        });
      });
    });
  }

  /**
   * Compress video using ffmpeg
   */
  private async compressVideo(
    videoPath: string,
    quality: number
  ): Promise<string> {
    const basename = path.basename(videoPath, path.extname(videoPath));
    const outputPath = path.join(this.outputDir, `${basename}-compressed.mp4`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-c:v libx264', // H.264 codec
          `-crf ${quality}`, // Constant Rate Factor (18-28 is good range)
          '-preset medium', // Encoding speed preset
          '-c:a aac', // AAC audio codec
          '-b:a 128k', // Audio bitrate
          '-movflags +faststart', // Enable streaming
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          this.logger.debug('Starting video compression', { command: cmd });
        })
        .on('progress', (progress) => {
          this.logger.debug('Compression progress', {
            percent: progress.percent?.toFixed(2),
          });
        })
        .on('end', () => {
          this.logger.info('Video compression completed', { outputPath });
          resolve(outputPath);
        })
        .on('error', (err) => {
          this.logger.error('Video compression failed', { error: err });
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate thumbnail from video
   */
  private async generateThumbnail(
    videoPath: string,
    timestamp: number
  ): Promise<string> {
    const basename = path.basename(videoPath, path.extname(videoPath));
    const thumbnailPath = path.join(this.thumbnailsDir, `${basename}.jpg`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(thumbnailPath),
          folder: this.thumbnailsDir,
          size: '1280x720',
        })
        .on('end', () => {
          this.logger.info('Thumbnail generated', { thumbnailPath });
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          this.logger.error('Thumbnail generation failed', { error: err });
          reject(err);
        });
    });
  }

  /**
   * Upload video to cloud storage
   * Note: This is a placeholder. Implement actual cloud upload based on provider
   */
  private async uploadToCloud(
    videoPath: string,
    context: AgentContext
  ): Promise<string> {
    const provider = context.environment.storageProvider;

    this.logger.info('Uploading video to cloud', { provider, videoPath });

    switch (provider) {
      case 's3':
        return this.uploadToS3(videoPath, context);

      case 'gcs':
        return this.uploadToGCS(videoPath, context);

      case 'local':
        // For local storage, just return the file path
        return `file://${videoPath}`;

      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }

  /**
   * Upload to AWS S3
   * Note: Requires AWS SDK to be installed
   */
  private async uploadToS3(
    videoPath: string,
    context: AgentContext
  ): Promise<string> {
    // Placeholder implementation
    this.logger.warn('S3 upload not implemented. Use local storage.');
    return `s3://bucket/${path.basename(videoPath)}`;
  }

  /**
   * Upload to Google Cloud Storage
   * Note: Requires GCS SDK to be installed
   */
  private async uploadToGCS(
    videoPath: string,
    context: AgentContext
  ): Promise<string> {
    // Placeholder implementation
    this.logger.warn('GCS upload not implemented. Use local storage.');
    return `gs://bucket/${path.basename(videoPath)}`;
  }

  /**
   * Generate streaming URL
   */
  private async generateStreamingUrl(
    cloudUrl: string,
    context: AgentContext
  ): Promise<string> {
    // In a real implementation, this would generate a signed URL or CDN URL
    // For now, return the cloud URL
    return cloudUrl;
  }

  /**
   * Get compression quality based on preference
   */
  private getCompressionQuality(quality: 'low' | 'medium' | 'high'): number {
    const qualityMap: Record<string, number> = {
      low: 32, // Lower quality, smaller file
      medium: 28, // Balanced
      high: 23, // Higher quality, larger file
    };

    return qualityMap[quality] || 28;
  }

  /**
   * Delete processed files to save space
   */
  public async cleanupProcessedFiles(olderThanDays: number = 7): Promise<void> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const cleanup = async (dir: string) => {
      const files = await fs.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
          this.logger.info('Deleted old file', { filePath });
        }
      }
    };

    await cleanup(this.outputDir);
    await cleanup(this.thumbnailsDir);
  }
}
