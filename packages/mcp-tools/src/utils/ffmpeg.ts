/**
 * FFmpeg wrapper utilities for video processing
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

export interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  resolution?: string;
  fps?: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  codec?: string;
  audioBitrate?: string;
  videoBitrate?: string;
}

export interface CompressOptions {
  quality?: 'low' | 'medium' | 'high';
  resolution?: string;
  targetSize?: number; // in MB
}

export interface ThumbnailOptions {
  timestamp: number; // in seconds
  format?: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

/**
 * Get quality presets for video encoding
 */
export function getQualityPreset(quality: 'low' | 'medium' | 'high' | 'ultra') {
  const presets = {
    low: {
      videoBitrate: '500k',
      audioBitrate: '64k',
      crf: 28,
    },
    medium: {
      videoBitrate: '1000k',
      audioBitrate: '128k',
      crf: 23,
    },
    high: {
      videoBitrate: '2500k',
      audioBitrate: '192k',
      crf: 18,
    },
    ultra: {
      videoBitrate: '5000k',
      audioBitrate: '256k',
      crf: 15,
    },
  };

  return presets[quality];
}

/**
 * Compress video file
 *
 * @example
 * const output = await compressVideo('input.mp4', 'output.mp4', {
 *   quality: 'medium',
 *   resolution: '1280x720'
 * });
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string,
  options: CompressOptions = {}
): Promise<string> {
  const { quality = 'medium', resolution, targetSize } = options;
  const preset = getQualityPreset(quality);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .outputOptions('-crf', preset.crf.toString())
      .videoBitrate(preset.videoBitrate)
      .audioBitrate(preset.audioBitrate);

    if (resolution) {
      command = command.size(resolution);
    }

    if (targetSize) {
      // Calculate bitrate based on target file size
      // This is an approximation
      const duration = 0; // Would need to get actual duration first
      const targetBitrate = Math.floor((targetSize * 8192) / duration);
      command = command.videoBitrate(`${targetBitrate}k`);
    }

    command
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Create thumbnail from video
 *
 * @example
 * const thumbnail = await createThumbnail('video.mp4', 'thumb.jpg', {
 *   timestamp: 5,
 *   width: 640,
 *   height: 360
 * });
 */
export async function createThumbnail(
  videoPath: string,
  outputPath: string,
  options: ThumbnailOptions
): Promise<string> {
  const { timestamp, format = 'jpeg', width, height } = options;

  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
      });

    if (width && height) {
      command = command.size(`${width}x${height}`);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Trim video to specific time range
 *
 * @example
 * const trimmed = await trimVideo('input.mp4', 'output.mp4', 10, 30);
 */
export async function trimVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<string> {
  const duration = endTime - startTime;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Add timestamp overlay to video
 *
 * @example
 * const video = await addTimestampOverlay('input.mp4', 'output.mp4', 'top-right');
 */
export async function addTimestampOverlay(
  inputPath: string,
  outputPath: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right',
  format: string = 'HH\\:mm\\:ss'
): Promise<string> {
  const positionMap = {
    'top-left': 'x=10:y=10',
    'top-right': 'x=w-tw-10:y=10',
    'bottom-left': 'x=10:y=h-th-10',
    'bottom-right': 'x=w-tw-10:y=h-th-10',
  };

  const drawtext = `drawtext=text='%{pts\\:hms}':fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:${positionMap[position]}`;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(drawtext)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Get video metadata
 *
 * @example
 * const metadata = await getVideoMetadata('video.mp4');
 * console.log(metadata.duration, metadata.resolution);
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  duration: number;
  resolution: { width: number; height: number };
  fps: number;
  size: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      const stats = await fs.stat(videoPath);

      resolve({
        duration: metadata.format.duration || 0,
        resolution: {
          width: videoStream.width || 0,
          height: videoStream.height || 0,
        },
        fps: eval(videoStream.r_frame_rate || '0') as number,
        size: stats.size,
        format: metadata.format.format_name || 'unknown',
      });
    });
  });
}

/**
 * Convert video format
 *
 * @example
 * await convertVideo('input.webm', 'output.mp4', 'mp4');
 */
export async function convertVideo(
  inputPath: string,
  outputPath: string,
  format: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat(format)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Merge multiple videos
 *
 * @example
 * await mergeVideos(['video1.mp4', 'video2.mp4'], 'merged.mp4');
 */
export async function mergeVideos(
  inputPaths: string[],
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    inputPaths.forEach(path => {
      command.input(path);
    });

    command
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .mergeToFile(outputPath);
  });
}

/**
 * Extract audio from video
 *
 * @example
 * await extractAudio('video.mp4', 'audio.mp3');
 */
export async function extractAudio(
  videoPath: string,
  outputPath: string,
  format: string = 'mp3'
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .toFormat(format)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}
