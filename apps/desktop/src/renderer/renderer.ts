/**
 * Renderer process script
 * Handles UI interactions and communicates with main process via IPC
 */

const api = window.remoteDevAI;

// DOM Elements
let elements: { [key: string]: HTMLElement | null } = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  setupEventListeners();
  await loadInitialData();
  startStatusPolling();
});

/**
 * Initialize DOM element references
 */
function initializeElements(): void {
  const ids = [
    'statusBadge',
    'deviceId',
    'authToken',
    'saveTokenBtn',
    'connectionStatus',
    'messagesSent',
    'messagesReceived',
    'bytesTransferred',
    'connectBtn',
    'disconnectBtn',
    'claudeRunning',
    'claudePid',
    'claudeWorkspace',
    'claudeStartBtn',
    'claudeStopBtn',
    'terminalCount',
    'createTerminalBtn',
    'recordingStatus',
    'startRecordingBtn',
    'stopRecordingBtn',
    'watcherStatus',
    'watchedPathsCount',
    'startWatcherBtn',
    'stopWatcherBtn',
    'tunnelStatus',
    'tunnelUrl',
    'startTunnelBtn',
    'stopTunnelBtn',
    'appVersion',
    'checkUpdatesBtn',
    'openDashboardBtn',
    'updateStatus',
    'downloadUpdateBtn',
    'installUpdateBtn',
    'logsContent',
    'refreshLogsBtn',
    'clearLogsBtn',
  ];

  ids.forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  // Tabs
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabName = target.dataset.tab;
      if (tabName) {
        switchTab(tabName);
      }
    });
  });

  // Connection
  elements.saveTokenBtn?.addEventListener('click', saveAuthToken);
  elements.connectBtn?.addEventListener('click', connect);
  elements.disconnectBtn?.addEventListener('click', disconnect);

  // Claude Code
  elements.claudeStartBtn?.addEventListener('click', startClaude);
  elements.claudeStopBtn?.addEventListener('click', stopClaude);

  // Terminal
  elements.createTerminalBtn?.addEventListener('click', createTerminal);

  // Recording
  elements.startRecordingBtn?.addEventListener('click', startRecording);
  elements.stopRecordingBtn?.addEventListener('click', stopRecording);

  // File Watcher
  elements.startWatcherBtn?.addEventListener('click', startWatcher);
  elements.stopWatcherBtn?.addEventListener('click', stopWatcher);

  // Tunnel
  elements.startTunnelBtn?.addEventListener('click', startTunnel);
  elements.stopTunnelBtn?.addEventListener('click', stopTunnel);

  // Settings
  elements.checkUpdatesBtn?.addEventListener('click', checkUpdates);
  elements.openDashboardBtn?.addEventListener('click', openDashboard);
  elements.downloadUpdateBtn?.addEventListener('click', downloadUpdate);
  elements.installUpdateBtn?.addEventListener('click', installUpdate);

  // Logs
  elements.refreshLogsBtn?.addEventListener('click', loadLogs);
  elements.clearLogsBtn?.addEventListener('click', clearLogs);
}

/**
 * Switch active tab
 */
function switchTab(tabName: string): void {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.remove('active');
  });
  document.getElementById(tabName)?.classList.add('active');

  // Load tab-specific data
  if (tabName === 'logs') {
    loadLogs();
  }
}

/**
 * Load initial data
 */
async function loadInitialData(): Promise<void> {
  try {
    // Load device ID
    const deviceId = await api.auth.getDeviceId();
    if (elements.deviceId) {
      (elements.deviceId as HTMLInputElement).value = deviceId;
    }

    // Load app version
    const version = await api.app.getVersion();
    if (elements.appVersion) {
      elements.appVersion.textContent = version;
    }

    // Load auth token (masked)
    const token = await api.auth.getToken();
    if (token && elements.authToken) {
      (elements.authToken as HTMLInputElement).value = '••••••••';
    }

    // Update all statuses
    await updateAllStatuses();
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
}

/**
 * Start polling for status updates
 */
function startStatusPolling(): void {
  // Poll every 2 seconds
  setInterval(updateAllStatuses, 2000);
}

/**
 * Update all service statuses
 */
async function updateAllStatuses(): Promise<void> {
  await Promise.all([
    updateConnectionStatus(),
    updateClaudeStatus(),
    updateTerminalStatus(),
    updateRecordingStatus(),
    updateWatcherStatus(),
    updateTunnelStatus(),
    updateUpdateStatus(),
  ]);
}

/**
 * Update connection status
 */
async function updateConnectionStatus(): Promise<void> {
  try {
    const status = await api.connection.getStatus();
    const stats = await api.connection.getStats();

    // Update status badge
    if (elements.statusBadge) {
      elements.statusBadge.className = 'status-badge';
      if (status.connected) {
        elements.statusBadge.classList.add('connected');
        (elements.statusBadge.querySelector('.status-text') as HTMLElement).textContent =
          'Connected';
      } else if (status.connecting) {
        elements.statusBadge.classList.add('connecting');
        (elements.statusBadge.querySelector('.status-text') as HTMLElement).textContent =
          'Connecting...';
      } else {
        (elements.statusBadge.querySelector('.status-text') as HTMLElement).textContent =
          'Disconnected';
      }
    }

    // Update connection tab
    if (elements.connectionStatus) {
      elements.connectionStatus.textContent = status.connected
        ? 'Connected'
        : status.connecting
        ? 'Connecting...'
        : 'Disconnected';
    }

    if (elements.messagesSent) {
      elements.messagesSent.textContent = stats.messagesSent.toString();
    }

    if (elements.messagesReceived) {
      elements.messagesReceived.textContent = stats.messagesReceived.toString();
    }

    if (elements.bytesTransferred) {
      elements.bytesTransferred.textContent = formatBytes(stats.bytesTransferred);
    }

    // Update buttons
    if (elements.connectBtn) {
      (elements.connectBtn as HTMLButtonElement).disabled = status.connected;
    }

    if (elements.disconnectBtn) {
      (elements.disconnectBtn as HTMLButtonElement).disabled = !status.connected;
    }
  } catch (error) {
    console.error('Failed to update connection status:', error);
  }
}

/**
 * Update Claude Code status
 */
async function updateClaudeStatus(): Promise<void> {
  try {
    const status = await api.claude.getStatus();

    if (elements.claudeRunning) {
      elements.claudeRunning.textContent = status.running ? 'Yes' : 'No';
    }

    if (elements.claudePid) {
      elements.claudePid.textContent = status.pid ? status.pid.toString() : '-';
    }

    if (elements.claudeWorkspace) {
      elements.claudeWorkspace.textContent = status.workspace || '-';
    }

    // Update buttons
    if (elements.claudeStartBtn) {
      (elements.claudeStartBtn as HTMLButtonElement).disabled = status.running;
    }

    if (elements.claudeStopBtn) {
      (elements.claudeStopBtn as HTMLButtonElement).disabled = !status.running;
    }
  } catch (error) {
    console.error('Failed to update Claude status:', error);
  }
}

/**
 * Update terminal status
 */
async function updateTerminalStatus(): Promise<void> {
  try {
    const terminals = await api.terminal.list();

    if (elements.terminalCount) {
      elements.terminalCount.textContent = terminals.length.toString();
    }
  } catch (error) {
    console.error('Failed to update terminal status:', error);
  }
}

/**
 * Update recording status
 */
async function updateRecordingStatus(): Promise<void> {
  try {
    const status = await api.recording.getStatus();

    if (elements.recordingStatus) {
      elements.recordingStatus.textContent = status ? 'Recording' : 'Not Recording';
    }

    // Update buttons
    if (elements.startRecordingBtn) {
      (elements.startRecordingBtn as HTMLButtonElement).disabled = status !== null;
    }

    if (elements.stopRecordingBtn) {
      (elements.stopRecordingBtn as HTMLButtonElement).disabled = status === null;
    }
  } catch (error) {
    console.error('Failed to update recording status:', error);
  }
}

/**
 * Update file watcher status
 */
async function updateWatcherStatus(): Promise<void> {
  try {
    const status = await api.fileWatcher.getStatus();

    if (elements.watcherStatus) {
      elements.watcherStatus.textContent = status.watching ? 'Watching' : 'Not Watching';
    }

    if (elements.watchedPathsCount) {
      elements.watchedPathsCount.textContent = status.paths.length.toString();
    }

    // Update buttons
    if (elements.startWatcherBtn) {
      (elements.startWatcherBtn as HTMLButtonElement).disabled = status.watching;
    }

    if (elements.stopWatcherBtn) {
      (elements.stopWatcherBtn as HTMLButtonElement).disabled = !status.watching;
    }
  } catch (error) {
    console.error('Failed to update watcher status:', error);
  }
}

/**
 * Update tunnel status
 */
async function updateTunnelStatus(): Promise<void> {
  try {
    const status = await api.tunnel.getStatus();
    const url = await api.tunnel.getUrl();

    if (elements.tunnelStatus) {
      elements.tunnelStatus.textContent = status.running ? 'Running' : 'Not Running';
    }

    if (elements.tunnelUrl) {
      elements.tunnelUrl.textContent = url || '-';
    }

    // Update buttons
    if (elements.startTunnelBtn) {
      (elements.startTunnelBtn as HTMLButtonElement).disabled = status.running;
    }

    if (elements.stopTunnelBtn) {
      (elements.stopTunnelBtn as HTMLButtonElement).disabled = !status.running;
    }
  } catch (error) {
    console.error('Failed to update tunnel status:', error);
  }
}

/**
 * Update update status
 */
async function updateUpdateStatus(): Promise<void> {
  try {
    const info = await api.update.getInfo();

    if (elements.updateStatus) {
      if (info.available) {
        elements.updateStatus.textContent = `Update available: ${info.version}`;
      } else {
        elements.updateStatus.textContent = 'No updates available';
      }
    }

    if (elements.downloadUpdateBtn) {
      (elements.downloadUpdateBtn as HTMLButtonElement).disabled =
        !info.available || info.downloaded;
    }

    if (elements.installUpdateBtn) {
      (elements.installUpdateBtn as HTMLButtonElement).disabled = !info.downloaded;
    }
  } catch (error) {
    console.error('Failed to update update status:', error);
  }
}

// Action handlers
async function saveAuthToken(): Promise<void> {
  try {
    const input = elements.authToken as HTMLInputElement;
    const token = input.value;

    if (!token || token === '••••••••') {
      alert('Please enter a valid token');
      return;
    }

    await api.auth.setToken(token);
    alert('Token saved successfully');
    input.value = '••••••••';
  } catch (error) {
    console.error('Failed to save token:', error);
    alert('Failed to save token');
  }
}

async function connect(): Promise<void> {
  try {
    await api.connection.connect();
  } catch (error) {
    console.error('Failed to connect:', error);
    alert('Failed to connect. Please check your token and try again.');
  }
}

async function disconnect(): Promise<void> {
  try {
    await api.connection.disconnect();
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
}

async function startClaude(): Promise<void> {
  try {
    await api.claude.start();
  } catch (error) {
    console.error('Failed to start Claude:', error);
    alert('Failed to start Claude Code');
  }
}

async function stopClaude(): Promise<void> {
  try {
    await api.claude.stop();
  } catch (error) {
    console.error('Failed to stop Claude:', error);
  }
}

async function createTerminal(): Promise<void> {
  try {
    await api.terminal.create();
    alert('Terminal created');
  } catch (error) {
    console.error('Failed to create terminal:', error);
    alert('Failed to create terminal');
  }
}

async function startRecording(): Promise<void> {
  try {
    await api.recording.start({ type: 'screen' });
  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Failed to start recording');
  }
}

async function stopRecording(): Promise<void> {
  try {
    await api.recording.stop();
  } catch (error) {
    console.error('Failed to stop recording:', error);
  }
}

async function startWatcher(): Promise<void> {
  try {
    const cwd = process.cwd();
    await api.fileWatcher.start([cwd]);
  } catch (error) {
    console.error('Failed to start watcher:', error);
    alert('Failed to start file watcher');
  }
}

async function stopWatcher(): Promise<void> {
  try {
    await api.fileWatcher.stop();
  } catch (error) {
    console.error('Failed to stop watcher:', error);
  }
}

async function startTunnel(): Promise<void> {
  try {
    await api.tunnel.start();
  } catch (error) {
    console.error('Failed to start tunnel:', error);
    alert('Failed to start tunnel. Make sure cloudflared or ngrok is installed.');
  }
}

async function stopTunnel(): Promise<void> {
  try {
    await api.tunnel.stop();
  } catch (error) {
    console.error('Failed to stop tunnel:', error);
  }
}

async function checkUpdates(): Promise<void> {
  try {
    const info = await api.update.check();
    if (info) {
      alert(`Update available: ${info.version}`);
    } else {
      alert('No updates available');
    }
  } catch (error) {
    console.error('Failed to check updates:', error);
    alert('Failed to check for updates');
  }
}

async function openDashboard(): Promise<void> {
  try {
    const config = await api.app.getConfig();
    await api.app.openExternal(config.cloudApiUrl);
  } catch (error) {
    console.error('Failed to open dashboard:', error);
  }
}

async function downloadUpdate(): Promise<void> {
  try {
    await api.update.download();
    alert('Update downloaded. Click Install to apply.');
  } catch (error) {
    console.error('Failed to download update:', error);
    alert('Failed to download update');
  }
}

async function installUpdate(): Promise<void> {
  try {
    await api.update.install();
  } catch (error) {
    console.error('Failed to install update:', error);
    alert('Failed to install update');
  }
}

async function loadLogs(): Promise<void> {
  try {
    const logs = await api.logs.get({ limit: 100 });

    if (elements.logsContent) {
      elements.logsContent.textContent = logs
        .map((log: any) => {
          return `${log.timestamp} [${log.level.toUpperCase()}] [${log.module}] ${log.message}`;
        })
        .join('\n');
    }
  } catch (error) {
    console.error('Failed to load logs:', error);
  }
}

async function clearLogs(): Promise<void> {
  try {
    await api.logs.clear();
    if (elements.logsContent) {
      elements.logsContent.textContent = 'Logs cleared';
    }
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}

// Utility functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
