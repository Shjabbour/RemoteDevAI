import { IpcMain, IpcMainInvokeEvent } from 'electron';
import { ConnectionService } from '../services/ConnectionService';
import { ClaudeCodeService } from '../services/ClaudeCodeService';
import { TerminalService } from '../services/TerminalService';
import { RecordingService } from '../services/RecordingService';
import { FileWatcherService } from '../services/FileWatcherService';
import { TunnelService } from '../services/TunnelService';
import { AuthService } from '../services/AuthService';
import { UpdateService } from '../services/UpdateService';
import { createLogger } from '../utils/logger';

const logger = createLogger('ipc');

/**
 * Setup IPC handlers for communication between renderer and main process
 */
export function setupIpcHandlers(
  ipcMain: IpcMain,
  connectionService: ConnectionService,
  claudeCodeService: ClaudeCodeService,
  terminalService: TerminalService,
  recordingService: RecordingService,
  fileWatcherService: FileWatcherService,
  tunnelService: TunnelService,
  authService: AuthService,
  updateService: UpdateService
): void {
  // Authentication
  ipcMain.handle('auth:getToken', async () => {
    return await authService.getAuthToken();
  });

  ipcMain.handle('auth:setToken', async (_, token: string) => {
    return await authService.setAuthToken(token);
  });

  ipcMain.handle('auth:clearToken', async () => {
    return await authService.clearAuthToken();
  });

  ipcMain.handle('auth:getDeviceId', async () => {
    return await authService.getDeviceId();
  });

  // Connection
  ipcMain.handle('connection:getStatus', async () => {
    return connectionService.getStatus();
  });

  ipcMain.handle('connection:connect', async () => {
    return await connectionService.connect();
  });

  ipcMain.handle('connection:disconnect', async () => {
    return await connectionService.disconnect();
  });

  ipcMain.handle('connection:getStats', async () => {
    return connectionService.getStats();
  });

  // Claude Code
  ipcMain.handle('claude:start', async (_, options: any) => {
    return await claudeCodeService.start(options);
  });

  ipcMain.handle('claude:stop', async () => {
    return await claudeCodeService.stop();
  });

  ipcMain.handle('claude:getStatus', async () => {
    return claudeCodeService.getStatus();
  });

  ipcMain.handle('claude:executeCommand', async (_, command: string) => {
    return await claudeCodeService.executeCommand(command);
  });

  // Terminal
  ipcMain.handle('terminal:create', async (_, options: any) => {
    return await terminalService.createTerminal(options);
  });

  ipcMain.handle('terminal:write', async (_, terminalId: string, data: string) => {
    return terminalService.write(terminalId, data);
  });

  ipcMain.handle('terminal:resize', async (_, terminalId: string, cols: number, rows: number) => {
    return terminalService.resize(terminalId, cols, rows);
  });

  ipcMain.handle('terminal:kill', async (_, terminalId: string) => {
    return await terminalService.kill(terminalId);
  });

  ipcMain.handle('terminal:list', async () => {
    return terminalService.listTerminals();
  });

  // Recording
  ipcMain.handle('recording:start', async (_, options: any) => {
    return await recordingService.startRecording(options);
  });

  ipcMain.handle('recording:stop', async () => {
    return await recordingService.stopRecording();
  });

  ipcMain.handle('recording:getStatus', async () => {
    return recordingService.getStatus();
  });

  ipcMain.handle('recording:listRecordings', async () => {
    return await recordingService.listRecordings();
  });

  ipcMain.handle('recording:deleteRecording', async (_, recordingId: string) => {
    return await recordingService.deleteRecording(recordingId);
  });

  // File Watcher
  ipcMain.handle('fileWatcher:start', async (_, paths: string[]) => {
    return await fileWatcherService.start(paths);
  });

  ipcMain.handle('fileWatcher:stop', async () => {
    return await fileWatcherService.stop();
  });

  ipcMain.handle('fileWatcher:getStatus', async () => {
    return fileWatcherService.getStatus();
  });

  ipcMain.handle('fileWatcher:addPath', async (_, path: string) => {
    return fileWatcherService.addPath(path);
  });

  ipcMain.handle('fileWatcher:removePath', async (_, path: string) => {
    return fileWatcherService.removePath(path);
  });

  // Tunnel
  ipcMain.handle('tunnel:start', async (_, options: any) => {
    return await tunnelService.start(options);
  });

  ipcMain.handle('tunnel:stop', async () => {
    return await tunnelService.stop();
  });

  ipcMain.handle('tunnel:getStatus', async () => {
    return tunnelService.getStatus();
  });

  ipcMain.handle('tunnel:getUrl', async () => {
    return tunnelService.getPublicUrl();
  });

  // Updates
  ipcMain.handle('update:check', async () => {
    return await updateService.checkForUpdates();
  });

  ipcMain.handle('update:download', async () => {
    return await updateService.downloadUpdate();
  });

  ipcMain.handle('update:install', async () => {
    return updateService.quitAndInstall();
  });

  ipcMain.handle('update:getInfo', async () => {
    return updateService.getUpdateInfo();
  });

  // App info
  ipcMain.handle('app:getVersion', async () => {
    const { app } = require('electron');
    return app.getVersion();
  });

  ipcMain.handle('app:getConfig', async () => {
    const { config } = require('../config');
    // Return safe config without sensitive data
    return {
      appName: config.appName,
      appVersion: config.appVersion,
      isDevelopment: config.isDevelopment,
      cloudApiUrl: config.cloudApiUrl,
      recordingQuality: config.recordingQuality,
      autoLaunchEnabled: config.autoLaunchEnabled,
      autoUpdateEnabled: config.autoUpdateEnabled,
      tunnelProvider: config.tunnelProvider,
    };
  });

  ipcMain.handle('app:openExternal', async (_, url: string) => {
    const { shell } = require('electron');
    return await shell.openExternal(url);
  });

  ipcMain.handle('app:showItemInFolder', async (_, path: string) => {
    const { shell } = require('electron');
    return shell.showItemInFolder(path);
  });

  // Logs
  ipcMain.handle('logs:get', async (_, options?: { limit?: number; level?: string }) => {
    const fs = require('fs');
    const path = require('path');
    const { config } = require('../config');

    const logFile = path.join(config.logsPath, 'app.log');

    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    // Parse and filter logs
    const logs = lines
      .map((line: string) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Apply filters
    let filtered = logs;
    if (options?.level) {
      filtered = filtered.filter((log: any) => log.level === options.level);
    }

    // Apply limit
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  });

  ipcMain.handle('logs:clear', async () => {
    const fs = require('fs');
    const path = require('path');
    const { config } = require('../config');

    const logFile = path.join(config.logsPath, 'app.log');

    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '');
    }

    return true;
  });

  logger.info('IPC handlers registered');
}
