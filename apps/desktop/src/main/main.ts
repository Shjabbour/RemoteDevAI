import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { createTray, updateTrayStatus } from './tray';
import { setupIpcHandlers } from './ipc';
import { ConnectionService } from '../services/ConnectionService';
import { ClaudeCodeService } from '../services/ClaudeCodeService';
import { TerminalService } from '../services/TerminalService';
import { RecordingService } from '../services/RecordingService';
import { FileWatcherService } from '../services/FileWatcherService';
import { TunnelService } from '../services/TunnelService';
import { AuthService } from '../services/AuthService';
import { UpdateService } from '../services/UpdateService';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import AutoLaunch from 'auto-launch';

const logger = createLogger('main');

// Services
let connectionService: ConnectionService;
let claudeCodeService: ClaudeCodeService;
let terminalService: TerminalService;
let recordingService: RecordingService;
let fileWatcherService: FileWatcherService;
let tunnelService: TunnelService;
let authService: AuthService;
let updateService: UpdateService;

// Windows
let settingsWindow: BrowserWindow | null = null;

// Auto-launch
const autoLauncher = new AutoLaunch({
  name: config.appName,
  path: app.getPath('exe'),
});

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logger.warn('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our settings window if exists
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.focus();
    } else {
      createSettingsWindow();
    }
  });
}

/**
 * Create the settings window
 */
function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: `${config.appName} Settings`,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Remove menu in production
  if (config.isProduction) {
    settingsWindow.setMenu(null);
  }

  settingsWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  // Open DevTools in development
  if (config.isDevelopment) {
    settingsWindow.webContents.openDevTools();
  }
}

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');

    // Auth Service (must be first)
    authService = new AuthService();

    // Connection Service
    connectionService = new ConnectionService(authService);

    // Claude Code Service
    claudeCodeService = new ClaudeCodeService(connectionService);

    // Terminal Service
    terminalService = new TerminalService(connectionService);

    // Recording Service
    recordingService = new RecordingService(connectionService);

    // File Watcher Service
    fileWatcherService = new FileWatcherService(connectionService);

    // Tunnel Service
    tunnelService = new TunnelService(connectionService);

    // Update Service
    updateService = new UpdateService();

    // Setup service event handlers
    setupServiceEventHandlers();

    // Attempt to connect if we have auth token
    const token = await authService.getAuthToken();
    if (token) {
      await connectionService.connect();
    }

    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Setup event handlers for services
 */
function setupServiceEventHandlers(): void {
  // Connection events
  connectionService.on('connected', () => {
    logger.info('Connected to cloud');
    updateTrayStatus('connected');
  });

  connectionService.on('disconnected', () => {
    logger.info('Disconnected from cloud');
    updateTrayStatus('disconnected');
  });

  connectionService.on('error', (error: Error) => {
    logger.error('Connection error:', error);
    updateTrayStatus('error');
  });

  // Update events
  updateService.on('update-available', (info) => {
    logger.info('Update available:', info.version);
    // Could show notification here
  });

  updateService.on('update-downloaded', () => {
    logger.info('Update downloaded, will install on quit');
    // Could show notification here
  });
}

/**
 * Setup auto-launch
 */
async function setupAutoLaunch(): Promise<void> {
  try {
    if (config.autoLaunchEnabled) {
      const isEnabled = await autoLauncher.isEnabled();
      if (!isEnabled) {
        await autoLauncher.enable();
        logger.info('Auto-launch enabled');
      }
    } else {
      const isEnabled = await autoLauncher.isEnabled();
      if (isEnabled) {
        await autoLauncher.disable();
        logger.info('Auto-launch disabled');
      }
    }
  } catch (error) {
    logger.error('Failed to setup auto-launch:', error);
  }
}

/**
 * Cleanup function
 */
async function cleanup(): Promise<void> {
  logger.info('Cleaning up...');

  try {
    if (connectionService) {
      await connectionService.disconnect();
    }
    if (claudeCodeService) {
      await claudeCodeService.stop();
    }
    if (terminalService) {
      await terminalService.cleanup();
    }
    if (recordingService) {
      await recordingService.stopRecording();
    }
    if (fileWatcherService) {
      await fileWatcherService.stop();
    }
    if (tunnelService) {
      await tunnelService.stop();
    }
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
}

// App event handlers
app.on('ready', async () => {
  logger.info(`${config.appName} v${config.appVersion} starting...`);

  try {
    // Create system tray
    createTray(createSettingsWindow, async () => {
      await cleanup();
      app.quit();
    });

    // Setup IPC handlers
    setupIpcHandlers(
      ipcMain,
      connectionService,
      claudeCodeService,
      terminalService,
      recordingService,
      fileWatcherService,
      tunnelService,
      authService,
      updateService
    );

    // Initialize services
    await initializeServices();

    // Setup auto-launch
    await setupAutoLaunch();

    // Check for updates
    if (config.autoUpdateEnabled) {
      updateService.checkForUpdates();
    }

    logger.info(`${config.appName} started successfully`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', (e: Event) => {
  // Prevent app from quitting when all windows are closed
  // App runs in background via system tray
  e.preventDefault();
});

app.on('before-quit', async (e) => {
  e.preventDefault();
  await cleanup();
  app.exit(0);
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (process.platform === 'darwin') {
    createSettingsWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

// Export services for IPC handlers
export {
  connectionService,
  claudeCodeService,
  terminalService,
  recordingService,
  fileWatcherService,
  tunnelService,
  authService,
  updateService,
  createSettingsWindow,
};
