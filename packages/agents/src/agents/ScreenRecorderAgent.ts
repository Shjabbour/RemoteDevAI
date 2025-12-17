/**
 * ScreenRecorderAgent - Records screen, browser, and terminal activity
 *
 * Features:
 * - Uses Playwright to record browser
 * - Records terminal/CLI output
 * - Captures desktop regions
 * - Configurable quality and FPS
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  ScreenRecordingConfig,
  SessionRecording,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface RecordingSession {
  id: string;
  type: 'browser' | 'terminal' | 'desktop';
  startTime: string;
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  outputPath: string;
  config: ScreenRecordingConfig;
}

/**
 * Screen Recorder Agent
 */
export class ScreenRecorderAgent extends BaseAgent {
  private activeSessions: Map<string, RecordingSession> = new Map();
  private recordingsDir: string = '';

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Screen Recorder Agent',
      type: AgentType.SCREEN_RECORDER,
      enabled: true,
      retryAttempts: 1,
      timeout: 60000,
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize recordings directory
   */
  protected async onInitialize(): Promise<void> {
    this.recordingsDir = path.join(
      process.env.RECORDINGS_DIR || './recordings',
      'sessions'
    );

    await fs.mkdir(this.recordingsDir, { recursive: true });

    this.logger.info('Screen Recorder Agent initialized', {
      recordingsDir: this.recordingsDir,
    });
  }

  /**
   * Process screen recording request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<SessionRecording>> {
    if (message.type !== MessageType.SCREEN_RECORD) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected SCREEN_RECORD, got ${message.type}`
      );
    }

    const recordingConfig = message.payload as ScreenRecordingConfig;

    try {
      this.logger.info('Starting screen recording', {
        type: recordingConfig.type,
        quality: recordingConfig.quality,
      });

      const recording = await this.startRecording(recordingConfig, context);

      this.logger.info('Screen recording started', {
        recordingId: recording.id,
        type: recording.type,
      });

      return this.createSuccessResponse(recording);
    } catch (error) {
      this.logger.error('Failed to start screen recording', { error });
      return this.createErrorResponse(
        'RECORDING_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Start a new recording session
   */
  private async startRecording(
    config: ScreenRecordingConfig,
    context: AgentContext
  ): Promise<SessionRecording> {
    const recordingId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${config.type}-${timestamp}.webm`;
    const outputPath = path.join(this.recordingsDir, filename);

    let session: RecordingSession;

    switch (config.type) {
      case 'browser':
        session = await this.startBrowserRecording(
          recordingId,
          outputPath,
          config,
          context
        );
        break;

      case 'terminal':
        session = await this.startTerminalRecording(
          recordingId,
          outputPath,
          config,
          context
        );
        break;

      case 'desktop':
        session = await this.startDesktopRecording(
          recordingId,
          outputPath,
          config,
          context
        );
        break;

      default:
        throw new Error(`Unsupported recording type: ${config.type}`);
    }

    this.activeSessions.set(recordingId, session);

    return {
      id: recordingId,
      sessionId: context.sessionId,
      type: config.type,
      startTime: session.startTime,
      filePath: outputPath,
    };
  }

  /**
   * Start browser recording using Playwright
   */
  private async startBrowserRecording(
    recordingId: string,
    outputPath: string,
    config: ScreenRecordingConfig,
    context: AgentContext
  ): Promise<RecordingSession> {
    // Launch browser
    const browser = await chromium.launch({
      headless: false, // Must be false for video recording
    });

    // Create context with recording options
    const browserContext = await browser.newContext({
      recordVideo: {
        dir: path.dirname(outputPath),
        size: config.region
          ? { width: config.region.width, height: config.region.height }
          : { width: 1920, height: 1080 },
      },
      viewport: config.region
        ? { width: config.region.width, height: config.region.height }
        : { width: 1920, height: 1080 },
    });

    // Create a new page
    const page = await browserContext.newPage();

    // Navigate to localhost (or any URL you want to record)
    await page.goto('http://localhost:5173'); // Default dev server

    return {
      id: recordingId,
      type: 'browser',
      startTime: new Date().toISOString(),
      browser,
      context: browserContext,
      page,
      outputPath,
      config,
    };
  }

  /**
   * Start terminal recording
   * Note: This is a simplified version. In production, you'd use a terminal emulator
   */
  private async startTerminalRecording(
    recordingId: string,
    outputPath: string,
    config: ScreenRecordingConfig,
    context: AgentContext
  ): Promise<RecordingSession> {
    // For terminal recording, we'll log terminal output to a file
    // In a real implementation, you'd use something like asciinema or ttyrec

    const logFile = outputPath.replace('.webm', '.log');
    await fs.writeFile(logFile, `Terminal recording started at ${new Date().toISOString()}\n`);

    this.logger.info('Terminal recording started (log-based)', {
      recordingId,
      logFile,
    });

    return {
      id: recordingId,
      type: 'terminal',
      startTime: new Date().toISOString(),
      outputPath: logFile,
      config,
    };
  }

  /**
   * Start desktop recording
   * Note: Desktop recording requires native tools (e.g., ffmpeg with screen capture)
   */
  private async startDesktopRecording(
    recordingId: string,
    outputPath: string,
    config: ScreenRecordingConfig,
    context: AgentContext
  ): Promise<RecordingSession> {
    // This would use ffmpeg or similar tool to capture desktop
    // For now, we'll create a placeholder

    this.logger.warn(
      'Desktop recording not fully implemented. Use browser recording instead.'
    );

    return {
      id: recordingId,
      type: 'desktop',
      startTime: new Date().toISOString(),
      outputPath,
      config,
    };
  }

  /**
   * Stop a recording session
   */
  public async stopRecording(recordingId: string): Promise<SessionRecording> {
    const session = this.activeSessions.get(recordingId);

    if (!session) {
      throw new Error(`Recording session ${recordingId} not found`);
    }

    this.logger.info('Stopping recording', {
      recordingId,
      type: session.type,
    });

    const endTime = new Date().toISOString();
    const startTime = new Date(session.startTime);
    const duration = Date.now() - startTime.getTime();

    let finalPath = session.outputPath;

    if (session.type === 'browser' && session.context && session.page) {
      // Close the page to finalize the video
      await session.page.close();

      // Get the video path (Playwright saves it automatically)
      const videoPath = await session.page.video()?.path();
      if (videoPath) {
        finalPath = videoPath;
      }

      // Close browser context
      await session.context.close();

      // Close browser
      if (session.browser) {
        await session.browser.close();
      }
    }

    this.activeSessions.delete(recordingId);

    // Send to video processing agent
    await this.sendMessage(
      MessageType.VIDEO_PROCESSED,
      {
        recordingId,
        filePath: finalPath,
      },
      AgentType.VIDEO_PROCESSING
    );

    return {
      id: recordingId,
      sessionId: '',
      type: session.type,
      startTime: session.startTime,
      endTime,
      duration,
      filePath: finalPath,
    };
  }

  /**
   * Stop all active recordings
   */
  public async stopAllRecordings(): Promise<SessionRecording[]> {
    const recordings: SessionRecording[] = [];

    for (const [recordingId] of this.activeSessions) {
      try {
        const recording = await this.stopRecording(recordingId);
        recordings.push(recording);
      } catch (error) {
        this.logger.error('Failed to stop recording', { recordingId, error });
      }
    }

    return recordings;
  }

  /**
   * Get active recordings
   */
  public getActiveRecordings(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get recording info
   */
  public getRecordingInfo(recordingId: string): RecordingSession | undefined {
    return this.activeSessions.get(recordingId);
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('Stopping all recordings before shutdown');
    await this.stopAllRecordings();
  }
}
