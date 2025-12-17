/**
 * Screen recording tools
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { getVideoMetadata } from '../utils/ffmpeg.js';
import {
  ToolResponse,
  VideoData,
  StartRecordingParams,
  RecordingStatus,
} from '../types.js';

interface ActiveRecording {
  process: ChildProcess;
  startTime: Date;
  outputPath: string;
  params: StartRecordingParams;
}

let activeRecording: ActiveRecording | null = null;

/**
 * Start screen recording
 *
 * @example
 * const result = await startRecording({
 *   display: 0,
 *   fps: 30,
 *   quality: 'high',
 *   audio: false,
 *   maxDuration: 300
 * });
 */
export async function startRecording(
  params: StartRecordingParams
): Promise<ToolResponse<{ recordingId: string; outputPath: string }>> {
  try {
    if (activeRecording) {
      return {
        success: false,
        error: 'Recording already in progress',
        message: 'Stop the current recording before starting a new one',
      };
    }

    const {
      display = 0,
      fps = 30,
      quality = 'high',
      region,
      audio = false,
      maxDuration,
    } = params;

    // Create output directory
    const outputDir = path.join(process.cwd(), 'recordings');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `recording-${timestamp}.mp4`);

    // Build ffmpeg command based on platform
    const args = buildFFmpegCommand(params, outputPath);

    // Start recording process
    const recordingProcess = spawn('ffmpeg', args);

    let errorOutput = '';

    recordingProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    recordingProcess.on('error', (error) => {
      console.error('Recording error:', error);
      activeRecording = null;
    });

    activeRecording = {
      process: recordingProcess,
      startTime: new Date(),
      outputPath,
      params,
    };

    // Auto-stop after maxDuration if specified
    if (maxDuration) {
      setTimeout(() => {
        if (activeRecording) {
          stopRecording();
        }
      }, maxDuration * 1000);
    }

    const recordingId = `rec-${timestamp}`;

    return {
      success: true,
      data: {
        recordingId,
        outputPath,
      },
      message: `Recording started (${fps} fps, ${quality} quality)`,
    };
  } catch (error) {
    activeRecording = null;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start recording',
      message: 'Recording start failed',
    };
  }
}

/**
 * Build ffmpeg command based on platform and parameters
 */
function buildFFmpegCommand(params: StartRecordingParams, outputPath: string): string[] {
  const { display = 0, fps = 30, quality = 'high', region, audio = false } = params;

  const qualityPresets = {
    low: { crf: 28, preset: 'ultrafast' },
    medium: { crf: 23, preset: 'fast' },
    high: { crf: 18, preset: 'medium' },
    ultra: { crf: 15, preset: 'slow' },
  };

  const preset = qualityPresets[quality];
  const args: string[] = [];

  // Platform-specific input
  if (process.platform === 'win32') {
    args.push('-f', 'gdigrab');
    if (region) {
      args.push(
        '-offset_x', region.x.toString(),
        '-offset_y', region.y.toString(),
        '-video_size', `${region.width}x${region.height}`
      );
    }
    args.push('-i', 'desktop');

    if (audio) {
      args.push('-f', 'dshow', '-i', 'audio="Microphone"');
    }
  } else if (process.platform === 'darwin') {
    args.push('-f', 'avfoundation');
    args.push('-i', `${display}:${audio ? '0' : 'none'}`);

    if (region) {
      args.push(
        '-filter:v',
        `crop=${region.width}:${region.height}:${region.x}:${region.y}`
      );
    }
  } else {
    // Linux
    args.push('-f', 'x11grab');
    if (region) {
      args.push('-video_size', `${region.width}x${region.height}`);
      args.push('-i', `:0.0+${region.x},${region.y}`);
    } else {
      args.push('-i', `:0.0+${display * 1920},0`);
    }

    if (audio) {
      args.push('-f', 'pulse', '-i', 'default');
    }
  }

  // Output settings
  args.push(
    '-framerate', fps.toString(),
    '-c:v', 'libx264',
    '-crf', preset.crf.toString(),
    '-preset', preset.preset,
    '-pix_fmt', 'yuv420p'
  );

  if (audio) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }

  args.push(outputPath);

  return args;
}

/**
 * Stop current recording
 *
 * @example
 * const result = await stopRecording();
 */
export async function stopRecording(): Promise<ToolResponse<VideoData>> {
  try {
    if (!activeRecording) {
      return {
        success: false,
        error: 'No active recording',
        message: 'No recording in progress',
      };
    }

    const { process: recordingProcess, outputPath, startTime } = activeRecording;

    // Send quit signal to ffmpeg
    recordingProcess.stdin?.write('q');

    // Wait for process to exit
    await new Promise<void>((resolve) => {
      recordingProcess.on('close', () => resolve());
      setTimeout(() => {
        recordingProcess.kill('SIGKILL');
        resolve();
      }, 5000);
    });

    activeRecording = null;

    // Wait a bit for file to be fully written
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get video metadata
    const metadata = await getVideoMetadata(outputPath);
    const duration = (Date.now() - startTime.getTime()) / 1000;

    return {
      success: true,
      data: {
        path: outputPath,
        duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Recording saved (${duration.toFixed(1)}s)`,
    };
  } catch (error) {
    activeRecording = null;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop recording',
      message: 'Recording stop failed',
    };
  }
}

/**
 * Get recording status
 *
 * @example
 * const status = await getRecordingStatus();
 */
export async function getRecordingStatus(): Promise<ToolResponse<RecordingStatus>> {
  try {
    if (!activeRecording) {
      return {
        success: true,
        data: {
          isRecording: false,
          duration: 0,
        },
        message: 'No recording in progress',
      };
    }

    const duration = (Date.now() - activeRecording.startTime.getTime()) / 1000;

    return {
      success: true,
      data: {
        isRecording: true,
        duration,
        startTime: activeRecording.startTime,
        outputPath: activeRecording.outputPath,
      },
      message: `Recording in progress (${duration.toFixed(1)}s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status',
      message: 'Status check failed',
    };
  }
}

/**
 * Pause current recording (if supported)
 *
 * @example
 * await pauseRecording();
 */
export async function pauseRecording(): Promise<ToolResponse<void>> {
  try {
    if (!activeRecording) {
      return {
        success: false,
        error: 'No active recording',
        message: 'No recording in progress',
      };
    }

    // Note: FFmpeg doesn't support pause/resume natively
    // This would require stopping and restarting
    return {
      success: false,
      error: 'Pause not supported',
      message: 'Use stop and start to pause/resume recording',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause',
      message: 'Pause failed',
    };
  }
}

/**
 * Cancel current recording without saving
 *
 * @example
 * await cancelRecording();
 */
export async function cancelRecording(): Promise<ToolResponse<void>> {
  try {
    if (!activeRecording) {
      return {
        success: false,
        error: 'No active recording',
        message: 'No recording in progress',
      };
    }

    const { process: recordingProcess, outputPath } = activeRecording;

    // Kill the process
    recordingProcess.kill('SIGKILL');

    // Delete the output file
    await fs.unlink(outputPath).catch(() => {});

    activeRecording = null;

    return {
      success: true,
      message: 'Recording cancelled',
    };
  } catch (error) {
    activeRecording = null;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel',
      message: 'Cancel failed',
    };
  }
}
