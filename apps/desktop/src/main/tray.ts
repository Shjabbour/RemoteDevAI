import { app, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { config } from '../config';

let tray: Tray | null = null;
let currentStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';

/**
 * Create system tray icon with menu
 */
export function createTray(
  onOpenSettings: () => void,
  onQuit: () => Promise<void>
): Tray {
  // Load icon
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  // Create tray
  tray = new Tray(icon);
  tray.setToolTip(config.appName);

  // Build menu
  updateTrayMenu(onOpenSettings, onQuit);

  // Handle click events
  tray.on('click', () => {
    onOpenSettings();
  });

  tray.on('double-click', () => {
    onOpenSettings();
  });

  return tray;
}

/**
 * Update tray menu
 */
function updateTrayMenu(
  onOpenSettings: () => void,
  onQuit: () => Promise<void>
): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: config.appName,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: `Status: ${getStatusLabel()}`,
      enabled: false,
      icon: getStatusIcon(),
    },
    { type: 'separator' },
    {
      label: 'Open Settings',
      click: onOpenSettings,
    },
    {
      label: 'Open Dashboard',
      click: () => {
        // Open cloud dashboard in default browser
        const { shell } = require('electron');
        shell.openExternal(config.cloudApiUrl);
      },
    },
    { type: 'separator' },
    {
      label: 'Documentation',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('https://docs.remotedevai.com');
      },
    },
    {
      label: 'Report Issue',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('https://github.com/remotedevai/desktop-agent/issues');
      },
    },
    { type: 'separator' },
    {
      label: `Version ${config.appVersion}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        await onQuit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Update tray status indicator
 */
export function updateTrayStatus(
  status: 'connected' | 'disconnected' | 'error'
): void {
  currentStatus = status;

  if (!tray) return;

  // Update icon
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  tray.setImage(icon);

  // Update tooltip
  const statusText = getStatusLabel();
  tray.setToolTip(`${config.appName} - ${statusText}`);
}

/**
 * Get icon path based on platform and status
 */
function getIconPath(): string {
  const assetsDir = path.join(__dirname, '../../assets');

  if (process.platform === 'win32') {
    // Windows uses .ico files
    return path.join(assetsDir, `icon-${currentStatus}.ico`);
  } else if (process.platform === 'darwin') {
    // macOS uses template images for better dark mode support
    return path.join(assetsDir, `iconTemplate-${currentStatus}.png`);
  } else {
    // Linux uses .png files
    return path.join(assetsDir, `icon-${currentStatus}.png`);
  }
}

/**
 * Get status icon for menu items (smaller)
 */
function getStatusIcon(): nativeImage | undefined {
  const assetsDir = path.join(__dirname, '../../assets');
  const iconPath = path.join(assetsDir, `status-${currentStatus}.png`);

  try {
    const icon = nativeImage.createFromPath(iconPath);
    return icon.resize({ width: 16, height: 16 });
  } catch {
    return undefined;
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(): string {
  switch (currentStatus) {
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection Error';
    default:
      return 'Unknown';
  }
}

/**
 * Destroy tray
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export { tray };
