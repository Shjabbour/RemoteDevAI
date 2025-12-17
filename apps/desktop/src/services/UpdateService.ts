import { EventEmitter } from 'events';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { createLogger } from '../utils/logger';
import { config } from '../config';

const logger = createLogger('UpdateService');

export class UpdateService extends EventEmitter {
  private updateAvailable = false;
  private updateInfo: UpdateInfo | null = null;
  private updateDownloaded = false;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize update service
   */
  private initialize(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Setup event handlers
    this.setupEventHandlers();

    // Start periodic checks if enabled
    if (config.autoUpdateEnabled) {
      this.startPeriodicChecks();
    }

    logger.info('Update service initialized');
  }

  /**
   * Setup auto-updater event handlers
   */
  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates...');
      this.emit('checking');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.info('Update available:', info.version);
      this.updateAvailable = true;
      this.updateInfo = info;
      this.emit('update-available', info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logger.info('No updates available');
      this.updateAvailable = false;
      this.updateInfo = null;
      this.emit('update-not-available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
      logger.debug(
        `Download progress: ${progress.percent.toFixed(2)}% (${progress.transferred}/${progress.total})`
      );
      this.emit('download-progress', progress);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logger.info('Update downloaded:', info.version);
      this.updateDownloaded = true;
      this.emit('update-downloaded', info);
    });

    autoUpdater.on('error', (error: Error) => {
      logger.error('Update error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Start periodic update checks
   */
  private startPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    const intervalMs = config.updateCheckInterval * 60 * 60 * 1000; // Convert hours to ms

    this.checkTimer = setInterval(() => {
      this.checkForUpdates().catch((error) => {
        logger.error('Periodic update check failed:', error);
      });
    }, intervalMs);

    logger.info(`Periodic update checks started (interval: ${config.updateCheckInterval}h)`);
  }

  /**
   * Stop periodic update checks
   */
  private stopPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      logger.info('Periodic update checks stopped');
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      logger.info('Checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo || null;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      throw error;
    }
  }

  /**
   * Download update
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('No update available');
    }

    try {
      logger.info('Downloading update...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      logger.error('Failed to download update:', error);
      throw error;
    }
  }

  /**
   * Quit and install update
   */
  quitAndInstall(): void {
    if (!this.updateDownloaded) {
      throw new Error('No update downloaded');
    }

    logger.info('Quitting and installing update...');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Get update info
   */
  getUpdateInfo(): {
    available: boolean;
    downloaded: boolean;
    version?: string;
    releaseDate?: string;
    releaseNotes?: string;
  } {
    return {
      available: this.updateAvailable,
      downloaded: this.updateDownloaded,
      version: this.updateInfo?.version,
      releaseDate: this.updateInfo?.releaseDate,
      releaseNotes: this.updateInfo?.releaseNotes as string | undefined,
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopPeriodicChecks();
  }
}
