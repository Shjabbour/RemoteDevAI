import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import { createLogger } from '../utils/logger';
import { ConnectionService } from './ConnectionService';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('FileWatcherService');

export interface FileChange {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  timestamp: Date;
  stats?: fs.Stats;
}

export class FileWatcherService extends EventEmitter {
  private connectionService: ConnectionService;
  private watcher: FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();
  private isWatching = false;
  private changeBuffer: FileChange[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

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
        case 'fileWatcher:start':
          try {
            await this.start(command.paths);
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;

        case 'fileWatcher:stop':
          try {
            await this.stop();
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;

        case 'fileWatcher:addPath':
          try {
            this.addPath(command.path);
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;

        case 'fileWatcher:removePath':
          try {
            this.removePath(command.path);
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
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
   * Start watching files
   */
  async start(paths: string[]): Promise<void> {
    if (this.isWatching) {
      logger.warn('File watcher already running');
      return;
    }

    logger.info('Starting file watcher for paths:', paths);

    try {
      // Validate paths
      for (const p of paths) {
        if (!fs.existsSync(p)) {
          throw new Error(`Path does not exist: ${p}`);
        }
        this.watchedPaths.add(p);
      }

      // Create watcher
      this.watcher = chokidar.watch(Array.from(this.watchedPaths), {
        ignored: config.watchIgnorePatterns,
        persistent: true,
        ignoreInitial: false,
        followSymlinks: false,
        usePolling: false,
        alwaysStat: true,
        depth: undefined,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100,
        },
      });

      this.setupWatcherHandlers();

      // Wait for watcher to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Watcher initialization timeout'));
        }, 10000);

        this.watcher!.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.watcher!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.isWatching = true;

      logger.info('File watcher started');

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('fileWatcher:started', {
          paths: Array.from(this.watchedPaths),
        });
      }

      this.emit('started');
    } catch (error) {
      logger.error('Failed to start file watcher:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Setup watcher event handlers
   */
  private setupWatcherHandlers(): void {
    if (!this.watcher) return;

    this.watcher.on('add', (path: string, stats?: fs.Stats) => {
      this.handleChange({ type: 'add', path, stats, timestamp: new Date() });
    });

    this.watcher.on('change', (path: string, stats?: fs.Stats) => {
      this.handleChange({ type: 'change', path, stats, timestamp: new Date() });
    });

    this.watcher.on('unlink', (path: string) => {
      this.handleChange({ type: 'unlink', path, timestamp: new Date() });
    });

    this.watcher.on('addDir', (path: string, stats?: fs.Stats) => {
      this.handleChange({ type: 'addDir', path, stats, timestamp: new Date() });
    });

    this.watcher.on('unlinkDir', (path: string) => {
      this.handleChange({ type: 'unlinkDir', path, timestamp: new Date() });
    });

    this.watcher.on('error', (error: Error) => {
      logger.error('Watcher error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle file change
   */
  private handleChange(change: FileChange): void {
    logger.debug(`File ${change.type}: ${change.path}`);

    this.changeBuffer.push(change);
    this.emit('change', change);

    // Debounce cloud notifications
    this.scheduleCloudNotification();
  }

  /**
   * Schedule cloud notification with debouncing
   */
  private scheduleCloudNotification(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (this.changeBuffer.length > 0 && this.connectionService.isConnected()) {
        const changes = [...this.changeBuffer];
        this.changeBuffer = [];

        // Send to cloud
        this.connectionService.send('fileWatcher:changes', {
          changes: changes.map((c) => ({
            type: c.type,
            path: c.path,
            timestamp: c.timestamp.toISOString(),
            size: c.stats?.size,
          })),
        });
      }

      this.debounceTimer = null;
    }, config.watchDebounceMs);
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    logger.info('Stopping file watcher...');

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.isWatching = false;
    this.changeBuffer = [];

    logger.info('File watcher stopped');

    // Notify cloud
    if (this.connectionService.isConnected()) {
      this.connectionService.send('fileWatcher:stopped', {});
    }

    this.emit('stopped');
  }

  /**
   * Add path to watch
   */
  addPath(path: string): void {
    if (!fs.existsSync(path)) {
      throw new Error(`Path does not exist: ${path}`);
    }

    if (this.watchedPaths.has(path)) {
      logger.warn(`Path already being watched: ${path}`);
      return;
    }

    logger.info(`Adding path to watch: ${path}`);

    this.watchedPaths.add(path);

    if (this.watcher) {
      this.watcher.add(path);
    }

    // Notify cloud
    if (this.connectionService.isConnected()) {
      this.connectionService.send('fileWatcher:pathAdded', { path });
    }
  }

  /**
   * Remove path from watch
   */
  removePath(path: string): void {
    if (!this.watchedPaths.has(path)) {
      logger.warn(`Path not being watched: ${path}`);
      return;
    }

    logger.info(`Removing path from watch: ${path}`);

    this.watchedPaths.delete(path);

    if (this.watcher) {
      this.watcher.unwatch(path);
    }

    // Notify cloud
    if (this.connectionService.isConnected()) {
      this.connectionService.send('fileWatcher:pathRemoved', { path });
    }
  }

  /**
   * Get watch status
   */
  getStatus(): {
    watching: boolean;
    paths: string[];
    changeCount: number;
  } {
    return {
      watching: this.isWatching,
      paths: Array.from(this.watchedPaths),
      changeCount: this.changeBuffer.length,
    };
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }
}
