import { EventEmitter } from 'events';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { createLogger } from '../utils/logger';
import { ConnectionService } from './ConnectionService';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const logger = createLogger('RecordingService');

export interface RecordingOptions {
  type: 'screen' | 'terminal';
  targetId?: string; // terminal ID if type is 'terminal'
  quality?: 'low' | 'medium' | 'high';
  fps?: number;
}

export interface Recording {
  id: string;
  type: 'screen' | 'terminal';
  startedAt: Date;
  stoppedAt?: Date;
  filePath?: string;
  fileSize?: number;
  duration?: number;
}

export class RecordingService extends EventEmitter {
  private connectionService: ConnectionService;
  private currentRecording: Recording | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private videoPath: string | null = null;

  constructor(connectionService: ConnectionService) {
    super();
    this.connectionService = connectionService;
    this.setupConnectionHandlers();
  }

  /**
   * Setup handlers for cloud commands
   */
  private setupConnectionHandlers(): void {
    this.connectionService.on('command', async (command) => {
      switch (command.type) {
        case 'recording:start':
          try {
            const recording = await this.startRecording(command.options);
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
              result: {
                recordingId: recording.id,
              },
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;

        case 'recording:stop':
          try {
            const recording = await this.stopRecording();
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
              result: recording,
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;
      }
    });
  }

  /**
   * Start recording
   */
  async startRecording(options: RecordingOptions = { type: 'screen' }): Promise<Recording> {
    if (this.currentRecording) {
      throw new Error('Recording already in progress');
    }

    const id = uuidv4();
    const recordingDir = path.join(config.recordingsPath, id);

    logger.info(`Starting ${options.type} recording ${id}`);

    try {
      // Create recording directory
      if (!fs.existsSync(recordingDir)) {
        fs.mkdirSync(recordingDir, { recursive: true });
      }

      this.currentRecording = {
        id,
        type: options.type,
        startedAt: new Date(),
      };

      if (options.type === 'screen') {
        await this.startScreenRecording(recordingDir, options);
      } else {
        await this.startTerminalRecording(recordingDir, options);
      }

      logger.info(`Recording ${id} started`);

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('recording:started', {
          recordingId: id,
          type: options.type,
        });
      }

      this.emit('started', this.currentRecording);

      return this.currentRecording;
    } catch (error) {
      logger.error(`Failed to start recording ${id}:`, error);
      this.currentRecording = null;
      throw error;
    }
  }

  /**
   * Start screen recording using Playwright
   */
  private async startScreenRecording(
    recordingDir: string,
    options: RecordingOptions
  ): Promise<void> {
    const videoSize = this.getVideoSize(options.quality);

    this.browser = await chromium.launch({
      headless: false,
      args: ['--enable-usermedia-screen-capturing', '--auto-select-desktop-capture-source=Screen'],
    });

    this.context = await this.browser.newContext({
      recordVideo: {
        dir: recordingDir,
        size: videoSize,
      },
      viewport: videoSize,
    });

    this.page = await this.context.newPage();

    // Navigate to a blank page
    await this.page.goto('about:blank');

    this.videoPath = await this.context
      .pages()[0]
      .video()
      ?.path()
      .catch(() => null);
  }

  /**
   * Start terminal recording (simplified - captures terminal output)
   */
  private async startTerminalRecording(
    recordingDir: string,
    options: RecordingOptions
  ): Promise<void> {
    // For terminal recording, we'll capture the terminal output to a log file
    // and potentially convert it to video using asciinema or similar
    this.videoPath = path.join(recordingDir, 'terminal.log');

    // Create the log file
    fs.writeFileSync(this.videoPath, '');

    logger.info('Terminal recording setup complete');
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Recording | null> {
    if (!this.currentRecording) {
      throw new Error('No recording in progress');
    }

    const recording = this.currentRecording;
    logger.info(`Stopping recording ${recording.id}`);

    try {
      if (recording.type === 'screen') {
        await this.stopScreenRecording();
      } else {
        await this.stopTerminalRecording();
      }

      recording.stoppedAt = new Date();
      recording.duration = recording.stoppedAt.getTime() - recording.startedAt.getTime();

      // Get file info
      if (this.videoPath && fs.existsSync(this.videoPath)) {
        const stats = fs.statSync(this.videoPath);
        recording.filePath = this.videoPath;
        recording.fileSize = stats.size;
      }

      logger.info(`Recording ${recording.id} stopped`);

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('recording:stopped', {
          recordingId: recording.id,
          duration: recording.duration,
          fileSize: recording.fileSize,
        });

        // Optionally upload recording
        await this.uploadRecording(recording);
      }

      this.emit('stopped', recording);

      const result = { ...recording };
      this.currentRecording = null;
      this.videoPath = null;

      return result;
    } catch (error) {
      logger.error(`Failed to stop recording ${recording.id}:`, error);
      throw error;
    }
  }

  /**
   * Stop screen recording
   */
  private async stopScreenRecording(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Stop terminal recording
   */
  private async stopTerminalRecording(): Promise<void> {
    // Nothing specific to do for terminal recording cleanup
    logger.info('Terminal recording stopped');
  }

  /**
   * Upload recording to cloud
   */
  private async uploadRecording(recording: Recording): Promise<void> {
    if (!recording.filePath || !fs.existsSync(recording.filePath)) {
      logger.warn('Recording file not found, skipping upload');
      return;
    }

    logger.info(`Uploading recording ${recording.id}...`);

    try {
      // Read file and convert to base64 (for small files)
      // For larger files, you'd want to use streaming or chunked upload
      const fileSize = recording.fileSize || 0;
      const maxInlineSize = 5 * 1024 * 1024; // 5MB

      if (fileSize < maxInlineSize) {
        const content = fs.readFileSync(recording.filePath);
        const base64 = content.toString('base64');

        this.connectionService.send('recording:upload', {
          recordingId: recording.id,
          content: base64,
          encoding: 'base64',
          filename: path.basename(recording.filePath),
        });
      } else {
        logger.warn('Recording file too large for inline upload, using chunked upload');
        // Implement chunked upload here
        await this.uploadRecordingChunked(recording);
      }

      logger.info(`Recording ${recording.id} uploaded`);
    } catch (error) {
      logger.error(`Failed to upload recording ${recording.id}:`, error);
    }
  }

  /**
   * Upload recording in chunks
   */
  private async uploadRecordingChunked(recording: Recording): Promise<void> {
    if (!recording.filePath) return;

    const chunkSize = 1024 * 1024; // 1MB chunks
    const fileSize = recording.fileSize || 0;
    const chunks = Math.ceil(fileSize / chunkSize);

    const stream = fs.createReadStream(recording.filePath, {
      highWaterMark: chunkSize,
    });

    let chunkIndex = 0;

    for await (const chunk of stream) {
      const base64 = chunk.toString('base64');

      this.connectionService.send('recording:upload:chunk', {
        recordingId: recording.id,
        chunkIndex,
        totalChunks: chunks,
        content: base64,
      });

      chunkIndex++;
    }

    this.connectionService.send('recording:upload:complete', {
      recordingId: recording.id,
    });
  }

  /**
   * Get current recording status
   */
  getStatus(): Recording | null {
    return this.currentRecording ? { ...this.currentRecording } : null;
  }

  /**
   * List all recordings
   */
  async listRecordings(): Promise<
    Array<{
      id: string;
      type: string;
      startedAt: Date;
      duration?: number;
      fileSize?: number;
    }>
  > {
    const recordingsPath = config.recordingsPath;

    if (!fs.existsSync(recordingsPath)) {
      return [];
    }

    const dirs = fs
      .readdirSync(recordingsPath)
      .filter((name) => fs.statSync(path.join(recordingsPath, name)).isDirectory());

    const recordings = [];

    for (const dir of dirs) {
      const recordingPath = path.join(recordingsPath, dir);
      const files = fs.readdirSync(recordingPath);

      if (files.length === 0) continue;

      const videoFile = files.find(
        (f) => f.endsWith('.webm') || f.endsWith('.mp4') || f.endsWith('.log')
      );

      if (!videoFile) continue;

      const filePath = path.join(recordingPath, videoFile);
      const stats = fs.statSync(filePath);

      recordings.push({
        id: dir,
        type: videoFile.endsWith('.log') ? 'terminal' : 'screen',
        startedAt: stats.birthtime,
        fileSize: stats.size,
      });
    }

    return recordings;
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    const recordingPath = path.join(config.recordingsPath, recordingId);

    if (!fs.existsSync(recordingPath)) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    logger.info(`Deleting recording ${recordingId}`);

    // Delete directory and all contents
    fs.rmSync(recordingPath, { recursive: true, force: true });

    logger.info(`Recording ${recordingId} deleted`);
  }

  /**
   * Get video size based on quality
   */
  private getVideoSize(quality?: 'low' | 'medium' | 'high'): { width: number; height: number } {
    switch (quality || config.recordingQuality) {
      case 'low':
        return { width: 1280, height: 720 };
      case 'medium':
        return { width: 1920, height: 1080 };
      case 'high':
        return { width: 2560, height: 1440 };
      default:
        return { width: 1920, height: 1080 };
    }
  }
}
